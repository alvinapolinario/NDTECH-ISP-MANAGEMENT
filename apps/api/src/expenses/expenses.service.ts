import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExpenseStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { resolveStaffAssignment, STAFF_ROLES } from '../common/staff-role';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseDto) {
    await this.ensureCategoryExists(dto.expenseCategoryId);
    if (dto.supplierId) {
      await this.ensureSupplierExists(dto.supplierId);
    }

    const financeAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedFinanceUserId,
      STAFF_ROLES.FINANCE,
    );
    const recordedByUserId = await this.resolveRecordedByUser(dto.recordedByUserId);

    return this.prisma.expense.create({
      data: {
        expenseNumber: await this.nextExpenseNumber(),
        expenseCategoryId: dto.expenseCategoryId,
        supplierId: dto.supplierId ?? null,
        expenseDate: new Date(dto.expenseDate),
        amount: dto.amount,
        payee: dto.payee,
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber,
        description: dto.description,
        notes: dto.notes,
        recordedByUserId,
        assignedFinanceUserId:
          financeAssignment === undefined ? undefined : financeAssignment.userId,
      },
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListExpensesQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as ExpenseStatus | undefined);
    const search = query.search?.trim();

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.expenseCategoryId
        ? { expenseCategoryId: query.expenseCategoryId }
        : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.expenseDateFrom || query.expenseDateTo
        ? {
            expenseDate: {
              ...(query.expenseDateFrom
                ? { gte: new Date(query.expenseDateFrom) }
                : {}),
              ...(query.expenseDateTo
                ? { lte: new Date(query.expenseDateTo) }
                : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { expenseNumber: { contains: search } },
              { payee: { contains: search } },
              { description: { contains: search } },
              { referenceNumber: { contains: search } },
              { notes: { contains: search } },
              { category: { name: { contains: search } } },
              { supplier: { name: { contains: search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(id: number, dto: UpdateExpenseDto) {
    const current = await this.findOne(id);

    if (current.status === ExpenseStatus.voided && dto.status !== ExpenseStatus.recorded) {
      throw new BadRequestException('Voided expenses cannot be edited');
    }

    if (dto.expenseCategoryId) {
      await this.ensureCategoryExists(dto.expenseCategoryId);
    }

    if (dto.supplierId) {
      await this.ensureSupplierExists(dto.supplierId);
    }

    const financeAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedFinanceUserId,
      STAFF_ROLES.FINANCE,
    );
    const recordedByUserId =
      dto.recordedByUserId === undefined
        ? undefined
        : await this.resolveRecordedByUser(dto.recordedByUserId);

    return this.prisma.expense.update({
      where: { id },
      data: {
        expenseCategoryId: dto.expenseCategoryId,
        supplierId: dto.supplierId,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        amount: dto.amount,
        payee: dto.payee,
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber,
        description: dto.description,
        notes: dto.notes,
        status: dto.status,
        ...(recordedByUserId !== undefined
          ? { recordedByUserId }
          : {}),
        ...(financeAssignment !== undefined
          ? { assignedFinanceUserId: financeAssignment.userId }
          : {}),
      },
      include: this.includeRelations(),
    });
  }

  async void(id: number) {
    await this.findOne(id);
    return this.update(id, { status: ExpenseStatus.voided });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.voided,
        deletedAt: new Date(),
      },
      include: this.includeRelations(),
    });
  }

  private async ensureCategoryExists(id: number) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, deletedAt: null, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }
  }

  private async ensureSupplierExists(id: number) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, deletedAt: null, isActive: true },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
  }

  private async resolveRecordedByUser(userId?: number | null) {
    if (userId === undefined) {
      return undefined;
    }

    if (userId === null) {
      return null;
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, status: 'active' },
    });

    if (!user) {
      throw new NotFoundException('Recorded-by user not found');
    }

    return user.id;
  }

  private async nextExpenseNumber() {
    const now = new Date();
    const prefix = `EXP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.expense.count({
      where: { expenseNumber: { startsWith: prefix } },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private includeRelations() {
    return {
      category: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      supplier: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      recordedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedFinanceUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };
  }
}
