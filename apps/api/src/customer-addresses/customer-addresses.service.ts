import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';

@Injectable()
export class CustomerAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findByCustomer(customerId: number) {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        barangayRef: {
          include: {
            municipality: {
              include: { province: true },
            },
          },
        },
      },
    });
  }

  create(customerId: number, dto: CreateCustomerAddressDto) {
    return this.prisma.customerAddress.create({
      data: {
        customerId,
        barangayId: dto.barangayId,
        addressType: dto.addressType,
        street: dto.street,
        barangay: dto.barangay,
        municipality: dto.municipality,
        province: dto.province,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async update(id: number, dto: UpdateCustomerAddressDto) {
    await this.findOne(id);
    return this.prisma.customerAddress.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.customerAddress.delete({ where: { id } });
  }

  private async findOne(id: number) {
    const address = await this.prisma.customerAddress.findUnique({ where: { id } });
    if (!address) {
      throw new NotFoundException('Customer address not found');
    }
    return address;
  }
}
