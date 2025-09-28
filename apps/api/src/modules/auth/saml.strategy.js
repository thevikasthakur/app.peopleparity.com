"use strict";
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicrosoftSamlStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_saml_1 = require("passport-saml");
let MicrosoftSamlStrategy = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = (0, passport_1.PassportStrategy)(passport_saml_1.Strategy, 'saml');
    var MicrosoftSamlStrategy = _classThis = class extends _classSuper {
        constructor(configService) {
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
            this.configService = configService;
        }
        async validate(profile) {
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
    };
    __setFunctionName(_classThis, "MicrosoftSamlStrategy");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MicrosoftSamlStrategy = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MicrosoftSamlStrategy = _classThis;
})();
exports.MicrosoftSamlStrategy = MicrosoftSamlStrategy;
//# sourceMappingURL=saml.strategy.js.map