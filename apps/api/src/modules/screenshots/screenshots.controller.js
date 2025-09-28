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
exports.ScreenshotsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let ScreenshotsController = (() => {
    let _classDecorators = [(0, common_1.Controller)('screenshots')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _getScreenshots_decorators;
    let _getScreenshotDetails_decorators;
    let _getSignedUrl_decorators;
    let _getScreenshot_decorators;
    let _generateUploadUrl_decorators;
    let _createScreenshot_decorators;
    let _deleteScreenshot_decorators;
    let _uploadScreenshot_decorators;
    var ScreenshotsController = _classThis = class {
        constructor(screenshotsService, sessionsService, usersService, screenshotsRepository) {
            this.screenshotsService = (__runInitializers(this, _instanceExtraInitializers), screenshotsService);
            this.sessionsService = sessionsService;
            this.usersService = usersService;
            this.screenshotsRepository = screenshotsRepository;
        }
        async getScreenshots(req, startDate, endDate, includeDeviceInfo, userId) {
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            const includeDevice = includeDeviceInfo === 'true';
            const targetUserId = userId || req.user.userId;
            return this.screenshotsService.findByUser(targetUserId, start, end, includeDevice);
        }
        async getScreenshotDetails(id, req) {
            const screenshot = await this.screenshotsService.findByIdWithDetails(id);
            if (!screenshot) {
                throw new common_1.HttpException('Screenshot not found', common_1.HttpStatus.NOT_FOUND);
            }
            const currentUser = await this.usersService.findById(req.user.userId);
            if (currentUser.role === 'super_admin') {
                return screenshot;
            }
            if (currentUser.role === 'org_admin' && currentUser.organizationId) {
                const screenshotUser = await this.usersService.findById(screenshot.userId);
                if (screenshotUser?.organizationId === currentUser.organizationId) {
                    return screenshot;
                }
            }
            if (screenshot.userId === req.user.userId) {
                return screenshot;
            }
            throw new common_1.HttpException('Unauthorized', common_1.HttpStatus.FORBIDDEN);
        }
        async getSignedUrl(id, req) {
            const screenshot = await this.screenshotsService.findById(id);
            console.log('📸 Screenshot found:', { id: screenshot?.id, url: screenshot?.url, thumbnailUrl: screenshot?.thumbnailUrl });
            if (!screenshot) {
                throw new common_1.HttpException('Screenshot not found', common_1.HttpStatus.NOT_FOUND);
            }
            const currentUser = await this.usersService.findById(req.user.userId);
            console.log('👤 Current user:', { userId: currentUser.id, role: currentUser.role, screenshotUserId: screenshot.userId });
            let canAccess = false;
            if (currentUser.role === 'super_admin') {
                canAccess = true;
                console.log('✅ Access granted: super_admin');
            }
            else if (currentUser.role === 'org_admin' && currentUser.organizationId) {
                const screenshotUser = await this.usersService.findById(screenshot.userId);
                if (screenshotUser?.organizationId === currentUser.organizationId) {
                    canAccess = true;
                    console.log('✅ Access granted: org_admin');
                }
            }
            else if (screenshot.userId === req.user.userId) {
                canAccess = true;
                console.log('✅ Access granted: own screenshot');
            }
            if (!canAccess) {
                console.log('❌ Access denied');
                throw new common_1.HttpException('Unauthorized', common_1.HttpStatus.FORBIDDEN);
            }
            console.log('🔐 Generating signed URL for:', screenshot.url);
            const signedUrl = await this.screenshotsService.generateViewSignedUrl(screenshot.url);
            console.log('✅ Signed URL generated successfully');
            return {
                success: true,
                signedUrl,
                expiresIn: 300
            };
        }
        async getScreenshot(id) {
            return this.screenshotsService.findById(id);
        }
        async generateUploadUrl(body, req) {
            const userId = req.user.userId;
            const timestamp = Date.now();
            const key = `inzint/${userId}/${timestamp}_${body.filename}`;
            // Generate signed URLs for both full and thumbnail versions
            const uploadUrls = await this.screenshotsService.generateSignedUploadUrls(key, body.contentType || 'image/jpeg', body.timezone, body.localTimestamp);
            return {
                success: true,
                uploadUrls,
                key
            };
        }
        async createScreenshot(body, req) {
            // Use userId from body if provided (for sync), otherwise use authenticated user
            const userId = body.userId || req.user.userId;
            // Check if screenshot already exists (to prevent duplicates)
            if (body.id) {
                const existing = await this.screenshotsService.findById(body.id);
                if (existing) {
                    console.log(`Screenshot ${body.id} already exists, skipping creation`);
                    return { success: true, screenshot: existing };
                }
            }
            // Get current session details to check device info
            const currentSession = await this.sessionsService.findById(body.sessionId);
            if (!currentSession) {
                throw new common_1.HttpException(`Session ${body.sessionId} not found`, common_1.HttpStatus.NOT_FOUND);
            }
            const currentDevice = currentSession.deviceInfo || 'unknown';
            const capturedAt = new Date(body.capturedAt);
            // Calculate 10-minute window boundaries
            const windowStart = new Date(capturedAt);
            windowStart.setMinutes(Math.floor(windowStart.getMinutes() / 10) * 10);
            windowStart.setSeconds(0);
            windowStart.setMilliseconds(0);
            const windowEnd = new Date(windowStart);
            windowEnd.setMinutes(windowEnd.getMinutes() + 10);
            // Check for other screenshots in the same 10-minute window from the same user
            const existingScreenshots = await this.screenshotsRepository
                .createQueryBuilder('screenshot')
                .leftJoinAndSelect('screenshot.session', 'session')
                .where('screenshot.userId = :userId', { userId })
                .andWhere('screenshot.capturedAt >= :windowStart', { windowStart })
                .andWhere('screenshot.capturedAt < :windowEnd', { windowEnd })
                .andWhere('screenshot.isDeleted = :isDeleted', { isDeleted: false })
                .getMany();
            // Check if any existing screenshots are from different devices
            const differentDeviceScreenshots = existingScreenshots.filter(screenshot => {
                const existingDevice = screenshot.session?.deviceInfo || 'unknown';
                return existingDevice !== currentDevice && screenshot.sessionId !== body.sessionId;
            });
            if (differentDeviceScreenshots.length > 0) {
                // Concurrent session from different device detected!
                const conflictingDevice = differentDeviceScreenshots[0].session?.deviceInfo || 'unknown device';
                console.error(`🚫 CONCURRENT SESSION DETECTED: User ${userId} is tracking from multiple devices!`);
                console.error(`  Current device: ${currentDevice}`);
                console.error(`  Conflicting device: ${conflictingDevice}`);
                console.error(`  Window: ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);
                // Return error response that the desktop app can handle
                throw new common_1.HttpException({
                    error: 'CONCURRENT_SESSION_DETECTED',
                    message: `Another device (${conflictingDevice}) is already tracking time for your account in this time window.`,
                    details: {
                        currentDevice,
                        conflictingDevice,
                        windowStart: windowStart.toISOString(),
                        windowEnd: windowEnd.toISOString(),
                        sessionId: body.sessionId
                    }
                }, common_1.HttpStatus.CONFLICT);
            }
            try {
                const screenshot = await this.screenshotsService.create({
                    id: body.id, // Use the ID from desktop if provided
                    userId,
                    sessionId: body.sessionId,
                    url: body.url,
                    thumbnailUrl: body.thumbnailUrl,
                    capturedAt: new Date(body.capturedAt),
                    mode: body.mode || 'client_hours',
                    notes: body.notes || '',
                });
                console.log(`Screenshot created successfully: ${screenshot.id} for session: ${body.sessionId}`);
                return { success: true, screenshot };
            }
            catch (error) {
                console.error(`Failed to create screenshot in database:`, error);
                // If it's a foreign key constraint error, return a specific message
                if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
                    throw new Error(`Session ${body.sessionId} does not exist. Please sync sessions first.`);
                }
                throw error;
            }
        }
        async deleteScreenshot(id, req) {
            console.log(`Request to delete screenshot ${id} by user ${req.user.userId}`);
            // Get the screenshot to verify it exists and user has access
            const screenshot = await this.screenshotsService.findById(id);
            if (!screenshot) {
                console.log(`Screenshot ${id} not found`);
                throw new common_1.HttpException('Screenshot not found', common_1.HttpStatus.NOT_FOUND);
            }
            // Verify the user owns this screenshot
            if (screenshot.userId !== req.user.userId) {
                console.log;
                throw new common_1.HttpException('Unauthorized to delete this screenshot', common_1.HttpStatus.FORBIDDEN);
            }
            console.log(`Deleting screenshot ${id} for user ${req.user.userId}`);
            // Delete the screenshot (soft delete by marking as deleted)
            await this.screenshotsService.softDelete(id);
            console.log('Deleting activity periods associated with the screenshot');
            // Also delete associated activity periods
            await this.screenshotsService.deleteActivityPeriods(id);
            console.log(`Screenshot ${id} deleted successfully by user ${req.user.userId}`);
            return {
                success: true,
                message: 'Screenshot deleted successfully'
            };
        }
        async uploadScreenshot(file, body, req) {
            // Use userId from body if provided (for sync), otherwise use authenticated user
            const userId = body.userId || req.user.userId;
            // Check if screenshot already exists (to prevent duplicates)
            if (body.id) {
                const existing = await this.screenshotsService.findById(body.id);
                if (existing) {
                    console.log(`Screenshot ${body.id} already exists, skipping upload`);
                    return { success: true, url: existing.url, thumbnailUrl: existing.thumbnailUrl, screenshot: existing };
                }
            }
            // Get current session details to check device info
            const currentSession = await this.sessionsService.findById(body.sessionId);
            if (!currentSession) {
                throw new common_1.HttpException(`Session ${body.sessionId} not found`, common_1.HttpStatus.NOT_FOUND);
            }
            const currentDevice = currentSession.deviceInfo || 'unknown';
            const capturedAt = new Date(body.capturedAt);
            // Calculate 10-minute window boundaries
            const windowStart = new Date(capturedAt);
            windowStart.setMinutes(Math.floor(windowStart.getMinutes() / 10) * 10);
            windowStart.setSeconds(0);
            windowStart.setMilliseconds(0);
            const windowEnd = new Date(windowStart);
            windowEnd.setMinutes(windowEnd.getMinutes() + 10);
            // Check for other screenshots in the same 10-minute window from the same user
            const existingScreenshots = await this.screenshotsRepository
                .createQueryBuilder('screenshot')
                .leftJoinAndSelect('screenshot.session', 'session')
                .where('screenshot.userId = :userId', { userId })
                .andWhere('screenshot.capturedAt >= :windowStart', { windowStart })
                .andWhere('screenshot.capturedAt < :windowEnd', { windowEnd })
                .andWhere('screenshot.isDeleted = :isDeleted', { isDeleted: false })
                .getMany();
            // Check if any existing screenshots are from different devices
            const differentDeviceScreenshots = existingScreenshots.filter(screenshot => {
                const existingDevice = screenshot.session?.deviceInfo || 'unknown';
                return existingDevice !== currentDevice && screenshot.sessionId !== body.sessionId;
            });
            if (differentDeviceScreenshots.length > 0) {
                // Concurrent session from different device detected!
                const conflictingDevice = differentDeviceScreenshots[0].session?.deviceInfo || 'unknown device';
                console.error(`🚫 CONCURRENT SESSION DETECTED: User ${userId} is tracking from multiple devices!`);
                console.error(`  Current device: ${currentDevice}`);
                console.error(`  Conflicting device: ${conflictingDevice}`);
                console.error(`  Window: ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);
                // Return error response that the desktop app can handle
                throw new common_1.HttpException({
                    error: 'CONCURRENT_SESSION_DETECTED',
                    message: `Another device (${conflictingDevice}) is already tracking time for your account in this time window.`,
                    details: {
                        currentDevice,
                        conflictingDevice,
                        windowStart: windowStart.toISOString(),
                        windowEnd: windowEnd.toISOString(),
                        sessionId: body.sessionId
                    }
                }, common_1.HttpStatus.CONFLICT);
            }
            // Check for same device but different session (shouldn't happen normally)
            const sameDeviceDifferentSession = existingScreenshots.filter(screenshot => {
                const existingDevice = screenshot.session?.deviceInfo || 'unknown';
                return existingDevice === currentDevice && screenshot.sessionId !== body.sessionId;
            });
            if (sameDeviceDifferentSession.length > 0) {
                console.warn(`⚠️ Multiple sessions from same device detected for user ${userId}, but allowing screenshot`);
            }
            const { fullUrl, thumbnailUrl } = await this.screenshotsService.uploadToS3(file, userId);
            try {
                const screenshot = await this.screenshotsService.create({
                    id: body.id, // Use the ID from desktop if provided
                    userId,
                    sessionId: body.sessionId,
                    url: fullUrl,
                    thumbnailUrl,
                    capturedAt: new Date(body.capturedAt),
                    mode: body.mode || 'client_hours',
                    notes: body.notes || '',
                });
                console.log(`Screenshot created successfully: ${screenshot.id} for session: ${body.sessionId}`);
                return { success: true, url: fullUrl, thumbnailUrl, screenshot };
            }
            catch (error) {
                console.error(`Failed to create screenshot in database:`, error);
                // If it's a foreign key constraint error, return a specific message
                if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
                    throw new Error(`Session ${body.sessionId} does not exist. Please sync sessions first.`);
                }
                throw error;
            }
        }
    };
    __setFunctionName(_classThis, "ScreenshotsController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getScreenshots_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)()];
        _getScreenshotDetails_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)(':id/details')];
        _getSignedUrl_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)(':id/signed-url')];
        _getScreenshot_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Get)(':id')];
        _generateUploadUrl_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)('generate-upload-url')];
        _createScreenshot_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)('create')];
        _deleteScreenshot_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Delete)(':id')];
        _uploadScreenshot_decorators = [(0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Post)('upload'), (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('screenshot'))];
        __esDecorate(_classThis, null, _getScreenshots_decorators, { kind: "method", name: "getScreenshots", static: false, private: false, access: { has: obj => "getScreenshots" in obj, get: obj => obj.getScreenshots }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getScreenshotDetails_decorators, { kind: "method", name: "getScreenshotDetails", static: false, private: false, access: { has: obj => "getScreenshotDetails" in obj, get: obj => obj.getScreenshotDetails }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSignedUrl_decorators, { kind: "method", name: "getSignedUrl", static: false, private: false, access: { has: obj => "getSignedUrl" in obj, get: obj => obj.getSignedUrl }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getScreenshot_decorators, { kind: "method", name: "getScreenshot", static: false, private: false, access: { has: obj => "getScreenshot" in obj, get: obj => obj.getScreenshot }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _generateUploadUrl_decorators, { kind: "method", name: "generateUploadUrl", static: false, private: false, access: { has: obj => "generateUploadUrl" in obj, get: obj => obj.generateUploadUrl }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createScreenshot_decorators, { kind: "method", name: "createScreenshot", static: false, private: false, access: { has: obj => "createScreenshot" in obj, get: obj => obj.createScreenshot }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteScreenshot_decorators, { kind: "method", name: "deleteScreenshot", static: false, private: false, access: { has: obj => "deleteScreenshot" in obj, get: obj => obj.deleteScreenshot }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _uploadScreenshot_decorators, { kind: "method", name: "uploadScreenshot", static: false, private: false, access: { has: obj => "uploadScreenshot" in obj, get: obj => obj.uploadScreenshot }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ScreenshotsController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ScreenshotsController = _classThis;
})();
exports.ScreenshotsController = ScreenshotsController;
//# sourceMappingURL=screenshots.controller.js.map