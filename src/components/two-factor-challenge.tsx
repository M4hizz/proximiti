import { useState, useRef, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import authApi from "@/lib/authApi";

interface TwoFactorChallengeProps {
  challengeToken: string;
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

export function TwoFactorChallenge({
  challengeToken,
  onSuccess,
  onCancel,
}: TwoFactorChallengeProps) {
  const [codes, setCodes] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCodes = [...codes];
    newCodes[index] = digit;
    setCodes(newCodes);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newCodes = [...codes];
    for (let i = 0; i < 6; i++) {
      newCodes[i] = pasted[i] || "";
    }
    setCodes(newCodes);
    const nextEmpty = pasted.length < 6 ? pasted.length : 5;
    inputRefs.current[nextEmpty]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codes.join("");
    if (code.length !== 6) {
      setError("Enter all 6 digits");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await authApi.totpLogin(challengeToken, code);
      onSuccess(result.user);
    } catch (err: any) {
      setError(err.message || "Invalid code – please try again");
      setCodes(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-lg">
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="rounded-full bg-blue-100 dark:bg-blue-900/40 p-3">
          <ShieldCheck className="h-7 w-7 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Two-Factor Authentication
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Open <strong>Google Authenticator</strong> and enter the 6-digit code
          for your account.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* OTP digit boxes */}
        <div className="flex justify-center gap-2">
          {codes.map((digit, i) => (
            <Input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="w-11 h-12 text-center text-xl font-mono font-bold"
              autoComplete={i === 0 ? "one-time-code" : "off"}
            />
          ))}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loading || codes.join("").length !== 6}
        >
          {loading ? "Verifying…" : "Verify"}
        </Button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          Back to login
        </button>
      </form>
    </div>
  );
}
