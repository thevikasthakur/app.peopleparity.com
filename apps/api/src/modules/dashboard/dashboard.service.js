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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let DashboardService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var DashboardService = _classThis = class {
        constructor(activityPeriodsRepository, sessionsRepository) {
            this.activityPeriodsRepository = activityPeriodsRepository;
            this.sessionsRepository = sessionsRepository;
        }
        async getStats(userId) {
            // Get today's date range
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            // Get week's date range (last 7 days)
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 6);
            weekStart.setHours(0, 0, 0, 0);
            // Fetch today's activity periods
            const todayPeriods = await this.activityPeriodsRepository.find({
                where: {
                    userId,
                    periodStart: (0, typeorm_1.Between)(todayStart, todayEnd),
                },
            });
            // Fetch week's activity periods
            const weekPeriods = await this.activityPeriodsRepository.find({
                where: {
                    userId,
                    periodStart: (0, typeorm_1.Between)(weekStart, todayEnd),
                },
            });
            // Calculate today's stats
            const todayStats = this.calculateStats(todayPeriods);
            // Calculate week's stats
            const weekStats = this.calculateStats(weekPeriods);
            return {
                today: {
                    clientHours: todayStats.clientHours,
                    commandHours: todayStats.commandHours,
                    totalHours: todayStats.totalHours,
                    focusMinutes: Math.round(todayStats.totalHours * 60 * 0.7),
                    handsOnMinutes: Math.round(todayStats.totalHours * 60 * 0.6),
                    researchMinutes: Math.round(todayStats.totalHours * 60 * 0.2),
                    aiMinutes: Math.round(todayStats.totalHours * 60 * 0.1),
                },
                week: {
                    clientHours: weekStats.clientHours,
                    commandHours: weekStats.commandHours,
                    totalHours: weekStats.totalHours,
                },
            };
        }
        calculateStats(periods) {
            let clientMinutes = 0;
            let commandMinutes = 0;
            for (const period of periods) {
                const duration = (new Date(period.periodEnd).getTime() - new Date(period.periodStart).getTime()) / 1000 / 60;
                if (period.mode === 'client_hours') {
                    clientMinutes += duration;
                }
                else {
                    commandMinutes += duration;
                }
            }
            return {
                clientHours: Math.round((clientMinutes / 60) * 100) / 100,
                commandHours: Math.round((commandMinutes / 60) * 100) / 100,
                totalHours: Math.round(((clientMinutes + commandMinutes) / 60) * 100) / 100,
            };
        }
    };
    __setFunctionName(_classThis, "DashboardService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        DashboardService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return DashboardService = _classThis;
})();
exports.DashboardService = DashboardService;
//# sourceMappingURL=dashboard.service.js.map