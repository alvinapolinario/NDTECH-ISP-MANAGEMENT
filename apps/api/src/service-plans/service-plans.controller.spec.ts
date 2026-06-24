import { Test, TestingModule } from '@nestjs/testing';
import { ServicePlansController } from './service-plans.controller';
import { ServicePlansService } from './service-plans.service';

describe('ServicePlansController', () => {
  let controller: ServicePlansController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicePlansController],
      providers: [{ provide: ServicePlansService, useValue: {} }],
    }).compile();

    controller = module.get<ServicePlansController>(ServicePlansController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
