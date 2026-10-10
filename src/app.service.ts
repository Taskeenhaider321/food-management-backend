import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  /** Lightweight check used by uptime / keep-alive pings (e.g. Render free tier). */
  getHealth() {
    return {
      status: 'ok',
      service: 'food-safety-quality-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
