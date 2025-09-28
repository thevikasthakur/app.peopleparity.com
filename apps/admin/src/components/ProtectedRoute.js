"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectedRoute = ProtectedRoute;
const react_1 = __importDefault(require("react"));
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("../contexts/AuthContext");
const lucide_react_1 = require("lucide-react");
function ProtectedRoute({ children }) {
    const { isAuthenticated, isLoading } = (0, AuthContext_1.useAuth)();
    if (isLoading) {
        return (<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <lucide_react_1.Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4"/>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>);
    }
    if (!isAuthenticated) {
        return <react_router_dom_1.Navigate to="/login" replace/>;
    }
    return <>{children}</>;
}
//# sourceMappingURL=ProtectedRoute.js.map