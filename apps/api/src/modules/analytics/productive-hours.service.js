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
exports.ProductiveHoursService = void 0;
const common_1 = require("@nestjs/common");
let ProductiveHoursService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ProductiveHoursService = _classThis = class {
        constructor(screenshotRepository, activityPeriodRepository) {
            this.screenshotRepository = screenshotRepository;
            this.activityPeriodRepository = activityPeriodRepository;
        }
        async getDailyProductiveHours(userId, date) {
            try {
                if (!userId) {
                    console.error("❌ No userId provided to getDailyProductiveHours");
                    throw new Error("userId is required");
                }
                // Set date range to UTC midnight
                const startOfDay = new Date(date);
                startOfDay.setUTCHours(0, 0, 0, 0);
                const endOfDay = new Date(date);
                endOfDay.setUTCHours(23, 59, 59, 999);
                console.log("📊 Fetching daily productive hours for:", {
                    userId,
                    date: date.toISOString(),
                    startOfDay: startOfDay.toISOString(),
                    endOfDay: endOfDay.toISOString(),
                });
                // Fetch screenshots first
                // NOTE: Using timestamptz casts for safety (can be removed after migration to timestamptz column type)
                const query = this.screenshotRepository
                    .createQueryBuilder("screenshot")
                    .where("screenshot.userId = :userId", { userId })
                    .andWhere(`screenshot."capturedAt"::timestamptz >= :startOfDay::timestamptz`, { startOfDay: startOfDay.toISOString() })
                    .andWhere(`screenshot."capturedAt"::timestamptz <= :endOfDay::timestamptz`, { endOfDay: endOfDay.toISOString() })
                    .andWhere("(screenshot.isDeleted IS NULL OR screenshot.isDeleted = FALSE)")
                    .orderBy("screenshot.capturedAt", "ASC");
                const screenshots = await query.getMany();
                // const screenshots = await this.screenshotRepository.find({
                //   where: {
                //     userId,
                //     capturedAt: Between(startOfDay, endOfDay),
                //   },
                //   relations: ["activityPeriods"],
                //   order: {
                //     capturedAt: "ASC",
                //   },
                // });
                console.log(`Found ${screenshots.length} screenshots for the day`);
                // Fetch activity periods separately for all screenshots
                if (screenshots.length > 0) {
                    const screenshotIds = screenshots.map((s) => s.id);
                    const activityPeriods = await this.activityPeriodRepository
                        .createQueryBuilder("ap")
                        .where("ap.screenshotId IN (:...screenshotIds)", { screenshotIds })
                        .getMany();
                    console.log(`Found ${activityPeriods.length} activity periods for these screenshots`);
                    // Map activity periods to screenshots
                    for (const screenshot of screenshots) {
                        screenshot.activityPeriods = activityPeriods.filter((ap) => ap.screenshotId === screenshot.id);
                    }
                }
                let validMinutes = 0;
                const allScores = [];
                // Build array of screenshot scores for neighbor checking
                const screenshotScores = [];
                // First pass: calculate scores for all screenshots
                for (const screenshot of screenshots) {
                    if (!screenshot.activityPeriods ||
                        screenshot.activityPeriods.length === 0) {
                        continue;
                    }
                    // Calculate weighted average score for this screenshot
                    const scores = screenshot.activityPeriods
                        .map((period) => period.activityScore || 0)
                        .sort((a, b) => b - a); // Sort descending
                    if (scores.length === 0)
                        continue;
                    // Match frontend's calculateScreenshotScore logic:
                    // >8 periods: take best 8, >4 periods: discard worst 1, <=4: simple avg
                    let scoresToAverage;
                    if (scores.length > 8) {
                        scoresToAverage = scores.slice(0, 8); // Take best 8
                    }
                    else if (scores.length > 4) {
                        scoresToAverage = scores.slice(0, -1); // Discard worst 1
                    }
                    else {
                        scoresToAverage = scores; // Take all
                    }
                    // Calculate simple average of selected scores (DB scale 0-100)
                    const weightedScore = scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length;
                    // Convert to UI scale (0-10)
                    const uiScore = weightedScore / 10;
                    if (uiScore > 0) {
                        allScores.push(uiScore);
                    }
                    screenshotScores.push({
                        screenshot,
                        weightedScore,
                        uiScore,
                    });
                }
                // Second pass: apply validation rules with neighbor checking
                for (let i = 0; i < screenshotScores.length; i++) {
                    const current = screenshotScores[i];
                    const prev = i > 0 ? screenshotScores[i - 1] : null;
                    const next = i < screenshotScores.length - 1 ? screenshotScores[i + 1] : null;
                    let isValid = false;
                    // Rule 1: Valid if score >= 4.0 (40 on DB scale)
                    if (current.weightedScore >= 40) {
                        isValid = true;
                        console.log(`Screenshot ${i}: Score ${current.uiScore.toFixed(1)} >= 4.0 -> VALID`);
                    }
                    // Rule 2 & 3: Critical (2.5-4.0) has two possible validation paths
                    else if (current.weightedScore >= 25 && current.weightedScore < 40) {
                        // Rule 2: Check if previous or next screenshot has score >= 4.0
                        if ((prev && prev.weightedScore >= 40) ||
                            (next && next.weightedScore >= 40)) {
                            isValid = true;
                            const neighborInfo = prev && prev.weightedScore >= 40
                                ? `prev=${prev.uiScore.toFixed(1)}`
                                : `next=${next?.uiScore.toFixed(1)}`;
                            console.log(`Screenshot ${i}: Critical score ${current.uiScore.toFixed(1)} with neighbor >= 4.0 (${neighborInfo}) -> VALID`);
                        }
                        // Rule 3: Check hourly average condition
                        else {
                            // Get the hour of this screenshot
                            const screenshotTime = new Date(current.screenshot.capturedAt);
                            const hourStart = new Date(screenshotTime);
                            hourStart.setMinutes(0, 0, 0);
                            const hourEnd = new Date(hourStart);
                            hourEnd.setHours(hourEnd.getHours() + 1);
                            // Find all screenshots in this hour
                            const hourScreenshots = screenshotScores.filter((s) => {
                                const time = new Date(s.screenshot.capturedAt).getTime();
                                return time >= hourStart.getTime() && time < hourEnd.getTime();
                            });
                            // Check if hour has 6+ screenshots
                            if (hourScreenshots.length >= 6) {
                                // Collect all activity period scores for the hour
                                const hourPeriodScores = [];
                                for (const hs of hourScreenshots) {
                                    const periodScores = hs.screenshot.activityPeriods?.map((p) => p.activityScore || 0) || [];
                                    hourPeriodScores.push(...periodScores);
                                }
                                // Calculate top 80% average
                                if (hourPeriodScores.length > 0) {
                                    const avgScore = this.calculateTop80Average(hourPeriodScores.map((s) => s / 10));
                                    // Check if average >= 4.0 (40 on DB scale)
                                    if (avgScore >= 4.0) {
                                        isValid = true;
                                        console.log(`Screenshot ${i}: Critical score ${current.uiScore.toFixed(1)} with hourly avg ${avgScore.toFixed(1)} >= 4.0 (${hourScreenshots.length} screenshots in hour) -> VALID`);
                                    }
                                    else {
                                        console.log(`Screenshot ${i}: Critical score ${current.uiScore.toFixed(1)} with hourly avg ${avgScore.toFixed(1)} < 4.0 -> INVALID`);
                                    }
                                }
                            }
                            else {
                                console.log(`Screenshot ${i}: Critical score ${current.uiScore.toFixed(1)} with only ${hourScreenshots.length} screenshots in hour (< 6 required) -> INVALID`);
                            }
                        }
                    }
                    // Rule 4: Inactive (< 2.5) is never valid
                    else {
                        console.log(`Screenshot ${i}: Score ${current.uiScore.toFixed(1)} < 2.5 -> INVALID`);
                    }
                    if (isValid) {
                        validMinutes += 10; // Each screenshot represents 10 minutes
                    }
                }
                const productiveHours = validMinutes / 60;
                // Calculate average activity score (top 80% average)
                const averageActivityScore = this.calculateTop80Average(allScores);
                // Also calculate simple average for comparison
                const simpleAverage = allScores.length > 0
                    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
                    : 0;
                // Calculate activity level label
                const activityLevel = this.getActivityLevel(averageActivityScore);
                return {
                    productiveHours: Math.round(productiveHours * 100) / 100,
                    averageActivityScore: Math.round(averageActivityScore * 10) / 10,
                    activityLevel,
                    totalScreenshots: screenshots.length,
                    validScreenshots: Math.floor(validMinutes / 10),
                    date: date.toISOString().split("T")[0],
                };
            }
            catch (error) {
                console.error("❌ Error in getDailyProductiveHours:", error);
                throw error;
            }
        }
        async getWeeklyProductiveHours(userId, date) {
            try {
                if (!userId) {
                    console.error("❌ No userId provided to getWeeklyProductiveHours");
                    throw new Error("userId is required");
                }
                // Get Monday of the week
                const dayOfWeek = date.getDay();
                const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - daysToMonday);
                startOfWeek.setUTCHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setUTCHours(23, 59, 59, 999);
                console.log("📊 Fetching weekly productive hours for:", {
                    userId,
                    date: date.toISOString(),
                    startOfWeek: startOfWeek.toISOString(),
                    endOfWeek: endOfWeek.toISOString(),
                });
                // Fetch all screenshots for the week to calculate proper average
                // Apply same timezone fix as daily query
                const screenshots = await this.screenshotRepository
                    .createQueryBuilder("screenshot")
                    .leftJoinAndSelect("screenshot.activityPeriods", "ap")
                    .where("screenshot.userId = :userId", { userId })
                    .andWhere(`screenshot."capturedAt"::timestamptz >= :startOfWeek::timestamptz`, { startOfWeek: startOfWeek.toISOString() })
                    .andWhere(`screenshot."capturedAt"::timestamptz <= :endOfWeek::timestamptz`, { endOfWeek: endOfWeek.toISOString() })
                    .orderBy("screenshot.capturedAt", "ASC")
                    .getMany();
                console.log(`Found ${screenshots.length} screenshots for the week`);
                // Collect all individual screenshot scores for the week
                const allWeeklyScores = [];
                // Process each screenshot to get its weighted score
                for (const screenshot of screenshots) {
                    if (!screenshot.activityPeriods ||
                        screenshot.activityPeriods.length === 0) {
                        continue;
                    }
                    const scores = screenshot.activityPeriods
                        .map((period) => period.activityScore || 0)
                        .sort((a, b) => b - a);
                    if (scores.length === 0)
                        continue;
                    // Match frontend's calculateScreenshotScore logic:
                    // >8 periods: take best 8, >4 periods: discard worst 1, <=4: simple avg
                    let scoresToAverage;
                    if (scores.length > 8) {
                        scoresToAverage = scores.slice(0, 8); // Take best 8
                    }
                    else if (scores.length > 4) {
                        scoresToAverage = scores.slice(0, -1); // Discard worst 1
                    }
                    else {
                        scoresToAverage = scores; // Take all
                    }
                    // Calculate simple average of selected scores
                    const weightedScore = scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length;
                    // Convert to UI scale (0-10)
                    const uiScore = weightedScore / 10;
                    if (uiScore > 0) {
                        allWeeklyScores.push(uiScore);
                    }
                }
                // Get daily data for each day of the week
                const dailyData = [];
                let totalHours = 0;
                for (let i = 0; i < 7; i++) {
                    const currentDate = new Date(startOfWeek);
                    currentDate.setDate(startOfWeek.getDate() + i);
                    const dayData = await this.getDailyProductiveHours(userId, currentDate);
                    dailyData.push({
                        date: currentDate.toISOString().split("T")[0],
                        hours: dayData.productiveHours,
                        averageActivityScore: dayData.averageActivityScore,
                    });
                    totalHours += dayData.productiveHours;
                }
                // Use top 80% average of all weekly screenshot scores
                const averageActivityScore = this.calculateTop80Average(allWeeklyScores);
                // Calculate activity level label
                const activityLevel = this.getActivityLevel(averageActivityScore);
                return {
                    productiveHours: Math.round(totalHours * 100) / 100,
                    averageActivityScore: Math.round(averageActivityScore * 10) / 10,
                    activityLevel,
                    dailyData,
                    weekStart: startOfWeek.toISOString().split("T")[0],
                    weekEnd: endOfWeek.toISOString().split("T")[0],
                };
            }
            catch (error) {
                console.error("❌ Error in getWeeklyProductiveHours:", error);
                throw error;
            }
        }
        calculateTop80Average(scores) {
            if (scores.length === 0)
                return 0;
            if (scores.length === 1)
                return scores[0];
            // Sort scores descending
            const sorted = [...scores].sort((a, b) => b - a);
            // Take top 80% of scores
            const count = Math.max(1, Math.ceil(scores.length * 0.8));
            const top80 = sorted.slice(0, count);
            // Calculate average
            const result = top80.reduce((sum, score) => sum + score, 0) / top80.length;
            console.log(`📊 [Top80% Calculation]:`, {
                totalScores: scores.length,
                top80Count: count,
                excluded: scores.length - count,
                allScores: sorted.slice(0, 5).map((s) => Math.round(s * 10) / 10),
                top80Scores: top80.slice(0, 5).map((s) => Math.round(s * 10) / 10),
                result: Math.round(result * 10) / 10,
            });
            return result;
        }
        getActivityLevel(score) {
            if (score >= 8.5)
                return "Good";
            if (score >= 7.0)
                return "Fair";
            if (score >= 5.5)
                return "Low";
            if (score >= 4.0)
                return "Poor";
            if (score >= 2.5)
                return "Critical";
            return "Inactive";
        }
    };
    __setFunctionName(_classThis, "ProductiveHoursService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ProductiveHoursService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ProductiveHoursService = _classThis;
})();
exports.ProductiveHoursService = ProductiveHoursService;
//# sourceMappingURL=productive-hours.service.js.map