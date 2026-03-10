import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  const [emailErrors, setEmailErrors] = useState<string[]>([]);

  const decisionsReleased = settings.decisions_released === true || settings.decisions_released === "true";

  // Flatten all application_positions across applications, carrying profile info
  const allPositionEntries = applications.flatMap((app: any) =>
    (app.application_positions || []).map((ap: any) => ({
      ...ap,
      profiles: app.profiles,
      applicationStatus: app.status,
    }))
  );
  const acceptedPositions = allPositionEntries.filter((ap: any) => ap.status === "accepted");
  const rejectedPositions = allPositionEntries.filter((ap: any) => ap.status === "rejected");

  useEffect(() => {
    if (loading) return;
    supabase
      .from("decisions")
      .select("application_position_id")
      .then(({ data, error: err }) => {
        if (err) {
          console.error("Failed to fetch existing decisions:", err);
          setError(`Failed to load existing decisions: ${err.message}`);
          return;
        }
        setExistingDecisionIds(new Set((data || []).map((d: any) => d.application_position_id)));
      });
  }, [loading, sentCount]);

  const pendingAccepted = acceptedPositions.filter((ap: any) => !existingDecisionIds.has(ap.id));
  const pendingRejected = rejectedPositions.filter((ap: any) => !existingDecisionIds.has(ap.id));
  const alreadySentAccepted = acceptedPositions.length - pendingAccepted.length;
  const alreadySentRejected = rejectedPositions.length - pendingRejected.length;

  const sendEmailNotification = async (ap: any, type: "accepted" | "rejected"): Promise<boolean> => {
    try {
      const firstName = ap.profiles?.first_name || "Applicant";
      const positionTitle = ap.positions?.title || "the position";
      const email = ap.profiles?.email;
      if (!email) return false;

      const portalUrl = window.location.origin + "/applicant/decisions";
      const html =
        type === "accepted"
          ? acceptanceEmail(firstName, positionTitle, portalUrl)
          : rejectionEmail(firstName, positionTitle, portalUrl);

      const subject =
        type === "accepted"
          ? `Congratulations! Welcome to WOSS Robotics — ${positionTitle}`
          : `Update on your WOSS Robotics application — ${positionTitle}`;

      const { data, error: invokeErr } = await supabase.functions.invoke("send-email", {
        body: { to: email, subject, html },
      });

      if (invokeErr) {
        console.error("Email invoke error:", invokeErr);
        return false;
      }

      // Check if the response indicates an error
      if (data?.error) {
        console.error("Email send error:", data.error);
        return false;
      }

      return true;
    } catch (err) {
      console.error("Failed to send email notification:", err);
      return false;
    }
  };

  const handleSendDecisions = async (type: "accepted" | "rejected", positions: any[]) => {
    setSending(true);
    setError(null);
    setEmailErrors([]);
    let count = 0;
    let emailFailures: string[] = [];
    const pending = positions.filter((ap: any) => !existingDecisionIds.has(ap.id));

    for (const ap of pending) {
      const { error: err } = await supabase.from("decisions").insert({
        application_position_id: ap.id,
        type,
      });
      if (err) {
        console.error("Failed to insert decision for application_position:", ap.id, err);
        setError(`Failed to send decision: ${err.message}`);
      } else {
        count++;
        const emailSent = await sendEmailNotification(ap, type);
        if (!emailSent) {
          const name = `${ap.profiles?.first_name || ""} ${ap.profiles?.last_name || ""}`.trim() || ap.profiles?.email;
          emailFailures.push(name);
        }
      }
    }

    setSentCount((prev) => prev + count);
    setSending(false);

    if (count > 0) {
      toast.success(`${count} decision letter${count !== 1 ? "s" : ""} created`);
    }
    if (emailFailures.length > 0) {
      setEmailErrors(emailFailures);
      toast.error(`Failed to email ${emailFailures.length} applicant${emailFailures.length !== 1 ? "s" : ""}. Decision letters were still created in the portal.`);
    }
  };

  const handleToggleRelease = async () => {
    const newValue = !decisionsReleased;
    await updateSetting("decisions_released", newValue);

    if (newValue) {
      toast.success("Decisions are now visible to applicants");
    } else {
      toast.success("Decisions hidden from applicants");
    }

    if (newValue) {
      try {
        const { data: decisions } = await supabase
          .from("decisions")
          .select("application_position_id, application_positions(application_id, applications(user_id, profiles(email, first_name)))");

        if (decisions) {
          const portalUrl = window.location.origin + "/applicant/decisions";
          // Deduplicate by email so each applicant gets at most one release notification
          const seenEmails = new Set<string>();
          let emailsSent = 0;
          for (const d of decisions) {
            const profile = (d as any).application_positions?.applications?.profiles;
            if (!profile?.email) continue;
            if (seenEmails.has(profile.email)) continue;
            seenEmails.add(profile.email);
            const html = decisionReleasedEmail(profile.first_name || "Applicant", portalUrl);
            const { error: invokeErr } = await supabase.functions.invoke("send-email", {
              body: {
                to: profile.email,
                subject: "Your WOSS Robotics decision is ready",
                html,
              },
            });
            if (!invokeErr) emailsSent++;
          }
          if (emailsSent > 0) {
            toast.success(`Notification sent to ${emailsSent} applicant${emailsSent !== 1 ? "s" : ""}`);
          }
        }
      } catch (err) {
        console.error("Failed to send release notifications:", err);
        toast.error("Decision released, but some notification emails failed");
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
      <header className="border-b border-[#dbe0ec] pb-7">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Admin — 03</p>
        <h1 className="font-['Source_Serif_4',serif] text-[40px] text-black tracking-[-1.2px]" style={{ lineHeight: 1.05 }}>
          Decision &<br />Communications
        </h1>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          Send decision letters and status updates to applicants.
        </p>
      </header>

      {error && (
        <div className="border border-red-300 bg-red-50 px-5 py-4 flex items-start justify-between gap-4">
          <p className="font-['Radio_Canada_Big',sans-serif] text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="font-['Geist_Mono',monospace] text-[11px] text-red-500 hover:text-red-700 shrink-0">Dismiss</button>
        </div>
      )}

      {emailErrors.length > 0 && (
        <div className="border border-yellow-300 bg-yellow-50 px-5 py-4">
          <p className="font-['Radio_Canada_Big',sans-serif] text-sm text-yellow-800 mb-2">
            Email delivery failed for the following applicants (their decision letters are still visible in the portal):
          </p>
          <ul className="list-disc list-inside font-['Source_Serif_4',serif] text-yellow-700 text-sm">
            {emailErrors.map((name, i) => <li key={i}>{name}</li>)}
          </ul>
          <p className="font-['Source_Serif_4',serif] text-yellow-700 text-xs mt-2">
            Ensure the RESEND_API_KEY is configured in Supabase Edge Function secrets.
          </p>
          <button onClick={() => setEmailErrors([])} className="font-['Geist_Mono',monospace] text-[11px] text-yellow-600 hover:text-yellow-800 mt-2">Dismiss</button>
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
                  {pendingAccepted.length} pending{alreadySentAccepted > 0 ? ` · ${alreadySentAccepted} already sent` : ""} · {acceptedPositions.length} total accepted
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSendDecisions("accepted", acceptedPositions)}
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
                  {pendingRejected.length} pending{alreadySentRejected > 0 ? ` · ${alreadySentRejected} already sent` : ""} · {rejectedPositions.length} total rejected
                </p>
              </div>
            </div>
            <button
              onClick={() => handleSendDecisions("rejected", rejectedPositions)}
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
              { step: "03", title: "Send Letters", desc: "Use the buttons above to create decision letters and email notifications." },
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
