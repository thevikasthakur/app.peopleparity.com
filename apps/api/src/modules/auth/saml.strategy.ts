import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MicrosoftSamlStrategy extends PassportStrategy(SamlStrategy, 'saml') {
  constructor(private configService: ConfigService) {
    super({
      // SAML configuration for Microsoft Azure AD
      entryPoint: process.env.SAML_ENTRY_POINT || 'https://login.microsoftonline.com/{tenant-id}/saml2',
      issuer: process.env.SAML_ISSUER || 'http://localhost:3001',
      callbackUrl: process.env.SAML_CALLBACK_URL || 'http://localhost:3001/api/auth/saml/callback',
      cert: process.env.SAML_CERT || '', // Microsoft's public certificate
      identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      disableRequestedAuthnContext: true,
      signatureAlgorithm: 'sha256',
    });
  }

  async validate(profile: any): Promise<any> {
    // Extract user information from SAML response
    const user = {
      email: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || 
             profile.email || 
             profile.nameID,
      name: profile['http://schemas.microsoft.com/identity/claims/displayname'] || 
            profile.displayName || 
            profile.givenName + ' ' + profile.surname ||
            'User',
      microsoftId: profile.nameID || profile.id,
      firstName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] || profile.givenName,
      lastName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] || profile.surname,
    };
    
    return user;
  }
}