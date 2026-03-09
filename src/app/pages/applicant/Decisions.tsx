import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, CheckCircle2, PartyPopper, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "../../lib/AuthContext";
import { useApplications } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ApplicantDecisions() {
  const { profile } = useAuth();
  const { applications, loading: appsLoading } = useApplications(profile?.id);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDecision, setActiveDecision] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || appsLoading) {
      if (!appsLoading && !profile) setLoading(false);
      return;
    }

    const appIds = applications.map((a: any) => a.id);
    if (appIds.length === 0) {
      setDecisions([]);
      setLoading(false);
      return;
    }

    // Fetch decisions directly — settings check is done via the decisions_released setting
    // but we fetch fresh each time to avoid stale cache issues
    const fetchDecisions = async () => {
      // Check decisions_released setting fresh from DB
      const { data: settingRow } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "decisions_released")
        .maybeSingle();

      const released = settingRow?.value === true || settingRow?.value === "true";
      if (!released) {
        setDecisions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("decisions")
        .select("*, applications(position_id, user_id, positions(title))")
        .in("application_id", appIds)
        .order("created_at", { ascending: false });

      if (error) console.error("Failed to fetch decisions:", error);
      setDecisions(data || []);
      setLoading(false);
    };

    fetchDecisions();
  }, [profile, appsLoading, applications.length]);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("decisions").update({ is_read: true }).eq("id", id);
    setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, is_read: true } : d)));
  };

  const renderLetter = (id: string) => {
    const decision = decisions.find((d) => d.id === id);
    if (!decision) return null;
    const posTitle = decision.applications?.positions?.title || "the position";

    if (decision.type === "accepted") {
      return (
        <div className="border-2 border-black p-10 md:p-14 max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-black flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
              {new Date(decision.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-2">Accepted</p>
            <h2 className="font-['Source_Serif_4',serif] text-[36px] text-black tracking-[-1px]" style={{ lineHeight: 1.1 }}>
              Welcome to WOSS Robotics!
            </h2>
          </div>
          <div className="space-y-4 font-['Source_Serif_4',serif] text-black text-lg leading-[1.5] tracking-[-0.3px]">
            {decision.letter_content ? (
              <p style={{ whiteSpace: "pre-wrap" }}>{decision.letter_content}</p>
            ) : (
              <>
                <p>Dear {profile?.first_name || "Applicant"},</p>
                <p>Congratulations! We are thrilled to offer you the position of <strong>{posTitle}</strong> on the WOSS Robotics executive team for the 2026-2027 year.</p>
                <p>Your application and interview stood out among a highly competitive pool. We were impressed by your experiences and your passion for robotics.</p>
                <p>Please confirm your acceptance through the portal. We look forward to working with you!</p>
                <p>Warmly,<br />The WOSS Robotics Executive Team</p>
              </>
            )}
          </div>
          <div className="border-t border-[#dbe0ec] pt-8 flex flex-col sm:flex-row gap-3">
            <button onClick={() => setActiveDecision(null)} className="bg-black flex gap-[10px] items-center justify-center px-6 py-4 hover:bg-zinc-800 transition-colors">
              <div className="bg-white shrink-0 w-[5px] h-[5px]" />
              <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">Accept Offer</span>
            </button>
            <button onClick={triggerConfetti} className="border border-[#dbe0ec] flex gap-[10px] items-center justify-center px-6 py-4 hover:border-black transition-colors">
              <PartyPopper className="w-4 h-4 text-black" />
              <span className="font-['Geist_Mono',monospace] text-[13px] text-black whitespace-nowrap leading-none">Celebrate!</span>
            </button>
          </div>
        </div>
      );
    }

    if (decision.type === "rejected") {
      return (
        <div className="border border-[#dbe0ec] p-10 md:p-14 max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 border border-[#dbe0ec] flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#6c6c6c]" />
            </div>
            <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
              {new Date(decision.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-2">Update</p>
            <h2 className="font-['Source_Serif_4',serif] text-[36px] text-black tracking-[-1px]" style={{ lineHeight: 1.1 }}>
              Update from WOSS Robotics
            </h2>
          </div>
          <div className="space-y-4 font-['Source_Serif_4',serif] text-black text-lg leading-[1.5] tracking-[-0.3px]">
            {decision.letter_content ? (
              <p style={{ whiteSpace: "pre-wrap" }}>{decision.letter_content}</p>
            ) : (
              <>
                <p>Dear {profile?.first_name || "Applicant"},</p>
                <p>Thank you for applying for the <strong>{posTitle}</strong> position on the WOSS Robotics executive team.</p>
                <p>This year we received many strong applications. Due to the limited number of executive positions, we are unable to offer you a role at this time.</p>
                <p>We encourage you to stay involved with the club as a general member and apply again next year. Your interest and effort are deeply appreciated.</p>
                <p>Best wishes,<br />The WOSS Robotics Executive Team</p>
              </>
            )}
          </div>
          <div className="border-t border-[#dbe0ec] pt-8">
            <button onClick={() => setActiveDecision(null)} className="border border-[#dbe0ec] flex gap-[10px] items-center justify-center px-6 py-4 hover:border-black transition-colors">
              <span className="font-['Geist_Mono',monospace] text-[13px] text-black whitespace-nowrap leading-none">Return to Inbox</span>
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#6c6c6c]" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="border-b border-[#dbe0ec] pb-8">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Step 09</p>
        <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
          Decisions &<br />Letters
        </h1>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          View status updates and final decisions for your executive applications.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {!activeDecision ? (
          <motion.div key="inbox" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="border border-[#dbe0ec] space-y-0">
            {decisions.length === 0 && (
              <div className="px-6 py-16 text-center">
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base">
                  No decisions have been released yet. Check back later!
                </p>
              </div>
            )}
            {decisions.map((d, i) => (
              <button
                key={d.id}
                onClick={() => {
                  setActiveDecision(d.id);
                  if (!d.is_read) markAsRead(d.id);
                  if (d.type === "accepted" && !d.is_read) setTimeout(triggerConfetti, 500);
                }}
                className={cn(
                  "w-full flex items-center gap-5 px-6 py-5 text-left transition-colors hover:bg-[#f9f9f7]",
                  i !== 0 && "border-t border-[#dbe0ec]",
                  !d.is_read && "bg-[#f9f9f7]"
                )}
              >
                <div className={cn("w-10 h-10 border flex items-center justify-center shrink-0", d.type === "accepted" ? "border-black bg-black" : "border-[#dbe0ec]")}>
                  {d.type === "accepted" ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Mail className="w-5 h-5 text-[#6c6c6c]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!d.is_read && <div className="w-1.5 h-1.5 bg-black shrink-0" />}
                    <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.06em]">WOSS Robotics</p>
                  </div>
                  <h3 className={cn("font-['Radio_Canada_Big',sans-serif] text-sm text-black truncate", !d.is_read && "font-medium")}>
                    Update regarding your application for {d.applications?.positions?.title || "executive position"}
                  </h3>
                </div>
                <div className="hidden md:block shrink-0">
                  <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">{new Date(d.created_at).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#6c6c6c] shrink-0" />
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div key="letter" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }}>
            {renderLetter(activeDecision)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
