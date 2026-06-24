import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TechnicianAssignmentStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTechnicianAssignmentDto } from './dto/create-technician-assignment.dto';
import { ListTechnicianAssignmentsQueryDto } from './dto/list-technician-assignments-query.dto';
import { UpdateTechnicianAssignmentDto } from './dto/update-technician-assignment.dto';

@Injectable()
export class TechnicianAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTechnicianAssignmentDto) {
    await this.ensureTicketAndTechnician(dto.ticketId, dto.technicianId);
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.technicianAssignment.create({
        data: {
          ticketId: dto.ticketId,
          technicianId: dto.technicianId,
          status: dto.status,
          scheduledAt: this.toDateOrNull(dto.scheduledAt),
          notes: dto.notes,
        },
        include: this.includeRelations(),
      });
      await tx.ticket.update({ where: { id: dto.ticketId }, data: { status: 'assigned' } });
      return assignment;
    });
  }

  async findAll(query: ListTechnicianAssignmentsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as TechnicianAssignmentStatus | undefined);
    const search = query.search?.trim();
    const where: Prisma.TechnicianAssignmentWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { notes: { contains: search } },
              { completionNotes: { contains: search } },
              { ticket: { ticketNumber: { contains: search } } },
              { ticket: { subject: { contains: search } } },
              { technician: { name: { contains: search } } },
              { technician: { email: { contains: search } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.technicianAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.technicianAssignment.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const assignment = await this.prisma.technicianAssignment.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });
    if (!assignment) throw new NotFoundException('Technician assignment not found');
    return assignment;
  }

  async update(id: number, dto: UpdateTechnicianAssignmentDto) {
    await this.findOne(id);
    if (dto.ticketId || dto.technicianId) {
      await this.ensureTicketAndTechnician(dto.ticketId, dto.technicianId);
    }
    return this.prisma.technicianAssignment.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: this.toDateOrNull(dto.scheduledAt),
        startedAt: this.toDateOrNull(dto.startedAt),
        completedAt: this.toDateOrNull(dto.completedAt),
      },
      include: this.includeRelations(),
    });
  }

  async setStatus(id: number, status: TechnicianAssignmentStatus) {
    const assignment = await this.findOne(id);
    const startedAt = status === 'in_progress' ? new Date() : undefined;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.technicianAssignment.update({
        where: { id },
        data: { status, startedAt },
        include: this.includeRelations(),
      });
      if (status === 'in_progress') {
        await tx.ticket.update({ where: { id: assignment.ticketId }, data: { status: 'in_progress' } });
      }
      return updated;
    });
  }

  async complete(id: number, completionNotes?: string) {
    const assignment = await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.technicianAssignment.update({
        where: { id },
        data: { status: 'completed', completedAt: new Date(), completionNotes: completionNotes || null },
        include: this.includeRelations(),
      });
      await tx.ticket.update({
        where: { id: assignment.ticketId },
        data: { status: 'resolved', resolution: completionNotes || null, resolvedAt: new Date() },
      });
      return updated;
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.technicianAssignment.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  private async ensureTicketAndTechnician(ticketId?: number, technicianId?: number) {
    if (ticketId) {
      const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, deletedAt: null } });
      if (!ticket) throw new NotFoundException('Ticket not found');
    }
    if (technicianId) {
      const technician = await this.prisma.user.findFirst({ where: { id: technicianId, deletedAt: null } });
      if (!technician) throw new NotFoundException('Technician not found');
    }
  }

  private toDateOrNull(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(value);
  }

  private includeRelations() {
    return {
      ticket: {
        select: { id: true, ticketNumber: true, subject: true, status: true, priority: true },
      },
      technician: { select: { id: true, name: true, email: true, mobileNumber: true } },
    };
  }
}
