import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { CreateBarangayDto } from './dto/create-barangay.dto';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';
import { CreateProvinceDto } from './dto/create-province.dto';
import { UpdateBarangayDto } from './dto/update-barangay.dto';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('provinces')
  findProvinces(@Query() query: ListQueryDto) {
    return this.locationsService.findProvinces(query);
  }

  @Post('provinces')
  createProvince(@Body() dto: CreateProvinceDto) {
    return this.locationsService.createProvince(dto);
  }

  @Get('provinces/:id')
  findProvince(@Param('id') id: string) {
    return this.locationsService.findProvince(Number(id));
  }

  @Patch('provinces/:id')
  updateProvince(@Param('id') id: string, @Body() dto: UpdateProvinceDto) {
    return this.locationsService.updateProvince(Number(id), dto);
  }

  @Delete('provinces/:id')
  removeProvince(@Param('id') id: string) {
    return this.locationsService.removeProvince(Number(id));
  }

  @Get('municipalities')
  findMunicipalities(
    @Query() query: ListQueryDto,
    @Query('provinceId') provinceId?: string,
  ) {
    return this.locationsService.findMunicipalities(
      query,
      provinceId ? Number(provinceId) : undefined,
    );
  }

  @Post('municipalities')
  createMunicipality(@Body() dto: CreateMunicipalityDto) {
    return this.locationsService.createMunicipality(dto);
  }

  @Get('municipalities/:id')
  findMunicipality(@Param('id') id: string) {
    return this.locationsService.findMunicipality(Number(id));
  }

  @Patch('municipalities/:id')
  updateMunicipality(
    @Param('id') id: string,
    @Body() dto: UpdateMunicipalityDto,
  ) {
    return this.locationsService.updateMunicipality(Number(id), dto);
  }

  @Delete('municipalities/:id')
  removeMunicipality(@Param('id') id: string) {
    return this.locationsService.removeMunicipality(Number(id));
  }

  @Get('barangays')
  findBarangays(
    @Query() query: ListQueryDto,
    @Query('municipalityId') municipalityId?: string,
  ) {
    return this.locationsService.findBarangays(
      query,
      municipalityId ? Number(municipalityId) : undefined,
    );
  }

  @Post('barangays')
  createBarangay(@Body() dto: CreateBarangayDto) {
    return this.locationsService.createBarangay(dto);
  }

  @Get('barangays/:id')
  findBarangay(@Param('id') id: string) {
    return this.locationsService.findBarangay(Number(id));
  }

  @Patch('barangays/:id')
  updateBarangay(@Param('id') id: string, @Body() dto: UpdateBarangayDto) {
    return this.locationsService.updateBarangay(Number(id), dto);
  }

  @Delete('barangays/:id')
  removeBarangay(@Param('id') id: string) {
    return this.locationsService.removeBarangay(Number(id));
  }
}
