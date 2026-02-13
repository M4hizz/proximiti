import { LoginForm } from "@/components/login-form";
import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

export function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-cherry-rose rounded-lg">
          <Compass className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proximiti</h1>
      </Link>
      <LoginForm />
    </div>
  );
}

export default LoginPage;
