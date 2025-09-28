"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileDropdown = ProfileDropdown;
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const AuthContext_1 = require("../contexts/AuthContext");
const lucide_react_1 = require("lucide-react");
function ProfileDropdown({ user }) {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const { logout } = (0, AuthContext_1.useAuth)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };
    const handleSettings = () => {
        setIsOpen(false);
        navigate('/settings');
    };
    return (<div className="relative z-50">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
          {user?.name?.[0] || user?.email?.[0] || 'A'}
        </div>
        <span className="text-sm font-medium text-gray-700">{user?.name || user?.email || 'Admin'}</span>
        <lucide_react_1.ChevronDown className="w-4 h-4 text-gray-500"/>
      </button>

      {isOpen && (<>
          <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)}/>
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[70]">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
            </div>

            <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3" onClick={handleSettings}>
              <lucide_react_1.Settings className="w-4 h-4"/>
              Settings
            </button>

            <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3" onClick={handleLogout}>
              <lucide_react_1.LogOut className="w-4 h-4"/>
              Sign Out
            </button>
          </div>
        </>)}
    </div>);
}
//# sourceMappingURL=ProfileDropdown.js.map