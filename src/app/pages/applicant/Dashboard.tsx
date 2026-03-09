import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight, PenTool, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { useApplications, useSettings } from "../../lib/hooks";
import { STATUS_LABELS } from "../../data";
import { cn } from "../../lib/utils";

function PrimaryButton({ to, children, className }: { to?: string; children: React.ReactNode; className?: string }) {
  const cls = cn(
    "bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors",
    className
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        <div className="bg-white shrink-0 w-[5px] h-[5px]" />
        <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">{children}</span>
      </Link>
    );
  }
  return (
    <button className={cls}>
      <div className="bg-white shrink-0 w-[5px] h-[5px]" />
      <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">{children}</span>
    </button>
  );
}

export function ApplicantDashboard() {
  const { profile } = useAuth();
  const { applications, loading } = useApplications(profile?.id);
  const { settings } = useSettings();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = profile?.first_name || profile?.email?.split("@")[0] || "there";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#6c6c6c]" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
      {/* Header */}
      <header className="border-b border-[#dbe0ec] pb-8">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
          Overview
        </p>
        <h1
          className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]"
          style={{ lineHeight: 1.05 }}
        >
          {getGreeting()},<br />{firstName}.
        </h1>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          Here is a summary of your executive applications and upcoming deadlines.
        </p>
      </header>

      {/* Applications */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">
            Your Applications
          </h2>
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
            {applications.length} active
          </span>
        </div>

        <div className="border border-[#dbe0ec]">
          {applications.map((app: any, i: number) => (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              key={app.id}
              className={cn(
                "flex items-center justify-between px-6 py-5 hover:bg-[#f9f9f7] transition-colors group",
                i !== 0 && "border-t border-[#dbe0ec]"
              )}
            >
              <div className="flex items-center gap-5">
                <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] w-6">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm group-hover:underline">
                    WOSS Robotics
                  </h3>
                  <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-0.5">
                    {app.positions?.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] border border-[#dbe0ec] px-2.5 py-1">
                  {STATUS_LABELS[app.status] ?? app.status}
                </span>
                {app.status === "draft" ? (
                  <Link
                    to="/applicant/review"
                    className="font-['Geist_Mono',monospace] text-[11px] text-black flex items-center gap-1 hover:underline"
                  >
                    Review & Submit <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : app.status === "submitted" ? (
                  <Link
                    to="/applicant/review"
                    className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] flex items-center gap-1 hover:underline"
                  >
                    View <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : null}
              </div>
            </motion.div>
          ))}

          {applications.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base mb-6">
                You haven't started any applications yet.
              </p>
              <PrimaryButton to="/applicant/positions">Browse Positions</PrimaryButton>
            </div>
          )}
        </div>
      </section>

      {/* Timeline + Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Timeline */}
        <section>
          <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base mb-2">
            Key Dates
          </h2>
          <div className="border border-[#dbe0ec]">
            {[
              { date: settings.application_deadline || "TBD", label: "Application Deadline", desc: "Submit all materials for the 2026-2027 cycle.", urgent: true },
              { date: settings.interview_window || "TBD", label: "Interview Window", desc: "If selected, you will be invited to book a slot.", urgent: false },
              { date: settings.decisions_date || "TBD", label: "Decisions Released", desc: "Check your portal for updates.", urgent: false },
            ].map((item, i) => (
              <div
                key={item.label}
                className={cn(
                  "px-6 py-5 flex items-start gap-4",
                  i !== 0 && "border-t border-[#dbe0ec]",
                  !item.urgent && "opacity-60"
                )}
              >
                <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] w-5 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] mb-1">{item.date}</p>
                  <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">{item.label}</p>
                  <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base mb-2">
            Quick Actions
          </h2>
          <div className="border border-[#dbe0ec]">
            <div className="px-6 py-5 border-b border-[#dbe0ec]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">Written Responses</p>
                  <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-1">
                    Complete your written responses to strengthen your application.
                  </p>
                </div>
                <PenTool className="w-4 h-4 text-[#6c6c6c] shrink-0 mt-0.5" />
              </div>
              <PrimaryButton to="/applicant/responses">Continue Responses</PrimaryButton>
            </div>
            <div className="px-6 py-5">
              <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm mb-1">
                Not applied yet?
              </p>
              <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mb-3">
                Browse all available executive positions for 2026-2027.
              </p>
              <Link
                to="/applicant/positions"
                className="font-['Geist_Mono',monospace] text-[12px] text-black border-b border-black hover:opacity-70 transition-opacity"
              >
                Browse positions →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
