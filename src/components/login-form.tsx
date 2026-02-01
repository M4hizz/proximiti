import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = isLogin ? 'http://localhost:3001/login' : 'http://localhost:3001/register';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const message = await response.text();
      alert(message);
      if (response.ok && isLogin) {
        auth.login({ username });
        navigate("/");
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred');
    }
  };

  return (
    <div className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">{isLogin ? 'Welcome back' : 'Create account'}</h2>
        <p className="text-gray-400 mt-1">
          Enter your credentials to {isLogin ? 'sign in' : 'get started'}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-gray-300">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-300">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white">
          {isLogin ? 'Sign In' : 'Create Account'}
        </Button>
      </form>
      <div className="mt-6 text-center text-sm text-gray-400">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="text-green-400 hover:text-green-300 font-medium"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </div>
    </div>
  );
}
