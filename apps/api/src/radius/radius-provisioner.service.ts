import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RadiusCoaService } from './radius-coa.service';
import { RadiusDbService } from './radius-db.service';
import {
  getRadiusSuspendedGroupName,
  isRadiusProvisionEnabled,
} from './radius-provision.config';

export type RadiusProvisionRecord = {
  commandType: string;
  message: string;
  payload?: Record<string, unknown>;
};

@Injectable()
export class RadiusProvisionerService {
  private readonly logger = new Logger(RadiusProvisionerService.name);

  constructor(
    private readonly radiusDb: RadiusDbService,
    private readonly radiusCoa: RadiusCoaService,
  ) {}

  isEnabled() {
    return isRadiusProvisionEnabled() && this.radiusDb.isConfigured();
  }

  async getUserGroup(username: string): Promise<string | null> {
    if (!this.radiusDb.isConfigured()) return null;

    const rows = await this.radiusDb.query<{ groupname: string }>(
      `
        SELECT groupname
        FROM radusergroup
        WHERE username = :username
        ORDER BY priority ASC
        LIMIT 1
      `,
      { username },
    );

    return rows[0]?.groupname ?? null;
  }

  async assignUserGroup(
    username: string,
    groupname: string,
    priority = 1,
  ): Promise<RadiusProvisionRecord> {
    this.assertEnabled();
    await this.ensureSubscriberExists(username);

    const trimmedGroup = groupname.trim();
    if (!trimmedGroup) {
      throw new BadRequestException('RADIUS group name is required');
    }

    const previousGroupname = await this.getUserGroup(username);
    await this.assignUserGroupInternal(username, trimmedGroup, priority);

    this.logger.log(
      `RADIUS group for ${username}: ${previousGroupname ?? '(none)'} -> ${trimmedGroup}`,
    );

    const coa =
      previousGroupname !== trimmedGroup
        ? await this.disconnectActiveSessions(username, {
            reason: 'profile_change',
            previousGroupname,
            groupname: trimmedGroup,
          })
        : {
            username,
            sessionCount: 0,
            disconnectedCount: 0,
            attempts: [],
            summary: 'No active RADIUS sessions',
          };

    return {
      commandType: 'radius_assign_group',
      message: this.formatProvisionMessage(
        `RADIUS group set to ${trimmedGroup}`,
        coa,
      ),
      payload: {
        username,
        groupname: trimmedGroup,
        previousGroupname,
        coa,
      },
    };
  }

  async suspendUser(username: string): Promise<RadiusProvisionRecord> {
    this.assertEnabled();
    await this.ensureSubscriberExists(username);

    const suspendedGroup = getRadiusSuspendedGroupName();
    const previousGroupname = await this.getUserGroup(username);
    await this.assignUserGroupInternal(username, suspendedGroup);

    const coa = await this.disconnectActiveSessions(username, {
      reason: 'suspend',
      previousGroupname,
      groupname: suspendedGroup,
    });

    return {
      commandType: 'radius_suspend',
      message: this.formatProvisionMessage(
        `RADIUS user suspended via group ${suspendedGroup}`,
        coa,
      ),
      payload: {
        username,
        groupname: suspendedGroup,
        previousGroupname,
        coa,
      },
    };
  }

  async disableUser(username: string): Promise<RadiusProvisionRecord> {
    this.assertEnabled();
    await this.ensureSubscriberExists(username);

    const previousGroupname = await this.getUserGroup(username);
    await this.radiusDb.execute(
      `DELETE FROM radusergroup WHERE username = :username`,
      { username },
    );

    this.logger.log(
      `RADIUS groups removed for ${username} (was ${previousGroupname ?? '(none)'})`,
    );

    const coa = await this.disconnectActiveSessions(username, {
      reason: 'disable',
      previousGroupname,
    });

    return {
      commandType: 'radius_disable',
      message: this.formatProvisionMessage(
        'RADIUS group membership removed',
        coa,
      ),
      payload: {
        username,
        previousGroupname,
        coa,
      },
    };
  }

  async disconnectSessions(username: string): Promise<RadiusProvisionRecord> {
    this.assertEnabled();
    await this.ensureSubscriberExists(username);

    const coa = await this.disconnectActiveSessions(username, {
      reason: 'manual_disconnect',
    });

    return {
      commandType: 'radius_disconnect',
      message: coa.summary,
      payload: {
        username,
        coa,
      },
    };
  }

  async updatePassword(
    username: string,
    password: string,
  ): Promise<RadiusProvisionRecord> {
    this.assertEnabled();
    await this.ensureSubscriberExists(username);

    await this.radiusDb.execute(
      `
        DELETE FROM radcheck
        WHERE username = :username
          AND attribute = 'Cleartext-Password'
      `,
      { username },
    );

    await this.radiusDb.execute(
      `
        INSERT INTO radcheck (username, attribute, op, value)
        VALUES (:username, 'Cleartext-Password', ':=', :password)
      `,
      { username, password },
    );

    const coa = await this.disconnectActiveSessions(username, {
      reason: 'password_change',
    });

    return {
      commandType: 'radius_update_password',
      message: this.formatProvisionMessage('RADIUS password updated', coa),
      payload: { username, coa },
    };
  }

  private async assignUserGroupInternal(
    username: string,
    groupname: string,
    priority = 1,
  ) {
    const updated = await this.radiusDb.execute(
      `
        UPDATE radusergroup
        SET groupname = :groupname, priority = :priority
        WHERE username = :username
      `,
      { username, groupname, priority },
    );

    if (updated === 0) {
      await this.radiusDb.execute(
        `
          INSERT INTO radusergroup (username, groupname, priority)
          VALUES (:username, :groupname, :priority)
        `,
        { username, groupname, priority },
      );
    }
  }

  private async disconnectActiveSessions(
    username: string,
    context: Record<string, unknown>,
  ) {
    const coa = await this.radiusCoa.disconnectUser(username);

    if (coa.sessionCount > 0) {
      this.logger.log(
        `RADIUS CoA for ${username}: ${coa.summary} (${JSON.stringify(context)})`,
      );
    }

    return coa;
  }

  private formatProvisionMessage(
    baseMessage: string,
    coa: { summary: string; sessionCount: number },
  ) {
    if (coa.sessionCount === 0) {
      return baseMessage;
    }

    return `${baseMessage}; ${coa.summary}`;
  }

  private async ensureSubscriberExists(username: string) {
    const rows = await this.radiusDb.query<{ username: string }>(
      `
        SELECT username
        FROM radcheck
        WHERE username = :username
          AND attribute = 'Cleartext-Password'
        LIMIT 1
      `,
      { username },
    );

    if (!rows.length) {
      throw new NotFoundException(`RADIUS subscriber ${username} not found`);
    }
  }

  private assertEnabled() {
    if (!this.isEnabled()) {
      throw new BadRequestException('RADIUS provisioning is not enabled');
    }
  }
}
