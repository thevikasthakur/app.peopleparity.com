import { Module, Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { MicrosoftSamlStrategy } from './saml.strategy';
import { UsersModule } from '../users/users.module';

// Only include SAML strategy if SAML_CERT is configured
const providers: Provider[] = [AuthService, LocalStrategy, JwtStrategy];

// Check if SAML is configured before adding the strategy
if (process.env.SAML_CERT && process.env.SAML_CERT.trim() !== '') {
  console.log('✅ SAML certificate found, enabling SAML authentication');
  providers.push(MicrosoftSamlStrategy);
} else {
  console.log('⚠️ SAML certificate not found, SAML authentication disabled');
}

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers,
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}