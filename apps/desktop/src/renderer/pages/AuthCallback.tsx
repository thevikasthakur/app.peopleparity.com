import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loader2, AlertCircle } from "lucide-react";

export function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get("token");
      const success = searchParams.get('success');

      if (token && success === 'true') {
        try {
          // Verify token with backend and set user context
          await setToken(token);
          
          // Navigate to dashboard on success
          navigate("/dashboard");
        } catch (err) {
          console.error('Token verification failed:', err);
          setError('Authentication failed. Please try again.');
          
          // Redirect to login after error
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        }
      } else {
        // Handle failed authentication
        const errorMsg = searchParams.get('error') || 'Authentication was cancelled or failed';
        setError(errorMsg);
        
        // Redirect to login after showing error
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    };

    handleAuth();
  }, [searchParams, navigate, setToken]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Redirecting to login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">
          Authenticating...
        </h2>
        <p className="text-gray-500 mt-2">Please wait while we log you in.</p>
      </div>
    </div>
  );
}
