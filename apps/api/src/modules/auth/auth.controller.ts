import { Controller, Post, Body, Get, UseGuards, Request, Res, Redirect, Inject } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService
  ) {}

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

  @Get('saml/login')
  @UseGuards(AuthGuard('saml'))
  async samlLogin() {
    // This route initiates SAML authentication
    // Passport will redirect to Microsoft login
  }

  @Post('saml/callback')
  @UseGuards(AuthGuard('saml'))
  async samlCallback(@Request() req, @Res() res: Response) {
    try {
      // Handle SAML callback from Microsoft
      const result = await this.authService.handleSamlLogin(req.user);
      
      if (result.success && result.token) {
        // Redirect to frontend with token
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        res.redirect(`${frontendUrl}/auth/callback?token=${result.token}&success=true`);
      } else {
        // Handle login failure
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
        const error = encodeURIComponent('SAML login failed');
        res.redirect(`${frontendUrl}/auth/callback?success=false&error=${error}`);
      }
    } catch (error) {
      // Handle unexpected errors
      console.error('SAML callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
      const errorMsg = encodeURIComponent('Authentication failed. Please try again.');
      res.redirect(`${frontendUrl}/auth/callback?success=false&error=${errorMsg}`);
    }
  }

  @Get('saml/metadata')
  async getMetadata() {
    // Return service provider metadata for SAML configuration
    return {
      entityID: process.env.SAML_ISSUER || 'http://localhost:3001',
      assertionConsumerService: {
        url: process.env.SAML_CALLBACK_URL || 'http://localhost:3001/api/auth/saml/callback',
        binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'
      }
    };
  }
}