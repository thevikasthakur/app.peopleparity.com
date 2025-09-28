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
exports.Session = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const project_entity_1 = require("./project.entity");
const activity_period_entity_1 = require("./activity-period.entity");
const screenshot_entity_1 = require("./screenshot.entity");
let Session = (() => {
    let _classDecorators = [(0, typeorm_1.Entity)('sessions')];
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
    let _projectId_decorators;
    let _projectId_initializers = [];
    let _projectId_extraInitializers = [];
    let _project_decorators;
    let _project_initializers = [];
    let _project_extraInitializers = [];
    let _mode_decorators;
    let _mode_initializers = [];
    let _mode_extraInitializers = [];
    let _startTime_decorators;
    let _startTime_initializers = [];
    let _startTime_extraInitializers = [];
    let _endTime_decorators;
    let _endTime_initializers = [];
    let _endTime_extraInitializers = [];
    let _isActive_decorators;
    let _isActive_initializers = [];
    let _isActive_extraInitializers = [];
    let _task_decorators;
    let _task_initializers = [];
    let _task_extraInitializers = [];
    let _appVersion_decorators;
    let _appVersion_initializers = [];
    let _appVersion_extraInitializers = [];
    let _deviceInfo_decorators;
    let _deviceInfo_initializers = [];
    let _deviceInfo_extraInitializers = [];
    let _realIpAddress_decorators;
    let _realIpAddress_initializers = [];
    let _realIpAddress_extraInitializers = [];
    let _location_decorators;
    let _location_initializers = [];
    let _location_extraInitializers = [];
    let _isVpnDetected_decorators;
    let _isVpnDetected_initializers = [];
    let _isVpnDetected_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _updatedAt_decorators;
    let _updatedAt_initializers = [];
    let _updatedAt_extraInitializers = [];
    let _activityPeriods_decorators;
    let _activityPeriods_initializers = [];
    let _activityPeriods_extraInitializers = [];
    let _screenshots_decorators;
    let _screenshots_initializers = [];
    let _screenshots_extraInitializers = [];
    var Session = _classThis = class {
        constructor() {
            this.id = __runInitializers(this, _id_initializers, void 0);
            this.userId = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _userId_initializers, void 0));
            this.user = (__runInitializers(this, _userId_extraInitializers), __runInitializers(this, _user_initializers, void 0));
            this.projectId = (__runInitializers(this, _user_extraInitializers), __runInitializers(this, _projectId_initializers, void 0));
            this.project = (__runInitializers(this, _projectId_extraInitializers), __runInitializers(this, _project_initializers, void 0));
            this.mode = (__runInitializers(this, _project_extraInitializers), __runInitializers(this, _mode_initializers, void 0));
            this.startTime = (__runInitializers(this, _mode_extraInitializers), __runInitializers(this, _startTime_initializers, void 0));
            this.endTime = (__runInitializers(this, _startTime_extraInitializers), __runInitializers(this, _endTime_initializers, void 0));
            this.isActive = (__runInitializers(this, _endTime_extraInitializers), __runInitializers(this, _isActive_initializers, void 0));
            this.task = (__runInitializers(this, _isActive_extraInitializers), __runInitializers(this, _task_initializers, void 0));
            this.appVersion = (__runInitializers(this, _task_extraInitializers), __runInitializers(this, _appVersion_initializers, void 0));
            this.deviceInfo = (__runInitializers(this, _appVersion_extraInitializers), __runInitializers(this, _deviceInfo_initializers, void 0)); // Stores hostname of the device
            this.realIpAddress = (__runInitializers(this, _deviceInfo_extraInitializers), __runInitializers(this, _realIpAddress_initializers, void 0));
            this.location = (__runInitializers(this, _realIpAddress_extraInitializers), __runInitializers(this, _location_initializers, void 0));
            this.isVpnDetected = (__runInitializers(this, _location_extraInitializers), __runInitializers(this, _isVpnDetected_initializers, void 0));
            this.createdAt = (__runInitializers(this, _isVpnDetected_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
            this.updatedAt = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _updatedAt_initializers, void 0));
            this.activityPeriods = (__runInitializers(this, _updatedAt_extraInitializers), __runInitializers(this, _activityPeriods_initializers, void 0));
            this.screenshots = (__runInitializers(this, _activityPeriods_extraInitializers), __runInitializers(this, _screenshots_initializers, void 0));
            __runInitializers(this, _screenshots_extraInitializers);
        }
    };
    __setFunctionName(_classThis, "Session");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _id_decorators = [(0, typeorm_1.PrimaryColumn)('uuid')];
        _userId_decorators = [(0, typeorm_1.Column)({ type: 'uuid' })];
        _user_decorators = [(0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.sessions), (0, typeorm_1.JoinColumn)({ name: 'userId' })];
        _projectId_decorators = [(0, typeorm_1.Column)({ type: 'varchar', nullable: true })];
        _project_decorators = [(0, typeorm_1.ManyToOne)(() => project_entity_1.Project, project => project.sessions, { nullable: true }), (0, typeorm_1.JoinColumn)({ name: 'projectId' })];
        _mode_decorators = [(0, typeorm_1.Column)({
                type: 'enum',
                enum: ['client_hours', 'command_hours']
            })];
        _startTime_decorators = [(0, typeorm_1.Column)({ type: 'timestamp' })];
        _endTime_decorators = [(0, typeorm_1.Column)({ type: 'timestamp', nullable: true })];
        _isActive_decorators = [(0, typeorm_1.Column)({ type: 'boolean', default: true })];
        _task_decorators = [(0, typeorm_1.Column)({ type: 'varchar', nullable: true })];
        _appVersion_decorators = [(0, typeorm_1.Column)({ type: 'varchar', nullable: true })];
        _deviceInfo_decorators = [(0, typeorm_1.Column)({ type: 'text', nullable: true })];
        _realIpAddress_decorators = [(0, typeorm_1.Column)({ type: 'varchar', nullable: true, length: 45 })];
        _location_decorators = [(0, typeorm_1.Column)({ type: 'jsonb', nullable: true })];
        _isVpnDetected_decorators = [(0, typeorm_1.Column)({ type: 'boolean', default: false })];
        _createdAt_decorators = [(0, typeorm_1.CreateDateColumn)()];
        _updatedAt_decorators = [(0, typeorm_1.UpdateDateColumn)()];
        _activityPeriods_decorators = [(0, typeorm_1.OneToMany)(() => activity_period_entity_1.ActivityPeriod, period => period.session)];
        _screenshots_decorators = [(0, typeorm_1.OneToMany)(() => screenshot_entity_1.Screenshot, screenshot => screenshot.session)];
        __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: obj => "userId" in obj, get: obj => obj.userId, set: (obj, value) => { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: obj => "user" in obj, get: obj => obj.user, set: (obj, value) => { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _projectId_decorators, { kind: "field", name: "projectId", static: false, private: false, access: { has: obj => "projectId" in obj, get: obj => obj.projectId, set: (obj, value) => { obj.projectId = value; } }, metadata: _metadata }, _projectId_initializers, _projectId_extraInitializers);
        __esDecorate(null, null, _project_decorators, { kind: "field", name: "project", static: false, private: false, access: { has: obj => "project" in obj, get: obj => obj.project, set: (obj, value) => { obj.project = value; } }, metadata: _metadata }, _project_initializers, _project_extraInitializers);
        __esDecorate(null, null, _mode_decorators, { kind: "field", name: "mode", static: false, private: false, access: { has: obj => "mode" in obj, get: obj => obj.mode, set: (obj, value) => { obj.mode = value; } }, metadata: _metadata }, _mode_initializers, _mode_extraInitializers);
        __esDecorate(null, null, _startTime_decorators, { kind: "field", name: "startTime", static: false, private: false, access: { has: obj => "startTime" in obj, get: obj => obj.startTime, set: (obj, value) => { obj.startTime = value; } }, metadata: _metadata }, _startTime_initializers, _startTime_extraInitializers);
        __esDecorate(null, null, _endTime_decorators, { kind: "field", name: "endTime", static: false, private: false, access: { has: obj => "endTime" in obj, get: obj => obj.endTime, set: (obj, value) => { obj.endTime = value; } }, metadata: _metadata }, _endTime_initializers, _endTime_extraInitializers);
        __esDecorate(null, null, _isActive_decorators, { kind: "field", name: "isActive", static: false, private: false, access: { has: obj => "isActive" in obj, get: obj => obj.isActive, set: (obj, value) => { obj.isActive = value; } }, metadata: _metadata }, _isActive_initializers, _isActive_extraInitializers);
        __esDecorate(null, null, _task_decorators, { kind: "field", name: "task", static: false, private: false, access: { has: obj => "task" in obj, get: obj => obj.task, set: (obj, value) => { obj.task = value; } }, metadata: _metadata }, _task_initializers, _task_extraInitializers);
        __esDecorate(null, null, _appVersion_decorators, { kind: "field", name: "appVersion", static: false, private: false, access: { has: obj => "appVersion" in obj, get: obj => obj.appVersion, set: (obj, value) => { obj.appVersion = value; } }, metadata: _metadata }, _appVersion_initializers, _appVersion_extraInitializers);
        __esDecorate(null, null, _deviceInfo_decorators, { kind: "field", name: "deviceInfo", static: false, private: false, access: { has: obj => "deviceInfo" in obj, get: obj => obj.deviceInfo, set: (obj, value) => { obj.deviceInfo = value; } }, metadata: _metadata }, _deviceInfo_initializers, _deviceInfo_extraInitializers);
        __esDecorate(null, null, _realIpAddress_decorators, { kind: "field", name: "realIpAddress", static: false, private: false, access: { has: obj => "realIpAddress" in obj, get: obj => obj.realIpAddress, set: (obj, value) => { obj.realIpAddress = value; } }, metadata: _metadata }, _realIpAddress_initializers, _realIpAddress_extraInitializers);
        __esDecorate(null, null, _location_decorators, { kind: "field", name: "location", static: false, private: false, access: { has: obj => "location" in obj, get: obj => obj.location, set: (obj, value) => { obj.location = value; } }, metadata: _metadata }, _location_initializers, _location_extraInitializers);
        __esDecorate(null, null, _isVpnDetected_decorators, { kind: "field", name: "isVpnDetected", static: false, private: false, access: { has: obj => "isVpnDetected" in obj, get: obj => obj.isVpnDetected, set: (obj, value) => { obj.isVpnDetected = value; } }, metadata: _metadata }, _isVpnDetected_initializers, _isVpnDetected_extraInitializers);
        __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
        __esDecorate(null, null, _updatedAt_decorators, { kind: "field", name: "updatedAt", static: false, private: false, access: { has: obj => "updatedAt" in obj, get: obj => obj.updatedAt, set: (obj, value) => { obj.updatedAt = value; } }, metadata: _metadata }, _updatedAt_initializers, _updatedAt_extraInitializers);
        __esDecorate(null, null, _activityPeriods_decorators, { kind: "field", name: "activityPeriods", static: false, private: false, access: { has: obj => "activityPeriods" in obj, get: obj => obj.activityPeriods, set: (obj, value) => { obj.activityPeriods = value; } }, metadata: _metadata }, _activityPeriods_initializers, _activityPeriods_extraInitializers);
        __esDecorate(null, null, _screenshots_decorators, { kind: "field", name: "screenshots", static: false, private: false, access: { has: obj => "screenshots" in obj, get: obj => obj.screenshots, set: (obj, value) => { obj.screenshots = value; } }, metadata: _metadata }, _screenshots_initializers, _screenshots_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Session = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Session = _classThis;
})();
exports.Session = Session;
//# sourceMappingURL=session.entity.js.map