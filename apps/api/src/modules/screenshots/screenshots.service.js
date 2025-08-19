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
const sharp = __importStar(require("sharp"));
let ScreenshotsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ScreenshotsService = _classThis = class {
        constructor(screenshotsRepository, configService) {
            this.screenshotsRepository = screenshotsRepository;
            this.configService = configService;
            this.s3 = new AWS.S3({
                accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
                region: this.configService.get('AWS_REGION'),
            });
        }
        async uploadToS3(file, userId) {
            const bucket = this.configService.get('AWS_S3_BUCKET');
            const timestamp = Date.now();
            const baseKey = `screenshots/${userId}/${timestamp}`;
            // Create thumbnail (100px width, maintaining aspect ratio)
            const thumbnailBuffer = await sharp(file.buffer)
                .resize(250, null, {
                fit: 'inside',
                withoutEnlargement: false
            })
                .jpeg({ quality: 99 })
                .toBuffer();
            // Upload full-size image with public ACL
            const fullKey = `${baseKey}_full.jpg`;
            const fullParams = {
                Bucket: bucket,
                Key: fullKey,
                Body: file.buffer,
                ContentType: 'image/jpeg',
            };
            // Upload thumbnail with public ACL
            const thumbKey = `${baseKey}_thumb.jpg`;
            const thumbParams = {
                Bucket: bucket,
                Key: thumbKey,
                Body: thumbnailBuffer,
                ContentType: 'image/jpeg',
            };
            // Upload both versions in parallel
            const [fullResult, thumbResult] = await Promise.all([
                this.s3.upload(fullParams).promise(),
                this.s3.upload(thumbParams).promise(),
            ]);
            return {
                fullUrl: fullResult.Location,
                thumbnailUrl: thumbResult.Location,
            };
        }
        async create(createScreenshotDto) {
            const screenshot = this.screenshotsRepository.create(createScreenshotDto);
            return this.screenshotsRepository.save(screenshot);
        }
        async findByUser(userId, startDate, endDate) {
            const query = this.screenshotsRepository
                .createQueryBuilder('screenshot')
                .where('screenshot.userId = :userId', { userId })
                .andWhere('screenshot.isDeleted = :isDeleted', { isDeleted: false });
            if (startDate) {
                query.andWhere('screenshot.capturedAt >= :startDate', { startDate });
            }
            if (endDate) {
                query.andWhere('screenshot.capturedAt <= :endDate', { endDate });
            }
            return query.getMany();
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