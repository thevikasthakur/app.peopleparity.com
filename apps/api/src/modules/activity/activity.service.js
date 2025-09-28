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
exports.ActivityService = void 0;
const common_1 = require("@nestjs/common");
let ActivityService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ActivityService = _classThis = class {
        constructor(activityPeriodsRepository, sessionsService) {
            this.activityPeriodsRepository = activityPeriodsRepository;
            this.sessionsService = sessionsService;
        }
        async create(createActivityDto) {
            console.log('Creating activity period with ID:', createActivityDto.id, 'for session:', createActivityDto.sessionId);
            // Check for overlapping periods from different sessions in the same 10-minute window
            const windowStart = new Date(createActivityDto.periodStart);
            windowStart.setMinutes(Math.floor(windowStart.getMinutes() / 10) * 10, 0, 0);
            const windowEnd = new Date(windowStart);
            windowEnd.setMinutes(windowEnd.getMinutes() + 10);
            console.log(`Checking for concurrent sessions in window ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);
            // First get existing activity periods in this time window from different sessions
            const existingPeriods = await this.activityPeriodsRepository
                .createQueryBuilder('period')
                .leftJoinAndSelect('period.session', 'session')
                .where('period.userId = :userId', { userId: createActivityDto.userId })
                .andWhere('period.sessionId != :sessionId', { sessionId: createActivityDto.sessionId })
                .andWhere('period.periodStart >= :windowStart', { windowStart })
                .andWhere('period.periodStart < :windowEnd', { windowEnd })
                .getMany();
            if (existingPeriods.length > 0) {
                // Get the current session to check device info
                const currentSession = await this.sessionsService.findById(createActivityDto.sessionId);
                const currentDevice = currentSession?.deviceInfo || 'unknown';
                // Check if any of the existing periods are from a DIFFERENT device
                const differentDeviceSessions = existingPeriods.filter(period => {
                    const existingDevice = period.session?.deviceInfo || 'unknown';
                    return existingDevice !== currentDevice;
                });
                if (differentDeviceSessions.length > 0) {
                    // Concurrent session from DIFFERENT device detected - this is not allowed
                    const existingSessionIds = [...new Set(differentDeviceSessions.map(p => p.sessionId))];
                    console.error(`🚫 Concurrent session from DIFFERENT DEVICE detected! User ${createActivityDto.userId} already has activity from different device(s) in session(s): ${existingSessionIds.join(', ')}`);
                    // Return error that will trigger session stop on the client
                    throw new Error(`CONCURRENT_SESSION_DETECTED: Another device is already tracking in this time window. Sessions: ${existingSessionIds.join(', ')}`);
                }
                else {
                    // Same device, multiple sessions - just log it, don't throw error
                    console.log(`⚠️ Multiple sessions from SAME device detected for user ${createActivityDto.userId}, but allowing it`);
                }
            }
            // Log if metrics are present
            if (createActivityDto.metrics) {
                const metricsKeys = Object.keys(createActivityDto.metrics);
                console.log('Activity period includes detailed metrics:', metricsKeys.join(', '));
                // Log bot detection if present
                if (createActivityDto.metrics.botDetection?.keyboardBotDetected ||
                    createActivityDto.metrics.botDetection?.mouseBotDetected) {
                    console.log('⚠️ Bot activity detected in period:', createActivityDto.id);
                }
            }
            try {
                // Apply 15% boost to activity score to make it easier for users to achieve higher scores
                // This boost is applied at the storage level, so it affects all downstream calculations
                const boostedScore = Math.min(100, createActivityDto.activityScore * 1.15);
                console.log(`[Activity Score Boost] Original: ${createActivityDto.activityScore}, Boosted (+15%): ${boostedScore}`);
                const period = this.activityPeriodsRepository.create({
                    ...createActivityDto,
                    activityScore: boostedScore // Use boosted score
                });
                const savedPeriod = await this.activityPeriodsRepository.save(period);
                console.log('Activity period created successfully with boosted score:', savedPeriod.id);
                return savedPeriod;
            }
            catch (error) {
                console.error('Error creating activity period:', error.message);
                if (error.message?.includes('foreign key constraint')) {
                    console.error(`Session ${createActivityDto.sessionId} does not exist in database`);
                }
                throw error;
            }
        }
        async findById(id) {
            return this.activityPeriodsRepository.findOne({ where: { id } });
        }
        async findByUser(userId, startDate, endDate) {
            const query = this.activityPeriodsRepository
                .createQueryBuilder('period')
                .where('period.userId = :userId', { userId });
            if (startDate) {
                query.andWhere('period.periodStart >= :startDate', { startDate });
            }
            if (endDate) {
                query.andWhere('period.periodEnd <= :endDate', { endDate });
            }
            return query.getMany();
        }
    };
    __setFunctionName(_classThis, "ActivityService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ActivityService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ActivityService = _classThis;
})();
exports.ActivityService = ActivityService;
//# sourceMappingURL=activity.service.js.map