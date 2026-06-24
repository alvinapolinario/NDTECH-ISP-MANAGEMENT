import { Test, TestingModule } from '@nestjs/testing';
import { MikrotikRoutersController } from './mikrotik-routers.controller';
import { MikrotikRoutersService } from './mikrotik-routers.service';

describe('MikrotikRoutersController', () => {
  let controller: MikrotikRoutersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MikrotikRoutersController],
      providers: [{ provide: MikrotikRoutersService, useValue: {} }],
    }).compile();

    controller = module.get<MikrotikRoutersController>(MikrotikRoutersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
