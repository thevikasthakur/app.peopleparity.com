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
        constructor(activityPeriodsRepository, sessionsRepository, productiveHoursService) {
            this.activityPeriodsRepository = activityPeriodsRepository;
            this.sessionsRepository = sessionsRepository;
            this.productiveHoursService = productiveHoursService;
        }
        async getStats(userId, date = new Date()) {
            // Get productive hours for the specified date using the correct calculation
            const todayProductiveHours = await this.productiveHoursService.getDailyProductiveHours(userId, date);
            // Get week's productive hours for the week containing the specified date
            const weekProductiveHours = await this.productiveHoursService.getWeeklyProductiveHours(userId, date);
            // Get date range for activity periods (for client/command breakdown)
            const todayStart = new Date(date);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(date);
            todayEnd.setHours(23, 59, 59, 999);
            // Get week's date range (7 days ending on the specified date)
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - 6);
            weekStart.setHours(0, 0, 0, 0);
            // Fetch today's activity periods for client/command breakdown
            const todayPeriods = await this.activityPeriodsRepository.find({
                where: {
                    userId,
                    periodStart: (0, typeorm_1.Between)(todayStart, todayEnd),
                },
            });
            // Fetch week's activity periods for client/command breakdown
            const weekPeriods = await this.activityPeriodsRepository.find({
                where: {
                    userId,
                    periodStart: (0, typeorm_1.Between)(weekStart, todayEnd),
                },
            });
            // Calculate client/command breakdown from activity periods
            const todayBreakdown = this.calculateModeBreakdown(todayPeriods, todayProductiveHours.productiveHours);
            const weekBreakdown = this.calculateModeBreakdown(weekPeriods, weekProductiveHours.productiveHours);
            return {
                today: {
                    clientHours: todayBreakdown.clientHours,
                    commandHours: todayBreakdown.commandHours,
                    totalHours: todayProductiveHours.productiveHours,
                    averageActivityScore: todayProductiveHours.averageActivityScore,
                    focusMinutes: Math.round(todayProductiveHours.productiveHours * 60 * 0.7),
                    handsOnMinutes: Math.round(todayProductiveHours.productiveHours * 60 * 0.6),
                    researchMinutes: Math.round(todayProductiveHours.productiveHours * 60 * 0.2),
                    aiMinutes: Math.round(todayProductiveHours.productiveHours * 60 * 0.1),
                },
                week: {
                    clientHours: weekBreakdown.clientHours,
                    commandHours: weekBreakdown.commandHours,
                    totalHours: weekProductiveHours.productiveHours,
                    averageActivityScore: weekProductiveHours.averageActivityScore,
                },
            };
        }
        calculateModeBreakdown(periods, totalProductiveHours) {
            // Calculate the proportion of client vs command time from activity periods
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
            const totalMinutes = clientMinutes + commandMinutes;
            // If no activity periods, default to all client hours
            if (totalMinutes === 0) {
                return {
                    clientHours: totalProductiveHours,
                    commandHours: 0,
                };
            }
            // Distribute productive hours proportionally based on activity period modes
            const clientRatio = clientMinutes / totalMinutes;
            const commandRatio = commandMinutes / totalMinutes;
            return {
                clientHours: Math.round(totalProductiveHours * clientRatio * 100) / 100,
                commandHours: Math.round(totalProductiveHours * commandRatio * 100) / 100,
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