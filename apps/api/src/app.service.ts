import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot() {
    return {
      service: 'NDTECH ISP Billing API',
      status: 'ok',
      version: '1.0.0',
      docs: {
        auth: '/auth/login',
        collectorSync: {
          download: '/collector-sync/download',
          upload: '/collector-sync/upload',
        },
        webApp: 'http://localhost:3001',
      },
    };
  }
}
