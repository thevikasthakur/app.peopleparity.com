"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
let AuthService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AuthService = _classThis = class {
        constructor(usersService, jwtService) {
            this.usersService = usersService;
            this.jwtService = jwtService;
        }
        async validateUser(email, password) {
            const user = await this.usersService.findByEmail(email);
            console.log('user', user);
            if (!user || !user.isActive) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            const { password: _, ...result } = user;
            return result;
        }
        async login(user) {
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
                    timezone: user.timezone,
                },
                token: this.jwtService.sign(payload),
                projects,
            };
        }
        async verify(token) {
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
                        timezone: user.timezone,
                    },
                };
            }
            catch (error) {
                console.error('Token verification error:', error.message);
                return { valid: false };
            }
        }
        async handleSamlLogin(samlProfile) {
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
            }
            else if (user.authProvider === 'local') {
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
    };
    __setFunctionName(_classThis, "AuthService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthService = _classThis;
})();
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map