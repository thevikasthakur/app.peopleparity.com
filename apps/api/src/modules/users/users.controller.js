"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let UsersController = (() => {
    let _classDecorators = [(0, common_1.Controller)('users')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getTeamMembers_decorators;
    let _getOrganizationUsers_decorators;
    let _getUserSettings_decorators;
    let _updateUserSettings_decorators;
    let _createUser_decorators;
    var UsersController = _classThis = class {
        constructor(usersService) {
            this.usersService = (__runInitializers(this, _instanceExtraInitializers), usersService);
        }
        async getTeamMembers(req) {
            const currentUser = await this.usersService.findById(req.user.userId);
            // Super admin can see all users
            if (currentUser.role === 'super_admin') {
                const allUsers = await this.usersService.getAllUsers();
                return allUsers.map(user => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    organizationId: user.organizationId,
                    organizationName: user.organization?.name,
                    timezone: user.timezone
                }));
            }
            // Org admin can only see users in their organization
            if (currentUser.role === 'org_admin' && currentUser.organizationId) {
                const orgUsers = await this.usersService.getOrganizationUsers(currentUser.organizationId);
                return orgUsers.map(user => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    organizationId: user.organizationId,
                    organizationName: user.organization?.name,
                    timezone: user.timezone
                }));
            }
            // Developers can only see themselves
            return [{
                    id: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                    role: currentUser.role,
                    organizationId: currentUser.organizationId,
                    organizationName: currentUser.organization?.name,
                    timezone: currentUser.timezone
                }];
        }
        async getOrganizationUsers(organizationId) {
            const users = await this.usersService.getOrganizationUsers(organizationId);
            return { users };
        }
        async getUserSettings(req) {
            const user = await this.usersService.findById(req.user.userId);
            return {
                timezone: user.timezone || 'Asia/Kolkata',
                name: user.name,
                email: user.email,
                role: user.role
            };
        }
        async updateUserSettings(req, body) {
            const user = await this.usersService.updateTimezone(req.user.userId, body.timezone);
            return {
                success: true,
                timezone: user.timezone
            };
        }
        async createUser(createUserDto) {
            const user = await this.usersService.create(createUserDto);
            return { success: true, user };
        }
    };
    __setFunctionName(_classThis, "UsersController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getTeamMembers_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('team-members')];
        _getOrganizationUsers_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('organization/:organizationId')];
        _getUserSettings_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('settings')];
        _updateUserSettings_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Patch)('settings')];
        _createUser_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)()];
        __esDecorate(_classThis, null, _getTeamMembers_decorators, { kind: "method", name: "getTeamMembers", static: false, private: false, access: { has: obj => "getTeamMembers" in obj, get: obj => obj.getTeamMembers }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getOrganizationUsers_decorators, { kind: "method", name: "getOrganizationUsers", static: false, private: false, access: { has: obj => "getOrganizationUsers" in obj, get: obj => obj.getOrganizationUsers }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getUserSettings_decorators, { kind: "method", name: "getUserSettings", static: false, private: false, access: { has: obj => "getUserSettings" in obj, get: obj => obj.getUserSettings }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateUserSettings_decorators, { kind: "method", name: "updateUserSettings", static: false, private: false, access: { has: obj => "updateUserSettings" in obj, get: obj => obj.updateUserSettings }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createUser_decorators, { kind: "method", name: "createUser", static: false, private: false, access: { has: obj => "createUser" in obj, get: obj => obj.createUser }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        UsersController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return UsersController = _classThis;
})();
exports.UsersController = UsersController;
//# sourceMappingURL=users.controller.js.map