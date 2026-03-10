import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

export function Login() {
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const { error: err } = await signInWithOtp(email.trim());
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[#a8d3ff] via-[#e8f3ff] to-[#fff4df]" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="flex items-center gap-2.5 mb-12 justify-center">
          <div className="w-2 h-2 bg-black" />
          <span className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm tracking-tight">
            WOSS Robotics
          </span>
        </div>

        <div className="bg-white border-2 border-black p-8 md:p-10">
          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
                  Sign In
                </p>
                <h1
                  className="font-['Source_Serif_4',serif] text-[32px] text-black tracking-[-1px] mb-2"
                  style={{ lineHeight: 1.1 }}
                >
                  Executive Applications
                </h1>
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base tracking-[-0.3px] mb-8">
                  Enter your school email. We'll send a sign-in link to your inbox.
                </p>

                <form onSubmit={handleSendLink}>
                  <label className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] block mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="1lastfirst@hdsb.ca"
                    className="w-full border border-[#dbe0ec] bg-white px-4 py-3.5 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors placeholder-[#6c6c6c] mb-4"
                    required
                  />

                  {error && (
                    <p className="font-['Source_Serif_4',serif] text-red-600 text-sm mb-4">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black flex gap-[10px] items-center justify-center px-5 py-4 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <>
                        <div className="bg-white shrink-0 w-[5px] h-[5px]" />
                        <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">
                          Send Sign-In Link
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
                  Check Your Inbox
                </p>
                <h1
                  className="font-['Source_Serif_4',serif] text-[32px] text-black tracking-[-1px] mb-2"
                  style={{ lineHeight: 1.1 }}
                >
                  Link sent
                </h1>
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base tracking-[-0.3px] mb-1">
                  We sent a sign-in link to
                </p>
                <p className="font-['Geist_Mono',monospace] text-[13px] text-black mb-6">
                  {email}
                </p>
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mb-8">
                  Click the link in your email to sign in. It may take a minute to arrive — check your spam folder if needed.
                </p>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setSent(false);
                      setError("");
                    }}
                    className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c] hover:text-black transition-colors"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleSendLink}
                    disabled={loading}
                    className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c] hover:text-black transition-colors"
                  >
                    {loading ? "Sending..." : "Resend link"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] text-center mt-6">
          WOSS Robotics · 2026-2027 Executive Applications
        </p>
      </div>
    </div>
  );
}
