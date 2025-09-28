"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const axios_1 = __importDefault(require("axios"));
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
exports.authService = {
    async login(email, password) {
        const response = await axios_1.default.post(`${API_URL}/api/auth/login`, {
            email,
            password,
        });
        return response.data;
    },
    async getCurrentUser(token) {
        try {
            // Try verify endpoint first (seems to be what the API uses)
            const response = await axios_1.default.get(`${API_URL}/api/auth/verify`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            // Return user data from verify response
            if (response.data?.valid && response.data?.user) {
                return response.data.user;
            }
            // If verify doesn't return user data, return a default
            return {
                id: response.data?.userId || 'unknown',
                email: response.data?.email || 'user@example.com',
                name: response.data?.name || 'User',
                role: 'developer' // Default to developer role
            };
        }
        catch (error) {
            console.error('Failed to get current user:', error);
            throw error;
        }
    },
    async logout() {
        localStorage.removeItem('auth_token');
    },
};
//# sourceMappingURL=authService.js.map