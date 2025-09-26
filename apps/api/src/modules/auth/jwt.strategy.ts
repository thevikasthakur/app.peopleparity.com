import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: any) {
    console.log('🔑 JWT Strategy - Raw payload:', JSON.stringify(payload, null, 2));
    const user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId
    };
    console.log('🔑 JWT Strategy - Returning user:', JSON.stringify(user, null, 2));
    return user;
  }
}