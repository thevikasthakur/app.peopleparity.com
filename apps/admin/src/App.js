"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_router_dom_1 = require("react-router-dom");
const react_query_1 = require("@tanstack/react-query");
const AuthContext_1 = require("./contexts/AuthContext");
const Login_1 = require("./pages/Login");
const Dashboard_1 = require("./pages/Dashboard");
const Settings_1 = require("./pages/Settings");
const ProtectedRoute_1 = require("./components/ProtectedRoute");
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30 * 1000, // 30 seconds
        },
    },
});
function App() {
    return (<react_query_1.QueryClientProvider client={queryClient}>
      <AuthContext_1.AuthProvider>
        <react_router_dom_1.BrowserRouter>
          <react_router_dom_1.Routes>
            <react_router_dom_1.Route path="/login" element={<Login_1.Login />}/>
            <react_router_dom_1.Route path="/dashboard" element={<ProtectedRoute_1.ProtectedRoute>
                  <Dashboard_1.Dashboard />
                </ProtectedRoute_1.ProtectedRoute>}/>
            <react_router_dom_1.Route path="/settings" element={<ProtectedRoute_1.ProtectedRoute>
                  <Settings_1.Settings />
                </ProtectedRoute_1.ProtectedRoute>}/>
            <react_router_dom_1.Route path="/" element={<react_router_dom_1.Navigate to="/dashboard" replace/>}/>
          </react_router_dom_1.Routes>
        </react_router_dom_1.BrowserRouter>
      </AuthContext_1.AuthProvider>
    </react_query_1.QueryClientProvider>);
}
exports.default = App;
//# sourceMappingURL=App.js.map