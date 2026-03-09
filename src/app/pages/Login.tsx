import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

export function Login() {
  const { signInWithOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const { error: err } = await signInWithOtp(email.trim());
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setStep("verify");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError("");
    const { error: err } = await verifyOtp(email.trim(), otp.trim());
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      // Profile will be loaded by AuthContext via onAuthStateChange.
      // ProtectedRoute will redirect to the correct dashboard based on role.
      // Navigate to /applicant as default — admins get redirected by ProtectedRoute.
      navigate("/applicant");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#a8d3ff] via-[#e8f3ff] to-[#fff4df]" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12 justify-center">
          <div className="w-2 h-2 bg-black" />
          <span className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm tracking-tight">
            WOSS Robotics
          </span>
        </div>

        <div className="bg-white border-2 border-black p-8 md:p-10">
          <AnimatePresence mode="wait">
            {step === "email" ? (
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
                  Enter your email to receive a verification code.
                </p>

                <form onSubmit={handleSendOtp}>
                  <label className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] block mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@student.wrdsb.ca"
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
                          Send Verification Code
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
                  Verify
                </p>
                <h1
                  className="font-['Source_Serif_4',serif] text-[32px] text-black tracking-[-1px] mb-2"
                  style={{ lineHeight: 1.1 }}
                >
                  Check your email
                </h1>
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base tracking-[-0.3px] mb-1">
                  We sent a 6-digit code to
                </p>
                <p className="font-['Geist_Mono',monospace] text-[13px] text-black mb-8">
                  {email}
                </p>

                <form onSubmit={handleVerifyOtp}>
                  <label className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] block mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full border border-[#dbe0ec] bg-white px-4 py-3.5 font-['Geist_Mono',monospace] text-2xl text-black text-center tracking-[0.3em] outline-none focus:border-black transition-colors placeholder-[#dbe0ec] mb-4"
                    maxLength={6}
                    required
                  />

                  {error && (
                    <p className="font-['Source_Serif_4',serif] text-red-600 text-sm mb-4">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full bg-black flex gap-[10px] items-center justify-center px-5 py-4 hover:bg-zinc-800 transition-colors disabled:opacity-50 mb-4"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <>
                        <div className="bg-white shrink-0 w-[5px] h-[5px]" />
                        <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">
                          Verify & Sign In
                        </span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setOtp("");
                        setError("");
                      }}
                      className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c] hover:text-black transition-colors"
                    >
                      ← Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c] hover:text-black transition-colors"
                    >
                      Resend code
                    </button>
                  </div>
                </form>
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
