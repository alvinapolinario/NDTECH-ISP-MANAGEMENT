import { Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { getPagination } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarangayDto } from './dto/create-barangay.dto';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateBarangayDto } from './dto/update-barangay.dto';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  createProvince(dto: CreateProvinceDto) {
    return this.prisma.province.create({ data: dto });
  }

  async findProvinces(query: ListQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { code: { contains: query.search } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.province.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { municipalities: true } } },
      }),
      this.prisma.province.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findProvince(id: number) {
    const province = await this.prisma.province.findUnique({
      where: { id },
      include: { municipalities: true },
    });

    if (!province) {
      throw new NotFoundException('Province not found');
    }

    return province;
  }

  async updateProvince(id: number, dto: UpdateProvinceDto) {
    await this.findProvince(id);
    return this.prisma.province.update({ where: { id }, data: dto });
  }

  async removeProvince(id: number) {
    await this.findProvince(id);
    return this.prisma.province.delete({ where: { id } });
  }

  createMunicipality(dto: CreateMunicipalityDto) {
    return this.prisma.municipality.create({ data: dto, include: { province: true } });
  }

  async findMunicipalities(query: ListQueryDto, provinceId?: number) {
    const { page, limit, skip } = getPagination(query);
    const where = {
      ...(provinceId ? { provinceId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { code: { contains: query.search } },
              { province: { name: { contains: query.search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.municipality.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { province: true, _count: { select: { barangays: true } } },
      }),
      this.prisma.municipality.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findMunicipality(id: number) {
    const municipality = await this.prisma.municipality.findUnique({
      where: { id },
      include: { province: true, barangays: true },
    });

    if (!municipality) {
      throw new NotFoundException('Municipality not found');
    }

    return municipality;
  }

  async updateMunicipality(id: number, dto: UpdateMunicipalityDto) {
    await this.findMunicipality(id);
    return this.prisma.municipality.update({
      where: { id },
      data: dto,
      include: { province: true },
    });
  }

  async removeMunicipality(id: number) {
    await this.findMunicipality(id);
    return this.prisma.municipality.delete({ where: { id } });
  }

  createBarangay(dto: CreateBarangayDto) {
    return this.prisma.barangay.create({
      data: dto,
      include: { municipality: { include: { province: true } } },
    });
  }

  async findBarangays(query: ListQueryDto, municipalityId?: number) {
    const { page, limit, skip } = getPagination(query);
    const where = {
      ...(municipalityId ? { municipalityId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { code: { contains: query.search } },
              { municipality: { name: { contains: query.search } } },
              {
                municipality: {
                  province: { name: { contains: query.search } },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.barangay.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          municipality: {
            include: { province: true },
          },
        },
      }),
      this.prisma.barangay.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findBarangay(id: number) {
    const barangay = await this.prisma.barangay.findUnique({
      where: { id },
      include: { municipality: { include: { province: true } } },
    });

    if (!barangay) {
      throw new NotFoundException('Barangay not found');
    }

    return barangay;
  }

  async updateBarangay(id: number, dto: UpdateBarangayDto) {
    await this.findBarangay(id);
    return this.prisma.barangay.update({
      where: { id },
      data: dto,
      include: { municipality: { include: { province: true } } },
    });
  }

  async removeBarangay(id: number) {
    await this.findBarangay(id);
    return this.prisma.barangay.delete({ where: { id } });
  }
}
