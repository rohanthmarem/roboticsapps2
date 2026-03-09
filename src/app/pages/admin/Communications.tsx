import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAllApplications, useSettings } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";
import { acceptanceEmail, rejectionEmail, decisionReleasedEmail } from "../../lib/email-templates";

export function AdminCommunications() {
  const { applications, loading } = useAllApplications();
  const { settings, loading: settingsLoading, updateSetting } = useSettings();
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [existingDecisionIds, setExistingDecisionIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const decisionsReleased = settings.decisions_released === true || settings.decisions_released === "true";

  const acceptedApps = applications.filter((a: any) => a.status === "accepted");
  const rejectedApps = applications.filter((a: any) => a.status === "rejected");

  // Fetch which applications already have decisions
  useEffect(() => {
    if (loading) return;
    supabase
      .from("decisions")
      .select("application_id")
      .then(({ data, error: err }) => {
        if (err) {
          console.error("Failed to fetch existing decisions:", err);
          setError(`Failed to load existing decisions: ${err.message}`);
          return;
        }
        setExistingDecisionIds(new Set((data || []).map((d: any) => d.application_id)));
      });
  }, [loading, sentCount]);

  const pendingAccepted = acceptedApps.filter((a: any) => !existingDecisionIds.has(a.id));
  const pendingRejected = rejectedApps.filter((a: any) => !existingDecisionIds.has(a.id));
  const alreadySentAccepted = acceptedApps.length - pendingAccepted.length;
  const alreadySentRejected = rejectedApps.length - pendingRejected.length;

  const sendEmailNotification = async (app: any, type: "accepted" | "rejected") => {
    try {
      const firstName = app.profiles?.first_name || "Applicant";
      const positionTitle = app.positions?.title || "the position";
      const email = app.profiles?.email;
      if (!email) return;

      const portalUrl = window.location.origin + "/applicant/decisions";
      const html =
        type === "accepted"
          ? acceptanceEmail(firstName, positionTitle, portalUrl)
          : rejectionEmail(firstName, positionTitle, portalUrl);

      const subject =
        type === "accepted"
          ? `Congratulations! Welcome to WOSS Robotics — ${positionTitle}`
          : `Update on your WOSS Robotics application — ${positionTitle}`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke("send-email", {
        body: { to: email, subject, html },
      });
    } catch (err) {
      console.error("Failed to send email notification:", err);
    }
  };

  const handleSendDecisions = async (type: "accepted" | "rejected", apps: any[]) => {
    setSending(true);
    setError(null);
    let count = 0;
    const pending = apps.filter((a: any) => !existingDecisionIds.has(a.id));
    for (const app of pending) {
      const { error: err } = await supabase.from("decisions").insert({
        application_id: app.id,
        type,
      });
      if (err) {
        console.error("Failed to insert decision for application:", app.id, err);
        setError(`Failed to send decision: ${err.message}`);
      } else {
        count++;
        // Send beautifully formatted email notification
        await sendEmailNotification(app, type);
      }
    }
    setSentCount((prev) => prev + count);
    setSending(false);
  };

  const handleToggleRelease = async () => {
    const newValue = !decisionsReleased;
    await updateSetting("decisions_released", newValue);

    // When releasing decisions, send notification emails to all applicants with decisions
    if (newValue) {
      try {
        const { data: decisions } = await supabase
          .from("decisions")
          .select("application_id, applications(user_id, profiles(email, first_name))");

        if (decisions) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const portalUrl = window.location.origin + "/applicant/decisions";
          for (const d of decisions) {
            const profile = (d as any).applications?.profiles;
            if (!profile?.email) continue;
            const html = decisionReleasedEmail(profile.first_name || "Applicant", portalUrl);
            await supabase.functions.invoke("send-email", {
              body: {
                to: profile.email,
                subject: "Your WOSS Robotics decision is ready",
                html,
              },
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error("Failed to send release notifications:", err);
      }
    }
  };

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#6c6c6c]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="border-b border-[#dbe0ec] pb-7">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Admin — 03</p>
        <h1 className="font-['Source_Serif_4',serif] text-[40px] text-black tracking-[-1.2px]" style={{ lineHeight: 1.05 }}>
          Decision &<br />Communications
        </h1>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          Send decision letters and status updates to applicants.
        </p>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="border border-red-300 bg-red-50 px-5 py-4 flex items-start justify-between gap-4">
          <p className="font-['Radio_Canada_Big',sans-serif] text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="font-['Geist_Mono',monospace] text-[11px] text-red-500 hover:text-red-700 shrink-0">Dismiss</button>
        </div>
      )}

      {/* Release Toggle */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">Release Decisions</h2>
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">001</span>
        </div>

        <div className="border border-[#dbe0ec]">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-start gap-4">
              <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] w-6 mt-0.5">01</span>
              <div>
                <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">Decisions Visible to Applicants</p>
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-0.5">
                  {decisionsReleased
                    ? "Applicants can currently see their decision letters in the portal."
                    : "Decisions are hidden from applicants. Toggle this on after sending all letters."}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleRelease}
              className={`relative w-12 h-6 transition-colors shrink-0 ${decisionsReleased ? "bg-black" : "bg-[#dbe0ec]"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white transition-all ${decisionsReleased ? "left-7" : "left-1"}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Send Decisions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">Send Decisions</h2>
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">002</span>
        </div>

        <div className="border border-[#dbe0ec] space-y-0">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-start gap-4">
              <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] w-6 mt-0.5">01</span>
              <div>
                <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">Send Acceptance Letters</p>
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-0.5">
                  {pendingAccepted.length} pending{alreadySentAccepted > 0 ? ` · ${alreadySentAccepted} already sent` : ""} · {acceptedApps.length} total accepted
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSendDecisions("accepted", acceptedApps)}
              disabled={sending || pendingAccepted.length === 0}
              className="bg-black flex gap-[10px] items-center justify-center px-4 py-2.5 hover:bg-zinc-800 transition-colors disabled:opacity-50 shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <span className="font-['Geist_Mono',monospace] text-[12px] text-white whitespace-nowrap leading-none">
                  {pendingAccepted.length === 0 ? "All Sent" : `Send (${pendingAccepted.length})`}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between px-6 py-5 border-t border-[#dbe0ec]">
            <div className="flex items-start gap-4">
              <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] w-6 mt-0.5">02</span>
              <div>
                <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">Send Rejection Letters</p>
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-0.5">
                  {pendingRejected.length} pending{alreadySentRejected > 0 ? ` · ${alreadySentRejected} already sent` : ""} · {rejectedApps.length} total rejected
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSendDecisions("rejected", rejectedApps)}
              disabled={sending || pendingRejected.length === 0}
              className="border border-[#dbe0ec] flex gap-[10px] items-center justify-center px-4 py-2.5 hover:border-black transition-colors disabled:opacity-50 shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="font-['Geist_Mono',monospace] text-[12px] text-black whitespace-nowrap leading-none">
                  {pendingRejected.length === 0 ? "All Sent" : `Send (${pendingRejected.length})`}
                </span>
              )}
            </button>
          </div>
        </div>

        {sentCount > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <p className="font-['Source_Serif_4',serif] text-black text-sm">
              Successfully sent {sentCount} decision letter{sentCount !== 1 ? "s" : ""}.
            </p>
            {!decisionsReleased && (
              <button
                onClick={handleToggleRelease}
                className="font-['Geist_Mono',monospace] text-[12px] text-black underline hover:no-underline"
              >
                Release decisions to applicants now
              </button>
            )}
          </div>
        )}
      </section>

      {/* How it works */}
      <section>
        <div className="flex items-center justify-between py-5 border-t border-[#dbe0ec]">
          <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">How Decisions Work</h2>
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">003</span>
        </div>

        <div className="border border-[#dbe0ec]">
          <div className="px-6 py-4 bg-[#f9f9f7] border-b border-[#dbe0ec]">
            <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm leading-[1.5]">
              Decision letters are automatically generated based on each applicant's status. The full workflow:
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#dbe0ec]">
            {[
              { step: "01", title: "Review Applications", desc: "Score and evaluate each applicant in the review page." },
              { step: "02", title: "Set Final Status", desc: "Mark applicants as Accepted or Declined from the dashboard or review page." },
              { step: "03", title: "Send Letters", desc: "Use the buttons above to create decision letters for all marked applicants." },
              { step: "04", title: "Release Decisions", desc: "Toggle 'Decisions Visible' on to let applicants see their letters in the portal." },
            ].map((item) => (
              <div key={item.step} className="px-6 py-4">
                <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">{item.step}</span>
                <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm mt-1">{item.title}</p>
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
