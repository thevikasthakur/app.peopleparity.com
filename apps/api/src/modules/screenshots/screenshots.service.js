"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotsService = void 0;
const common_1 = require("@nestjs/common");
const AWS = __importStar(require("aws-sdk"));
let ScreenshotsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ScreenshotsService = _classThis = class {
        constructor(screenshotsRepository, activityPeriodsRepository, configService) {
            this.screenshotsRepository = screenshotsRepository;
            this.activityPeriodsRepository = activityPeriodsRepository;
            this.configService = configService;
            this.s3 = null;
            // Delay S3 initialization to avoid constructor issues
        }
        getS3Client() {
            if (!this.s3) {
                this.s3 = new AWS.S3({
                    region: process.env.AWS_REGION || "ap-south-1",
                    signatureVersion: "v4",
                });
            }
            return this.s3;
        }
        async generateSignedUploadUrls(baseKey, contentType, timezone, localTimestamp) {
            const stage = process.env.STAGE || "dev";
            const bucket = process.env.SCREENSHOTS_BUCKET || `ppv1-screenshots-${stage}`;
            const s3 = this.getS3Client();
            // Extract userId from baseKey
            // baseKey format: inzint/userId/timestamp_filename
            const parts = baseKey.split("/");
            const userId = parts[1];
            // Create filename with local time and timezone
            let humanReadableName;
            if (localTimestamp && timezone) {
                // localTimestamp is now in format YYYY-MM-DDTHH:MM:SS (local time, not UTC)
                // Simply extract the numbers to create the filename
                const dateStr = localTimestamp.replace(/[-:T]/g, ""); // Remove separators to get YYYYMMDDHHMMSS
                // Format timezone for filename (e.g., +0530 becomes P0530, -1100 becomes M1100)
                const tzForFilename = timezone.replace("+", "P").replace("-", "M");
                humanReadableName = `${dateStr}_${tzForFilename}.jpg`;
            }
            else {
                // Fallback to UTC if no timezone provided
                const now = new Date();
                const dateStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
                humanReadableName = `${dateStr}_UTC.jpg`;
            }
            // Create separate folders for full and thumb
            const fullKey = `inzint/${userId}/full/${humanReadableName}`;
            const thumbKey = `inzint/${userId}/thumb/${humanReadableName}`;
            // Generate presigned URLs for uploading
            const fullUrl = await s3.getSignedUrlPromise("putObject", {
                Bucket: bucket,
                Key: fullKey,
                ContentType: contentType,
                Expires: 300, // URL expires in 5 min
            });
            // Generate presigned URL for thumbnail
            const thumbnailUrl = await s3.getSignedUrlPromise("putObject", {
                Bucket: bucket,
                Key: thumbKey,
                ContentType: contentType,
                Expires: 300,
            });
            // Return both upload URLs and the keys for later reference
            return {
                fullUrl,
                thumbnailUrl,
                fullKey,
                thumbnailKey: thumbKey,
            };
        }
        async uploadToS3(file, userId) {
            const stage = process.env.STAGE || "dev";
            const bucket = process.env.SCREENSHOTS_BUCKET || `ppv1-screenshots-${stage}`;
            // Create human-readable timestamp
            const now = new Date();
            const dateStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
            const filename = `${dateStr}.jpg`;
            // Lazy load sharp to avoid initialization issues in serverless
            const sharp = await Promise.resolve().then(() => __importStar(require("sharp")));
            // Create thumbnail (250px width, maintaining aspect ratio)
            const thumbnailBuffer = await sharp
                .default(file.buffer)
                .resize(250, null, {
                fit: "inside",
                withoutEnlargement: false,
            })
                .jpeg({ quality: 99 })
                .toBuffer();
            // Upload full-size image (private by default)
            const fullKey = `inzint/${userId}/full/${filename}`;
            const fullParams = {
                Bucket: bucket,
                Key: fullKey,
                Body: file.buffer,
                ContentType: "image/jpeg",
            };
            // Upload thumbnail with public-read ACL
            const thumbKey = `inzint/${userId}/thumb/${filename}`;
            const thumbParams = {
                Bucket: bucket,
                Key: thumbKey,
                Body: thumbnailBuffer,
                ContentType: "image/jpeg",
            };
            // Upload both versions in parallel
            const [fullResult, thumbResult] = await Promise.all([
                this.getS3Client().upload(fullParams).promise(),
                this.getS3Client().upload(thumbParams).promise(),
            ]);
            return {
                fullUrl: fullResult.Location,
                thumbnailUrl: thumbResult.Location,
            };
        }
        async create(createScreenshotDto) {
            // Create the main screenshot record with properly populated columns
            const screenshot = this.screenshotsRepository.create({
                ...(createScreenshotDto.id && { id: createScreenshotDto.id }), // Use provided ID if available
                userId: createScreenshotDto.userId,
                sessionId: createScreenshotDto.sessionId, // Direct relationship to session
                url: createScreenshotDto.url,
                thumbnailUrl: createScreenshotDto.thumbnailUrl,
                capturedAt: createScreenshotDto.capturedAt,
                mode: createScreenshotDto.mode,
                notes: createScreenshotDto.notes || "", // Copy of session task
            });
            const savedScreenshot = await this.screenshotsRepository.save(screenshot);
            return savedScreenshot;
        }
        async findByUser(userId, startDate, endDate, includeDeviceInfo = false) {
            console.log(`📸 Finding screenshots for userId: ${userId}, startDate: ${startDate?.toISOString()}, endDate: ${endDate?.toISOString()}`);
            const query = this.screenshotsRepository
                .createQueryBuilder("screenshot")
                .leftJoinAndSelect("screenshot.activityPeriods", "activityPeriod")
                .where("screenshot.userId = :userId", { userId })
                .andWhere("(screenshot.isDeleted IS NULL OR screenshot.isDeleted = :isDeleted)", { isDeleted: false });
            // Include session relation to get device info if requested
            if (includeDeviceInfo) {
                query.leftJoinAndSelect("screenshot.session", "session");
            }
            if (startDate) {
                query.andWhere("screenshot.capturedAt >= :startDate", { startDate });
            }
            if (endDate) {
                query.andWhere("screenshot.capturedAt <= :endDate", { endDate });
            }
            const screenshots = await query.getMany();
            console.log(`📸 Found ${screenshots.length} screenshots`);
            // Map to include device info and calculate average activity score
            return screenshots.map((screenshot) => {
                const activityPeriods = screenshot.activityPeriods || [];
                const validPeriods = activityPeriods.filter(p => p.isValid);
                const activityScore = validPeriods.length > 0
                    ? validPeriods.reduce((sum, p) => sum + p.activityScore, 0) / validPeriods.length
                    : 0;
                return {
                    ...screenshot,
                    activityScore,
                    deviceInfo: includeDeviceInfo ? (screenshot.session?.deviceInfo || null) : undefined,
                    activityPeriods: undefined,
                };
            });
        }
        async findById(id) {
            return this.screenshotsRepository.findOne({ where: { id } });
        }
        async findByIdWithDetails(id) {
            return this.screenshotsRepository.findOne({
                where: { id },
                relations: ['activityPeriods'],
                order: {
                    activityPeriods: {
                        periodEnd: 'ASC'
                    }
                }
            });
        }
        async generateViewSignedUrl(s3Url) {
            const s3 = this.getS3Client();
            console.log('🔍 Generating signed URL for:', s3Url);
            // Extract both bucket and key from the URL
            // URL format: https://bucket.s3.region.amazonaws.com/key
            let bucket;
            let key;
            if (s3Url.includes(".s3.")) {
                // Standard S3 URL format: https://bucket.s3.region.amazonaws.com/key
                const urlParts = s3Url.split(".s3.");
                if (urlParts.length === 2) {
                    // Extract bucket name from the first part
                    bucket = urlParts[0].replace('https://', '');
                    // Extract key from after .amazonaws.com/
                    const afterDomain = s3Url.split(".amazonaws.com/");
                    if (afterDomain.length === 2) {
                        key = decodeURIComponent(afterDomain[1]);
                    }
                    else {
                        throw new Error("Invalid S3 URL format");
                    }
                }
                else {
                    throw new Error("Invalid S3 URL format");
                }
            }
            else if (s3Url.includes("s3.amazonaws.com")) {
                // Alternative S3 URL format
                const urlParts = s3Url.split("s3.amazonaws.com/")[1];
                const keyParts = urlParts.split("/");
                bucket = keyParts.shift(); // First part is bucket name
                key = decodeURIComponent(keyParts.join("/"));
            }
            else {
                // Fallback to environment bucket if URL format is not recognized
                const stage = process.env.STAGE || "dev";
                bucket = process.env.SCREENSHOTS_BUCKET || `ppv1-screenshots-${stage}`;
                key = s3Url;
            }
            console.log('🔑 Extracted key:', key);
            console.log('🪣 Bucket:', bucket);
            // Generate a signed URL for viewing (GET request)
            const signedUrl = await s3.getSignedUrlPromise("getObject", {
                Bucket: bucket,
                Key: key,
                Expires: 300, // URL expires in 5 minutes
            });
            console.log('✅ Generated signed URL:', signedUrl);
            return signedUrl;
        }
        async softDelete(id) {
            console.log("\n\n\n\t\t\t\Deleting screenshot:", { id });
            // Hard delete the screenshot from database
            await this.screenshotsRepository.delete({ id });
        }
        async deleteActivityPeriods(screenshotId) {
            // Delete all activity periods associated with this screenshot
            await this.activityPeriodsRepository.delete({ screenshotId });
        }
    };
    __setFunctionName(_classThis, "ScreenshotsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ScreenshotsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ScreenshotsService = _classThis;
})();
exports.ScreenshotsService = ScreenshotsService;
//# sourceMappingURL=screenshots.service.js.map