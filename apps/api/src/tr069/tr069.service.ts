import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnuDevicesService } from '../onu-devices/onu-devices.service';

type GenieAcsDeviceSummary = {
  deviceId: string;
  serialNumber: string | null;
  manufacturer: string | null;
  productClass: string | null;
  lastInform: string | null;
  tags: string[];
  parameters: Record<string, string | number | boolean | null>;
};

@Injectable()
export class Tr069Service {
  private readonly logger = new Logger(Tr069Service.name);

  constructor(
    private readonly config: ConfigService,
    private readonly onuDevices: OnuDevicesService,
  ) {}

  isEnabled() {
    return this.config.get<string>('GENIEACS_ENABLED') === 'true';
  }

  getConfig() {
    return {
      enabled: this.isEnabled(),
      nbiUrl: this.config.get<string>('GENIEACS_NBI_URL') ?? null,
      cwmpUrl: this.config.get<string>('GENIEACS_CWMP_URL') ?? null,
    };
  }

  async getOnuTr069Status(onuDeviceId: number) {
    this.assertEnabled();
    const onu = await this.onuDevices.findOne(onuDeviceId);
    const serial = onu.serialNumber?.trim();

    if (!serial) {
      throw new NotFoundException('ONU serial number is required for TR-069 lookup');
    }

    return {
      onuDeviceId: onu.id,
      ...(await this.buildSerialStatus(serial)),
    };
  }

  async lookupBySerial(serialNumber: string) {
    this.assertEnabled();
    const serial = serialNumber.trim();

    if (!serial) {
      throw new NotFoundException('Serial number is required for TR-069 lookup');
    }

    return this.buildSerialStatus(serial);
  }

  private async buildSerialStatus(serial: string) {
    const device = await this.findDeviceBySerial(serial);

    return {
      serialNumber: serial,
      configured: this.getConfig(),
      linked: Boolean(device),
      device,
    };
  }

  async setWifiSsid(onuDeviceId: number, ssid: string, ssid5g?: string) {
    this.assertEnabled();
    const deviceId = await this.resolveGenieAcsDeviceId(onuDeviceId);

    return this.queueProvision(deviceId, 'huawei-wifi-ssid', [
      ssid.trim(),
      (ssid5g ?? `${ssid.trim()}-5G`).trim(),
    ]);
  }

  async setWifiPassword(onuDeviceId: number, password: string) {
    this.assertEnabled();
    const deviceId = await this.resolveGenieAcsDeviceId(onuDeviceId);

    return this.queueProvision(deviceId, 'huawei-wifi-password', [password]);
  }

  async setPppoeCredentials(onuDeviceId: number, username: string, password: string) {
    this.assertEnabled();
    const deviceId = await this.resolveGenieAcsDeviceId(onuDeviceId);

    return this.queueProvision(deviceId, 'huawei-pppoe-wan', [username.trim(), password]);
  }

  async rebootOnu(onuDeviceId: number, connectionRequest = true) {
    this.assertEnabled();
    const deviceId = await this.resolveGenieAcsDeviceId(onuDeviceId);

    return this.queueTask(deviceId, { name: 'reboot' }, connectionRequest);
  }

  async refreshOnu(onuDeviceId: number, connectionRequest = true) {
    this.assertEnabled();
    const deviceId = await this.resolveGenieAcsDeviceId(onuDeviceId);

    return this.queueTask(
      deviceId,
      {
        name: 'refreshObject',
        objectName: 'InternetGatewayDevice.',
      },
      connectionRequest,
    );
  }

  private assertEnabled() {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'TR-069 (GenieACS) is not enabled. Set GENIEACS_ENABLED=true and deploy the GenieACS stack.',
      );
    }
  }

  private nbiBaseUrl() {
    const url = this.config.get<string>('GENIEACS_NBI_URL')?.trim();
    if (!url) {
      throw new ServiceUnavailableException('GENIEACS_NBI_URL is not configured');
    }
    return url.replace(/\/$/, '');
  }

  private async resolveGenieAcsDeviceId(onuDeviceId: number) {
    const status = await this.getOnuTr069Status(onuDeviceId);
    if (!status.device?.deviceId) {
      throw new NotFoundException(
        'ONU is not registered in GenieACS yet. Verify ACS URL on the ONU and wait for Inform.',
      );
    }

    return status.device.deviceId;
  }

  private async findDeviceBySerial(serialNumber: string) {
    const query = encodeURIComponent(
      JSON.stringify({ '_deviceId._SerialNumber': serialNumber }),
    );
    const response = await this.nbiRequest(`/devices/?query=${query}`);

    if (!Array.isArray(response) || response.length === 0) {
      return null;
    }

    return this.mapDevice(response[0] as Record<string, unknown>);
  }

  private mapDevice(raw: Record<string, unknown>): GenieAcsDeviceSummary {
    const deviceId = String(raw._id ?? '');
    const deviceIdMeta = (raw._deviceId ?? {}) as Record<string, unknown>;

    const readParam = (path: string) => {
      const entry = raw[path] as { _value?: unknown } | undefined;
      const value = entry?._value;
      if (value === undefined || value === null) return null;
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
      }
      return String(value);
    };

    return {
      deviceId,
      serialNumber: (deviceIdMeta._SerialNumber as string | undefined) ?? null,
      manufacturer: (deviceIdMeta._Manufacturer as string | undefined) ?? null,
      productClass: (deviceIdMeta._ProductClass as string | undefined) ?? null,
      lastInform: (raw._lastInform as string | undefined) ?? null,
      tags: Array.isArray(raw._tags) ? (raw._tags as string[]) : [],
      parameters: {
        ssid24: readParam('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID'),
        ssid5: readParam('InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID'),
        pppoeUsername: readParam(
          'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
        ),
        externalIp: readParam(
          'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
        ),
      },
    };
  }

  private async queueProvision(
    deviceId: string,
    provisionName: string,
    args: string[],
  ) {
    return this.queueTask(
      deviceId,
      {
        name: 'provision',
        provision: provisionName,
        args,
      },
      true,
    );
  }

  private async queueTask(
    deviceId: string,
    task: Record<string, unknown>,
    connectionRequest: boolean,
  ) {
    const encodedId = encodeURIComponent(deviceId);
    const suffix = connectionRequest ? '?connection_request' : '';
    const response = await this.nbiRequest(`/devices/${encodedId}/tasks${suffix}`, {
      method: 'POST',
      body: JSON.stringify(task),
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      deviceId,
      task,
      connectionRequest,
      result: response,
    };
  }

  private async nbiRequest(path: string, init: RequestInit = {}) {
    const url = `${this.nbiBaseUrl()}${path}`;

    try {
      const response = await fetch(url, init);
      const text = await response.text();

      if (!response.ok) {
        this.logger.warn(`GenieACS NBI ${init.method ?? 'GET'} ${path} failed: ${response.status} ${text}`);
        throw new ServiceUnavailableException(
          `GenieACS request failed (${response.status}). Is the GenieACS stack running?`,
        );
      }

      if (!text) return null;

      try {
        return JSON.parse(text) as unknown;
      } catch {
        return text;
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.error(`GenieACS NBI unreachable: ${String(error)}`);
      throw new ServiceUnavailableException(
        'Cannot reach GenieACS NBI. Verify GENIEACS_NBI_URL and docker compose up in /root/GenieACS.',
      );
    }
  }
}
