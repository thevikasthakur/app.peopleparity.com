import { ReactNode } from 'react';
interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
    isAdmin?: boolean;
    isDeveloper?: boolean;
    timezone?: string;
}
interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useAuth(): AuthContextType;
export {};
//# sourceMappingURL=AuthContext.d.ts.map