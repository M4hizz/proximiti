import { useState } from "react";
import { Shield, ShieldCheck, ShieldOff, Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import authApi from "@/lib/authApi";
import { useAuth } from "@/App";

interface TwoFactorSetupProps {
  totpEnabled: boolean;
  onStatusChange?: (enabled: boolean) => void;
}

export function TwoFactorSetup({
  totpEnabled,
  onStatusChange,
}: TwoFactorSetupProps) {
  const auth = useAuth();
  const [phase, setPhase] = useState<"idle" | "setup" | "disabling">("idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await authApi.totpSetup();
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setCode("");
      setPhase("setup");
    } catch (err: any) {
      setError(err.message || "Failed to generate setup QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code from Google Authenticator");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.totpEnable(code);
      // Server revoked all sessions — clear the local token too
      authApi.setStoredToken(null);
      setSuccess(
        "Two-factor authentication enabled! You'll be signed out now — please log back in with your authenticator code.",
      );
      setPhase("idle");
      setCode("");
      setQrCodeDataUrl("");
      setSecret("");
      onStatusChange?.(true);
      // Give the user a moment to read the message, then force re-login
      setTimeout(() => auth.logout(), 2500);
    } catch (err: any) {
      setError(err.message || "Invalid code – try again");
    } finally {
      setLoading(false);
    }
  };

  const handleStartDisable = () => {
    setPhase("disabling");
    setCode("");
    setError("");
    setSuccess("");
  };

  const handleDisable = async () => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code to confirm");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.totpDisable(code);
      setSuccess("Two-factor authentication has been disabled.");
      setPhase("idle");
      setCode("");
      onStatusChange?.(false);
    } catch (err: any) {
      setError(err.message || "Invalid code – try again");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPhase("idle");
    setCode("");
    setError("");
    setSuccess("");
    setQrCodeDataUrl("");
    setSecret("");
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        {totpEnabled ? (
          <ShieldCheck className="h-6 w-6 text-green-500" />
        ) : (
          <Shield className="h-6 w-6 text-gray-400" />
        )}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">
            Two-Factor Authentication
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totpEnabled
              ? "Your account is protected with Google Authenticator."
              : "Add an extra layer of security to your account."}
          </p>
        </div>
        <span
          className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
            totpEnabled
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          }`}
        >
          {totpEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {/* Status messages */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Idle state – show action button */}
      {phase === "idle" && (
        <div>
          {totpEnabled ? (
            <Button
              variant="outline"
              onClick={handleStartDisable}
              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Disable 2FA
            </Button>
          ) : (
            <Button onClick={handleStartSetup} disabled={loading}>
              {loading ? "Loading…" : "Set up Google Authenticator"}
            </Button>
          )}
        </div>
      )}

      {/* Setup phase – show QR code */}
      {phase === "setup" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>Step 1:</strong> Open <strong>Google Authenticator</strong>{" "}
            on your phone and tap <strong>+</strong> → <em>Scan a QR code</em>.
          </p>

          {qrCodeDataUrl && (
            <div className="flex justify-center">
              <img
                src={qrCodeDataUrl}
                alt="TOTP QR Code"
                className="rounded-lg border border-gray-200 dark:border-gray-600 shadow"
                style={{ width: 220, height: 220 }}
              />
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Can't scan?</strong> Enter this key manually in the app:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg text-sm font-mono tracking-widest text-gray-700 dark:text-gray-300 break-all">
                {secret}
              </code>
              <button
                onClick={copySecret}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Copy secret"
              >
                {copied ? (
                  <CheckCheck className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Step 2:</strong> Enter the 6-digit code shown in the app
              to confirm setup:
            </p>
            <Label htmlFor="totp-code-enable">6-digit code</Label>
            <Input
              id="totp-code-enable"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="text-center text-lg tracking-[0.4em] font-mono"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleEnable}
              disabled={loading || code.length !== 6}
              className="flex-1"
            >
              {loading ? "Verifying…" : "Confirm & Enable 2FA"}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Disabling phase */}
      {phase === "disabling" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter the current 6-digit code from{" "}
            <strong>Google Authenticator</strong> to disable 2FA:
          </p>
          <div className="space-y-2">
            <Label htmlFor="totp-code-disable">6-digit code</Label>
            <Input
              id="totp-code-disable"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="text-center text-lg tracking-[0.4em] font-mono"
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleDisable}
              disabled={loading || code.length !== 6}
              variant="outline"
              className="flex-1 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-700 dark:hover:bg-red-900/20"
            >
              {loading ? "Verifying…" : "Disable 2FA"}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
