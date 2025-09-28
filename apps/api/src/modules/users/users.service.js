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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var UsersService = _classThis = class {
        constructor(usersRepository, organizationsRepository, projectsRepository) {
            this.usersRepository = usersRepository;
            this.organizationsRepository = organizationsRepository;
            this.projectsRepository = projectsRepository;
        }
        async ensureSuperAdmin(email, password) {
            const existingAdmin = await this.usersRepository.findOne({
                where: { email, role: 'super_admin' },
            });
            if (!existingAdmin) {
                const hashedPassword = await bcrypt.hash(password, 10);
                const superAdmin = this.usersRepository.create({
                    email,
                    name: 'Super Admin',
                    password: hashedPassword,
                    role: 'super_admin',
                    isActive: true,
                });
                await this.usersRepository.save(superAdmin);
                console.log('✅ Super Admin created with email:', email);
            }
            else {
                console.log('✅ Super Admin already exists');
            }
        }
        async findByEmail(email) {
            return this.usersRepository.findOne({
                where: { email },
                relations: ['organization'],
            });
        }
        async findById(id) {
            console.log('Finding user by ID:', id);
            const user = await this.usersRepository.findOne({
                where: { id },
                relations: ['organization'],
            });
            console.log('Found user:', user?.email, 'Active:', user?.isActive);
            return user;
        }
        async create(createUserDto) {
            const existingUser = await this.findByEmail(createUserDto.email);
            if (existingUser) {
                throw new common_1.ConflictException('User with this email already exists');
            }
            const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
            const user = this.usersRepository.create({
                ...createUserDto,
                password: hashedPassword,
            });
            return this.usersRepository.save(user);
        }
        async updateLastLogin(userId) {
            await this.usersRepository.update(userId, {
                lastLogin: new Date(),
            });
        }
        async getOrganizationProjects(organizationId) {
            const projects = await this.projectsRepository.find({
                where: { organizationId, isActive: true },
                order: { name: 'ASC' },
            });
            return projects.map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                organizationId: p.organizationId,
            }));
        }
        async getAllUsers() {
            return this.usersRepository.find({
                relations: ['organization'],
                order: { name: 'ASC' },
            });
        }
        async getOrganizationUsers(organizationId) {
            return this.usersRepository.find({
                where: { organizationId },
                relations: ['organization'],
                order: { name: 'ASC' },
            });
        }
        async updateRole(userId, role) {
            const user = await this.findById(userId);
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            if (user.role === 'super_admin') {
                throw new common_1.ConflictException('Cannot change super admin role');
            }
            user.role = role;
            return this.usersRepository.save(user);
        }
        async deactivate(userId) {
            const user = await this.findById(userId);
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            if (user.role === 'super_admin') {
                throw new common_1.ConflictException('Cannot deactivate super admin');
            }
            user.isActive = false;
            return this.usersRepository.save(user);
        }
        async resetPassword(userId, newPassword) {
            const user = await this.findById(userId);
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;
            return this.usersRepository.save(user);
        }
        async createSSOUser(ssoUserData) {
            const user = this.usersRepository.create({
                email: ssoUserData.email,
                name: ssoUserData.name,
                microsoftId: ssoUserData.microsoftId,
                authProvider: ssoUserData.authProvider,
                role: ssoUserData.role,
                organizationId: ssoUserData.organizationId,
                isActive: true,
                password: null, // No password for SSO users
            });
            return this.usersRepository.save(user);
        }
        async linkMicrosoftAccount(userId, microsoftId) {
            const user = await this.findById(userId);
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            user.microsoftId = microsoftId;
            user.authProvider = 'microsoft';
            return this.usersRepository.save(user);
        }
        async updateTimezone(userId, timezone) {
            const user = await this.findById(userId);
            if (!user) {
                throw new common_1.NotFoundException('User not found');
            }
            user.timezone = timezone;
            return this.usersRepository.save(user);
        }
    };
    __setFunctionName(_classThis, "UsersService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UsersService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UsersService = _classThis;
})();
exports.UsersService = UsersService;
//# sourceMappingURL=users.service.js.map