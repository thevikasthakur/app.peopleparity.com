"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
const react_1 = require("react");
const authService_1 = require("../services/authService");
const AuthContext = (0, react_1.createContext)(undefined);
function AuthProvider({ children }) {
    const [user, setUser] = (0, react_1.useState)(null);
    const [token, setToken] = (0, react_1.useState)(localStorage.getItem('auth_token'));
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        // Check if user is already logged in
        const checkAuth = async () => {
            const savedToken = localStorage.getItem('auth_token');
            if (savedToken) {
                try {
                    const userData = await authService_1.authService.getCurrentUser(savedToken);
                    // Determine user type based on role
                    const isAdminRole = userData.role === 'super_admin' || userData.role === 'org_admin';
                    const enrichedUserData = {
                        ...userData,
                        isDeveloper: userData.role === 'developer',
                        isAdmin: isAdminRole
                    };
                    console.log('CheckAuth - User role:', userData.role, 'isAdmin:', isAdminRole, 'userData:', enrichedUserData);
                    setUser(enrichedUserData);
                    setToken(savedToken);
                }
                catch (error) {
                    console.error('Failed to validate token:', error);
                    localStorage.removeItem('auth_token');
                    setToken(null);
                }
            }
            setIsLoading(false);
        };
        checkAuth();
    }, []);
    const login = (0, react_1.useCallback)(async (email, password) => {
        const response = await authService_1.authService.login(email, password);
        if (response.token && response.user) {
            localStorage.setItem('auth_token', response.token);
            setToken(response.token);
            // Determine user type based on role
            const isAdminRole = response.user.role === 'super_admin' || response.user.role === 'org_admin';
            const userData = {
                ...response.user,
                isDeveloper: response.user.role === 'developer',
                isAdmin: isAdminRole
            };
            console.log('Login - User role:', response.user.role, 'isAdmin:', isAdminRole, 'userData:', userData);
            setUser(userData);
        }
        else {
            throw new Error('Invalid login response');
        }
    }, []);
    const logout = (0, react_1.useCallback)(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
    }, []);
    const refreshUser = (0, react_1.useCallback)(async () => {
        const currentToken = token || localStorage.getItem('auth_token');
        if (currentToken) {
            try {
                const userData = await authService_1.authService.getCurrentUser(currentToken);
                const isAdminRole = userData.role === 'super_admin' || userData.role === 'org_admin';
                const enrichedUserData = {
                    ...userData,
                    isDeveloper: userData.role === 'developer',
                    isAdmin: isAdminRole
                };
                setUser(enrichedUserData);
            }
            catch (error) {
                console.error('Failed to refresh user data:', error);
            }
        }
    }, [token]);
    const value = {
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
    };
    return (<AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>);
}
function useAuth() {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
//# sourceMappingURL=AuthContext.js.map