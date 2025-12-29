import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  private getHealthResponse() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  root() {
    return this.getHealthResponse();
  }

  @Get('health')
  health() {
    return this.getHealthResponse();
  }
}
