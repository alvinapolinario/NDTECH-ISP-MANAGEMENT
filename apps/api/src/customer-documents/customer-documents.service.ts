import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDocumentDto } from './dto/create-customer-document.dto';

@Injectable()
export class CustomerDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const search = query.search?.trim();
    const where: Prisma.CustomerDocumentWhereInput = {
      ...(search
        ? {
            OR: [
              { documentType: { contains: search } },
              { filePath: { contains: search } },
              { customer: { accountNumber: { contains: search } } },
              { customer: { firstName: { contains: search } } },
              { customer: { lastName: { contains: search } } },
              { customer: { businessName: { contains: search } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customerDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.customerDocument.count({ where }),
    ]);
    return { items, meta: { total, page, limit } };
  }

  findByCustomer(customerId: number) {
    return this.prisma.customerDocument.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: this.includeRelations(),
    });
  }

  create(customerId: number, dto: CreateCustomerDocumentDto) {
    return this.prisma.customerDocument.create({
      data: {
        customerId,
        documentType: dto.documentType,
        filePath: dto.filePath,
        uploadedByUserId: dto.uploadedByUserId ?? 1,
      },
      include: this.includeRelations(),
    });
  }

  async remove(id: number) {
    const document = await this.prisma.customerDocument.findUnique({ where: { id } });
    if (!document) {
      throw new NotFoundException('Customer document not found');
    }
    return this.prisma.customerDocument.delete({ where: { id } });
  }

  private includeRelations() {
    return {
      customer: {
        select: {
          id: true,
          accountNumber: true,
          firstName: true,
          lastName: true,
          businessName: true,
          mobileNumber: true,
          email: true,
          status: true,
        },
      },
      uploadedBy: { select: { id: true, name: true } },
    };
  }
}
