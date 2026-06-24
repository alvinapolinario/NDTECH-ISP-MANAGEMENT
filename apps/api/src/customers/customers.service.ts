import { Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const accountNumber =
      dto.accountNumber ?? `CUST-${Date.now().toString().slice(-8)}`;

    return this.prisma.customer.create({
      data: {
        accountNumber,
        customerType: dto.customerType,
        firstName: dto.firstName,
        lastName: dto.lastName,
        businessName: dto.businessName,
        email: dto.email,
        mobileNumber: dto.mobileNumber,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        status: dto.status,
        referredByCustomerId: dto.referredByCustomerId,
        createdByUserId: dto.createdByUserId ?? 1,
      },
      include: this.includeRelations(),
    });
  }

  async findAll(query: ListQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { accountNumber: { contains: query.search } },
              { firstName: { contains: query.search } },
              { lastName: { contains: query.search } },
              { businessName: { contains: query.search } },
              { mobileNumber: { contains: query.search } },
              { email: { contains: query.search } },
            ],
          }
        : {}),
      ...(query.filter ? { status: query.filter as any } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);
    const { birthDate, ...rest } = dto;

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...rest,
        ...(birthDate !== undefined
          ? { birthDate: birthDate ? new Date(birthDate) : null }
          : {}),
      },
      include: this.includeRelations(),
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  private includeRelations() {
    return {
      addresses: true,
      documents: true,
      createdBy: { select: { id: true, name: true, email: true } },
      referredByCustomer: {
        select: {
          id: true,
          accountNumber: true,
          firstName: true,
          lastName: true,
          businessName: true,
          mobileNumber: true,
        },
      },
    };
  }
}
