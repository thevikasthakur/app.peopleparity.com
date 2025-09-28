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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const passport_1 = require("@nestjs/passport");
let AuthController = (() => {
    let _classDecorators = [(0, common_1.Controller)('auth')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _login_decorators;
    let _logout_decorators;
    let _verify_decorators;
    let _samlLogin_decorators;
    let _samlCallback_decorators;
    let _getMetadata_decorators;
    var AuthController = _classThis = class {
        constructor(authService) {
            this.authService = (__runInitializers(this, _instanceExtraInitializers), authService);
        }
        async login(loginDto) {
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
        async logout() {
            // Just return success - token invalidation handled client-side
            return { success: true };
        }
        async verify(req) {
            return this.authService.verify(req.headers.authorization?.replace('Bearer ', ''));
        }
        async samlLogin(res) {
            // This route initiates SAML authentication
            // Passport will redirect to Microsoft login
            // The guard handles the redirect automatically
        }
        async samlCallback(req, res) {
            try {
                // Handle SAML callback from Microsoft
                const result = await this.authService.handleSamlLogin(req.user);
                if (result.success && result.token) {
                    // Redirect to frontend with token (using hash routing)
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
                    res.redirect(`${frontendUrl}/#/auth/callback?token=${result.token}&success=true`);
                }
                else {
                    // Handle login failure (using hash routing)
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
                    const error = encodeURIComponent('SAML login failed');
                    res.redirect(`${frontendUrl}/#/auth/callback?success=false&error=${error}`);
                }
            }
            catch (error) {
                // Handle unexpected errors
                console.error('SAML callback error:', error);
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
                const errorMsg = encodeURIComponent('Authentication failed. Please try again.');
                res.redirect(`${frontendUrl}/#/auth/callback?success=false&error=${errorMsg}`);
            }
        }
        async getMetadata() {
            // Check if SAML is configured
            if (!process.env.SAML_CERT || process.env.SAML_CERT.trim() === '') {
                return {
                    success: false,
                    message: 'SAML authentication is not configured',
                    configured: false
                };
            }
            // Return service provider metadata for SAML configuration
            return {
                configured: true,
                entityID: process.env.SAML_ISSUER || 'http://localhost:3001',
                assertionConsumerService: {
                    url: process.env.SAML_CALLBACK_URL || 'http://localhost:3001/api/auth/saml/callback',
                    binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST'
                }
            };
        }
    };
    __setFunctionName(_classThis, "AuthController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _login_decorators = [(0, common_1.Post)('login')];
        _logout_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)('logout')];
        _verify_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('verify')];
        _samlLogin_decorators = [(0, common_1.Get)('saml/login'), (0, common_1.UseGuards)((0, passport_1.AuthGuard)('saml'))];
        _samlCallback_decorators = [(0, common_1.Post)('saml/callback'), (0, common_1.UseGuards)((0, passport_1.AuthGuard)('saml'))];
        _getMetadata_decorators = [(0, common_1.Get)('saml/metadata')];
        __esDecorate(_classThis, null, _login_decorators, { kind: "method", name: "login", static: false, private: false, access: { has: obj => "login" in obj, get: obj => obj.login }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _logout_decorators, { kind: "method", name: "logout", static: false, private: false, access: { has: obj => "logout" in obj, get: obj => obj.logout }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _verify_decorators, { kind: "method", name: "verify", static: false, private: false, access: { has: obj => "verify" in obj, get: obj => obj.verify }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _samlLogin_decorators, { kind: "method", name: "samlLogin", static: false, private: false, access: { has: obj => "samlLogin" in obj, get: obj => obj.samlLogin }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _samlCallback_decorators, { kind: "method", name: "samlCallback", static: false, private: false, access: { has: obj => "samlCallback" in obj, get: obj => obj.samlCallback }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMetadata_decorators, { kind: "method", name: "getMetadata", static: false, private: false, access: { has: obj => "getMetadata" in obj, get: obj => obj.getMetadata }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthController = _classThis;
})();
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map