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
exports.Screenshot = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const activity_period_entity_1 = require("./activity-period.entity");
let Screenshot = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)('screenshots')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _userId_decorators;
    let _userId_initializers = [];
    let _userId_extraInitializers = [];
    let _user_decorators;
    let _user_initializers = [];
    let _user_extraInitializers = [];
    let _activityPeriodId_decorators;
    let _activityPeriodId_initializers = [];
    let _activityPeriodId_extraInitializers = [];
    let _activityPeriod_decorators;
    let _activityPeriod_initializers = [];
    let _activityPeriod_extraInitializers = [];
    let _s3Url_decorators;
    let _s3Url_initializers = [];
    let _s3Url_extraInitializers = [];
    let _thumbnailUrl_decorators;
    let _thumbnailUrl_initializers = [];
    let _thumbnailUrl_extraInitializers = [];
    let _capturedAt_decorators;
    let _capturedAt_initializers = [];
    let _capturedAt_extraInitializers = [];
    let _mode_decorators;
    let _mode_initializers = [];
    let _mode_extraInitializers = [];
    let _notes_decorators;
    let _notes_initializers = [];
    let _notes_extraInitializers = [];
    let _isDeleted_decorators;
    let _isDeleted_initializers = [];
    let _isDeleted_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    var Screenshot = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.userId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
            this.user = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.activityPeriodId = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _activityPeriodId_initializers, void 0));
            this.activityPeriod = (__runInitializers(this, _activityPeriodId_extraInitializers), __runInitializers(this, _activityPeriod_initializers, void 0));
            this.s3Url = (__runInitializers(this, _activityPeriod_extraInitializers), __runInitializers(this, _s3Url_initializers, void 0));
            this.thumbnailUrl = (__runInitializers(this, _s3Url_extraInitializers), __runInitializers(this, _thumbnailUrl_initializers, void 0));
            this.capturedAt = (__runInitializers(this, _thumbnailUrl_extraInitializers), __runInitializers(this, _capturedAt_initializers, void 0));
            this.mode = (__runInitializers(this, _capturedAt_extraInitializers), __runInitializers(this, _mode_initializers, void 0));
            this.notes = (__runInitializers(this, _mode_extraInitializers), __runInitializers(this, _notes_initializers, void 0));
            this.isDeleted = (__runInitializers(this, _notes_extraInitializers), __runInitializers(this, _isDeleted_initializers, void 0));
            this.createdAt = (__runInitializers(this, _isDeleted_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            __runInitializers(this, _createdAt_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "Screenshot");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryGeneratedColumn)('uuid')];
        _userId_decorators = [(0, typeorm_1.Column)()];
        _user_decorators = [(0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.screenshots), (0, typeorm_1.JoinColumn)({ name: 'userId' })];
        _activityPeriodId_decorators = [(0, typeorm_1.Column)()];
        _activityPeriod_decorators = [(0, typeorm_1.ManyToOne)(() => activity_period_entity_1.ActivityPeriod, period => period.screenshots), (0, typeorm_1.JoinColumn)({ name: 'activityPeriodId' })];
        _s3Url_decorators = [(0, typeorm_1.Column)()];
        _thumbnailUrl_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _capturedAt_decorators = [(0, typeorm_1.Column)({ type: 'timestamp' })];
        _mode_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: ['client_hours', 'command_hours']
            })];
        _notes_decorators = [(0, typeorm_1.Column)({ nullable: true })];
        _isDeleted_decorators = [(0, typeorm_1.Column)({ default: false })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: obj => "user" in obj, get: obj => obj.user, set: (obj, value) => { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _activityPeriodId_decorators, { kind: "field", name: "activityPeriodId", static: false, private: false, access: { has: obj => "activityPeriodId" in obj, get: obj => obj.activityPeriodId, set: (obj, value) => { obj.activityPeriodId = value; } }, metadata: _metadata }, _activityPeriodId_initializers, _activityPeriodId_extraInitializers);
        __esDecorate(null, null, _activityPeriod_decorators, { kind: "field", name: "activityPeriod", static: false, private: false, access: { has: obj => "activityPeriod" in obj, get: obj => obj.activityPeriod, set: (obj, value) => { obj.activityPeriod = value; } }, metadata: _metadata }, _activityPeriod_initializers, _activityPeriod_extraInitializers);
        __esDecorate(null, null, _s3Url_decorators, { kind: "field", name: "s3Url", static: false, private: false, access: { has: obj => "s3Url" in obj, get: obj => obj.s3Url, set: (obj, value) => { obj.s3Url = value; } }, metadata: _metadata }, _s3Url_initializers, _s3Url_extraInitializers);
        __esDecorate(null, null, _thumbnailUrl_decorators, { kind: "field", name: "thumbnailUrl", static: false, private: false, access: { has: obj => "thumbnailUrl" in obj, get: obj => obj.thumbnailUrl, set: (obj, value) => { obj.thumbnailUrl = value; } }, metadata: _metadata }, _thumbnailUrl_initializers, _thumbnailUrl_extraInitializers);
        __esDecorate(null, null, _capturedAt_decorators, { kind: "field", name: "capturedAt", static: false, private: false, access: { has: obj => "capturedAt" in obj, get: obj => obj.capturedAt, set: (obj, value) => { obj.capturedAt = value; } }, metadata: _metadata }, _capturedAt_initializers, _capturedAt_extraInitializers);
        __esDecorate(null, null, _mode_decorators, { kind: "field", name: "mode", static: false, private: false, access: { has: obj => "mode" in obj, get: obj => obj.mode, set: (obj, value) => { obj.mode = value; } }, metadata: _metadata }, _mode_initializers, _mode_extraInitializers);
        __esDecorate(null, null, _notes_decorators, { kind: "field", name: "notes", static: false, private: false, access: { has: obj => "notes" in obj, get: obj => obj.notes, set: (obj, value) => { obj.notes = value; } }, metadata: _metadata }, _notes_initializers, _notes_extraInitializers);
        __esDecorate(null, null, _isDeleted_decorators, { kind: "field", name: "isDeleted", static: false, private: false, access: { has: obj => "isDeleted" in obj, get: obj => obj.isDeleted, set: (obj, value) => { obj.isDeleted = value; } }, metadata: _metadata }, _isDeleted_initializers, _isDeleted_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Screenshot = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Screenshot = _classThis;
})();
exports.Screenshot = Screenshot;
//# sourceMappingURL=screenshot.entity.js.map