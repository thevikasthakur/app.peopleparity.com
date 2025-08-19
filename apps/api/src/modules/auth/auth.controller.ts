import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      return {
        success: false,
        message: 'Invalid credentials',
      };
    }
    console.log('this.authService.login(user);', await this.authService.login(user));
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {
    // Just return success - token invalidation handled client-side
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify')
  async verify(@Request() req) {
    return this.authService.verify(req.headers.authorization?.replace('Bearer ', ''));
  }
}