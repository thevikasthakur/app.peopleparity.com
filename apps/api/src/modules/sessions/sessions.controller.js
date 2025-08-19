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
exports.SessionsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let SessionsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('sessions')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getActiveSession_decorators;
    let _getSession_decorators;
    let _createSession_decorators;
    let _updateSession_decorators;
    var SessionsController = _classThis = class {
        constructor(sessionsService) {
            this.sessionsService = (__runInitializers(this, _instanceExtraInitializers), sessionsService);
        }
        async getActiveSession(req) {
            return this.sessionsService.findActiveSession(req.user.userId);
        }
        async getSession(id) {
            const session = await this.sessionsService.findById(id);
            if (!session) {
                return { success: false, message: 'Session not found' };
            }
            return { success: true, session };
        }
        async createSession(createSessionDto, req) {
            try {
                // Remove auto-generated fields but keep ID for sync consistency
                const { createdAt, updatedAt, ...cleanDto } = createSessionDto;
                console.log('Creating session with ID:', cleanDto.id);
                const session = await this.sessionsService.create({
                    ...cleanDto,
                    startTime: new Date(cleanDto.startTime),
                    userId: req.user.userId,
                });
                console.log('Session created successfully:', session.id);
                return { success: true, session };
            }
            catch (error) {
                console.error('Error creating session:', error);
                throw error;
            }
        }
        async updateSession(id, updateData) {
            // Convert date strings to Date objects if present
            if (updateData.endTime) {
                updateData.endTime = new Date(updateData.endTime);
            }
            if (updateData.startTime) {
                updateData.startTime = new Date(updateData.startTime);
            }
            const session = await this.sessionsService.update(id, updateData);
            return { success: true, session };
        }
    };
    __setFunctionName(_classThis, "SessionsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getActiveSession_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)('active')];
        _getSession_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)(':id')];
        _createSession_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)()];
        _updateSession_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Patch)(':id')];
        __esDecorate(_classThis, null, _getActiveSession_decorators, { kind: "method", name: "getActiveSession", static: false, private: false, access: { has: obj => "getActiveSession" in obj, get: obj => obj.getActiveSession }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSession_decorators, { kind: "method", name: "getSession", static: false, private: false, access: { has: obj => "getSession" in obj, get: obj => obj.getSession }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createSession_decorators, { kind: "method", name: "createSession", static: false, private: false, access: { has: obj => "createSession" in obj, get: obj => obj.createSession }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateSession_decorators, { kind: "method", name: "updateSession", static: false, private: false, access: { has: obj => "updateSession" in obj, get: obj => obj.updateSession }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SessionsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SessionsController = _classThis;
})();
exports.SessionsController = SessionsController;
//# sourceMappingURL=sessions.controller.js.map