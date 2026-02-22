import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface CaptchaProps {
  onVerified: (verified: boolean) => void;
  reset?: number; // increment to force a new challenge
}

function generateChallenge() {
  const ops = ["+", "-", "×"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a: number;
  let b: number;
  let answer: number;

  if (op === "+") {
    a = Math.floor(Math.random() * 9) + 1;
    b = Math.floor(Math.random() * 9) + 1;
    answer = a + b;
  } else if (op === "-") {
    a = Math.floor(Math.random() * 8) + 3;
    b = Math.floor(Math.random() * (a - 1)) + 1;
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 5) + 2;
    b = Math.floor(Math.random() * 5) + 2;
    answer = a * b;
  }

  return { question: `${a} ${op} ${b} = ?`, answer };
}

export function Captcha({ onVerified, reset }: CaptchaProps) {
  const [challenge, setChallenge] = useState(generateChallenge);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");

  // Refresh challenge whenever the parent increments `reset`
  useEffect(() => {
    if (reset !== undefined) {
      setChallenge(generateChallenge());
      setInput("");
      setStatus("idle");
      onVerified(false);
    }
  }, [reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    setChallenge(generateChallenge());
    setInput("");
    setStatus("idle");
    onVerified(false);
  }, [onVerified]);

  const handleChange = (value: string) => {
    setInput(value);
    const num = parseInt(value.trim(), 10);
    if (!isNaN(num)) {
      if (num === challenge.answer) {
        setStatus("correct");
        onVerified(true);
      } else {
        setStatus("wrong");
        onVerified(false);
      }
    } else {
      setStatus("idle");
      onVerified(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          CAPTCHA – prove you&apos;re human
        </span>
        <button
          type="button"
          onClick={refresh}
          className="text-xs text-blue-500 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
          aria-label="New challenge"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v6h6M20 20v-6h-6M4.93 19.07A10 10 0 1 0 4 13"
            />
          </svg>
          New challenge
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Challenge display */}
        <div className="shrink-0 min-w-24 text-center bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 select-none">
          <span
            className="font-mono text-lg font-bold tracking-widest text-gray-800 dark:text-white"
            style={{ letterSpacing: "0.15em" }}
          >
            {challenge.question}
          </span>
        </div>

        {/* Answer input */}
        <div className="flex-1 relative">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Your answer"
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            className={`bg-white dark:bg-gray-700 border text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 transition ${
              status === "correct"
                ? "border-green-500 focus:ring-green-400"
                : status === "wrong"
                  ? "border-red-400 focus:ring-red-400"
                  : "border-gray-300 dark:border-gray-600 focus:ring-blue-400"
            }`}
            aria-label="CAPTCHA answer"
          />
        </div>

        {/* Status icon */}
        {status === "correct" && (
          <svg
            className="w-5 h-5 text-green-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {status === "wrong" && (
          <svg
            className="w-5 h-5 text-red-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </div>

      {status === "wrong" && input.trim() !== "" && (
        <p className="text-xs text-red-500 dark:text-red-400">
          Incorrect – try again or click &quot;New challenge&quot;.
        </p>
      )}
    </div>
  );
}
