import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authApi from "@/lib/authApi";

// Declare Google type for TypeScript
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black';
            size?: 'large' | 'medium' | 'small';
            text?: 'signin_with' | 'signup_with' | 'continue_with';
            width?: string;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleInitialized, setGoogleInitialized] = useState(false);
  
  const auth = useAuth();
  const navigate = useNavigate();

  // Initialize Google OAuth
  useEffect(() => {
    const initializeGoogle = () => {
      if (googleInitialized) return;

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId || clientId === 'your-google-client-id') {
        console.warn('Google Client ID not configured. Email/password login is still available.');
        setGoogleInitialized(true); // Set to true to stop showing "loading"
        return;
      }

      if (!window.google) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false
        });

        const googleButton = document.getElementById('google-signin-button');
        if (googleButton) {
          window.google.accounts.id.renderButton(googleButton, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: '100%'
          });
        }

        setGoogleInitialized(true);
      } catch (error) {
        console.error('Google OAuth initialization error:', error);
        setGoogleInitialized(true); // Set to true to stop showing "loading"
      }
    };

    // Wait for Google script to load
    if (window.google) {
      initializeGoogle();
    } else {
      const checkGoogle = setInterval(() => {
        if (window.google) {
          initializeGoogle();
          clearInterval(checkGoogle);
        }
      }, 100);

      // Clean up interval after 5 seconds and mark as initialized
      setTimeout(() => {
        clearInterval(checkGoogle);
        if (!googleInitialized) {
          console.warn('Google Identity Services failed to load');
          setGoogleInitialized(true);
        }
      }, 5000);
    }
  }, [googleInitialized]);

  const handleGoogleResponse = async (response: { credential: string }) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await authApi.loginWithGoogle(response.credential);
      auth.login(result.user);
      navigate("/");
    } catch (error: any) {
      setError(error.message || 'Google sign-in failed');
      console.error('Google sign-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isLogin) {
        const result = await authApi.login({ email, password });
        auth.login(result.user);
        navigate("/");
      } else {
        if (!name.trim()) {
          throw new Error('Name is required');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long');
        }
        
        await authApi.register({ email, password, name: name.trim() });
        setError("");
        alert('Registration successful! Please sign in with your new account.');
        setIsLogin(true);
      }
    } catch (error: any) {
      setError(error.message || 'Authentication failed');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setEmail("");
    setPassword("");
    setName("");
  };

  return (
    <div className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">
          {isLogin ? 'Welcome back' : 'Create account'}
        </h2>
        <p className="text-gray-400 mt-1">
          {isLogin 
            ? 'Sign in to access your personalized business finder'
            : 'Join Proximiti to discover local businesses'
          }
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Google Sign-in Button */}
      <div className="mb-4">
        {!googleInitialized ? (
          <div className="w-full h-10 bg-gray-700 rounded animate-pulse flex items-center justify-center">
            <span className="text-gray-400 text-sm">Loading Google Sign-In...</span>
          </div>
        ) : (
          <>
            {import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your-google-client-id' ? (
              <div id="google-signin-button" className="w-full flex justify-center" />
            ) : (
              <div className="w-full p-3 bg-blue-600/20 border border-blue-600/50 rounded-lg text-center">
                <p className="text-blue-400 text-sm">
                  🔧 Google OAuth not configured
                </p>
                <p className="text-blue-300 text-xs mt-1">
                  Use email/password below or set up Google OAuth in .env
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Divider - only show if Google OAuth is available */}
      {googleInitialized && import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_ID !== 'your-google-client-id' && (
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-800 text-gray-400">Or continue with email</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLogin}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-300">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-300">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder={isLogin ? "Enter your password" : "Choose a secure password (8+ chars)"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-cherry-rose hover:bg-green-600 text-white disabled:opacity-50" 
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {isLogin ? 'Signing In...' : 'Creating Account...'}
            </div>
          ) : (
            isLogin ? 'Sign In' : 'Create Account'
          )}
        </Button>
      </form>
      
      <div className="mt-6 text-center text-sm text-gray-400">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="text-green-400 hover:text-green-300 font-medium"
          onClick={toggleMode}
          disabled={isLoading}
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </div>

      {/* Security Notice */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>🔒 Your data is protected with enterprise-grade security</p>
        {!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID === 'your-google-client-id' ? (
          <p className="mt-1 text-blue-400">
            💡 To enable Google Sign-In, see SECURITY_SETUP.md
          </p>
        ) : null}
      </div>
    </div>
  );
}
