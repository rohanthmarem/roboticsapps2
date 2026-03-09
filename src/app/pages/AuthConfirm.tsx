import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";

export function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as string | null;

    if (!tokenHash || !type) {
      setError("Invalid confirmation link. Missing token or type.");
      return;
    }

    const confirm = async () => {
      // First check if already signed in (Supabase may have auto-exchanged the token)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(type === "recovery" ? "/applicant/profile" : "/applicant", { replace: true });
        return;
      }

      // Try to verify the OTP
      const { data, error: err } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as any,
      });

      if (err) {
        // Check again if we're signed in despite the error (token already consumed)
        const { data: { session: retrySession } } = await supabase.auth.getSession();
        if (retrySession) {
          navigate(type === "recovery" ? "/applicant/profile" : "/applicant", { replace: true });
          return;
        }
        setError(err.message);
        return;
      }

      navigate(type === "recovery" ? "/applicant/profile" : "/applicant", { replace: true });
    };

    confirm();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#a8d3ff] via-[#e8f3ff] to-[#fff4df]">
        <div className="bg-white border-2 border-black p-10 max-w-md w-full mx-6">
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Error</p>
          <h1 className="font-['Source_Serif_4',serif] text-[28px] text-black tracking-[-0.8px] mb-4" style={{ lineHeight: 1.15 }}>
            Verification failed
          </h1>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base mb-6">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-black flex gap-[10px] items-center justify-center px-5 py-4 hover:bg-zinc-800 transition-colors w-full"
          >
            <div className="bg-white shrink-0 w-[5px] h-[5px]" />
            <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">Back to Login</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#a8d3ff] via-[#e8f3ff] to-[#fff4df]">
      <div className="bg-white border-2 border-black p-10 max-w-md w-full mx-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#6c6c6c] mx-auto mb-4" />
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base">Verifying your link...</p>
      </div>
    </div>
  );
}
