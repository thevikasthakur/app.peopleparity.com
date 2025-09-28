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
exports.ActivitiesController = exports.ActivityController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let ActivityController = (() => {
    let _classDecorators = [(0, common_1.Controller)('activity-periods')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getActivityPeriod_decorators;
    let _createActivityPeriod_decorators;
    let _createMultipleActivityPeriods_decorators;
    var ActivityController = _classThis = class {
        constructor(activityService) {
            this.activityService = (__runInitializers(this, _instanceExtraInitializers), activityService);
        }
        async getActivityPeriod(id) {
            return this.activityService.findById(id);
        }
        async createActivityPeriod(createActivityDto, req) {
            try {
                // Remove only auto-generated timestamp fields, preserve the ID if provided
                const { createdAt, updatedAt, ...cleanDto } = createActivityDto;
                console.log('Received activity period with ID:', cleanDto.id, 'and sessionId:', cleanDto.sessionId);
                // Map metricsBreakdown to metrics field for the entity
                const { metricsBreakdown, ...restDto } = cleanDto;
                const period = await this.activityService.create({
                    ...restDto,
                    periodStart: new Date(restDto.periodStart),
                    periodEnd: new Date(restDto.periodEnd),
                    userId: req.user.userId,
                    metrics: metricsBreakdown || restDto.metrics, // Use metricsBreakdown if provided, fallback to metrics
                });
                return { success: true, period };
            }
            catch (error) {
                console.error('Error in activity controller:', error);
                // Handle concurrent session detection
                if (error.message?.includes('CONCURRENT_SESSION_DETECTED')) {
                    return {
                        success: false,
                        error: 'CONCURRENT_SESSION_DETECTED',
                        message: 'Another session is already active in this time window. Stopping current session.',
                        details: error.message
                    };
                }
                // Return a more informative error for foreign key violations
                if (error.message?.includes('foreign key constraint')) {
                    return {
                        success: false,
                        error: 'Session does not exist',
                        message: `Session ${createActivityDto.sessionId} must be created before activity periods`,
                        sessionId: createActivityDto.sessionId
                    };
                }
                throw error;
            }
        }
        async createMultipleActivityPeriods(periods, req) {
            const results = await Promise.all(periods.map(period => {
                // Remove only auto-generated timestamp fields, preserve the ID if provided
                const { createdAt, updatedAt, ...cleanPeriod } = period;
                // Map metricsBreakdown to metrics field for the entity
                const { metricsBreakdown, ...restPeriod } = cleanPeriod;
                return this.activityService.create({
                    ...restPeriod,
                    periodStart: new Date(restPeriod.periodStart),
                    periodEnd: new Date(restPeriod.periodEnd),
                    userId: req.user.userId,
                    metrics: metricsBreakdown || restPeriod.metrics, // Use metricsBreakdown if provided, fallback to metrics
                });
            }));
            return { success: true, periods: results };
        }
    };
    __setFunctionName(_classThis, "ActivityController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getActivityPeriod_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)(':id')];
        _createActivityPeriod_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)()];
        _createMultipleActivityPeriods_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)('bulk')];
        __esDecorate(_classThis, null, _getActivityPeriod_decorators, { kind: "method", name: "getActivityPeriod", static: false, private: false, access: { has: obj => "getActivityPeriod" in obj, get: obj => obj.getActivityPeriod }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createActivityPeriod_decorators, { kind: "method", name: "createActivityPeriod", static: false, private: false, access: { has: obj => "createActivityPeriod" in obj, get: obj => obj.createActivityPeriod }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createMultipleActivityPeriods_decorators, { kind: "method", name: "createMultipleActivityPeriods", static: false, private: false, access: { has: obj => "createMultipleActivityPeriods" in obj, get: obj => obj.createMultipleActivityPeriods }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ActivityController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ActivityController = _classThis;
})();
exports.ActivityController = ActivityController;
let ActivitiesController = (() => {
    let _classDecorators = [(0, common_1.Controller)('activities')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _createActivityMetrics_decorators;
    var ActivitiesController = _classThis = class {
        constructor(activityService) {
            this.activityService = (__runInitializers(this, _instanceExtraInitializers), activityService);
        }
        async createActivityMetrics(createActivityDto, req) {
            try {
                console.log('Received activity metrics:', createActivityDto.type, 'for period:', createActivityDto.activityPeriodId);
                // For now, just return success - we can store these metrics later if needed
                return {
                    success: true,
                    message: `${createActivityDto.type} metrics recorded`
                };
            }
            catch (error) {
                console.error('Error in activities controller:', error);
                throw error;
            }
        }
    };
    __setFunctionName(_classThis, "ActivitiesController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createActivityMetrics_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)()];
        __esDecorate(_classThis, null, _createActivityMetrics_decorators, { kind: "method", name: "createActivityMetrics", static: false, private: false, access: { has: obj => "createActivityMetrics" in obj, get: obj => obj.createActivityMetrics }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ActivitiesController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ActivitiesController = _classThis;
})();
exports.ActivitiesController = ActivitiesController;
//# sourceMappingURL=activity.controller.js.map