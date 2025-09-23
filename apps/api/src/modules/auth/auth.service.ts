import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);

    console.log('user', user)

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has a password (local auth) or is SSO-only
    if (!user.password) {
      throw new UnauthorizedException('Please use SSO login for this account');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    };

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Get projects if user has organization
    let projects = [];
    if (user.organizationId) {
      projects = await this.usersService.getOrganizationProjects(user.organizationId);
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: user.organizationId,
        organizationName: user.organization?.name || null,
        role: user.role,
      },
      token: this.jwtService.sign(payload),
      projects,
    };
  }

  async verify(token: string) {
    try {
      console.log('Verifying token:', token?.substring(0, 20) + '...');
      
      const payload = this.jwtService.verify(token);
      console.log('Token payload:', payload);
      
      const user = await this.usersService.findById(payload.sub);
      console.log('Found user:', user?.email);
      
      if (!user || !user.isActive) {
        console.error('User not found or inactive');
        return { valid: false };
      }

      return {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId,
          organizationName: user.organization?.name || null,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('Token verification error:', error.message);
      return { valid: false };
    }
  }

  async handleSamlLogin(samlProfile: any) {
    const { email, name, microsoftId } = samlProfile;
    
    console.log('SAML Login - Profile:', { email, name, microsoftId });
    
    // Check if user exists
    let user = await this.usersService.findByEmail(email);
    console.log('SAML Login - Existing user:', user?.id, user?.email);
    
    if (!user) {
      // Create new user from Microsoft SSO
      console.log('Creating new SSO user...');
      user = await this.usersService.createSSOUser({
        email,
        name,
        microsoftId,
        authProvider: 'microsoft',
        role: 'developer', // Default role for new SSO users
      });
      console.log('Created new user:', user.id, user.email);
    } else if (user.authProvider === 'local') {
      // Update existing local user to link with Microsoft account
      console.log('Linking Microsoft account to existing user');
      await this.usersService.linkMicrosoftAccount(user.id, microsoftId);
    }
    
    // Fetch the user again with relations to ensure we have complete data
    user = await this.usersService.findByEmail(email);
    console.log('Final user for login:', user.id, user.email, user.isActive);
    
    // Generate JWT and return login response
    return this.login(user);
  }
}