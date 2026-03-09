import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { useApplications, useQuestions } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";
import { ACTIVITY_TYPES, RECOGNITION_LEVELS } from "../../data";

export function ApplicantReview() {
  const { profile } = useAuth();
  const { applications, loading: appsLoading, refetch: refetchApps } = useApplications(profile?.id);
  const { questions, loading: qLoading } = useQuestions();
  const navigate = useNavigate();

  const [responses, setResponses] = useState<Record<string, string>>({});
  const [activities, setActivities] = useState<any[]>([]);
  const [honors, setHonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  // Separate questions
  const generalQuestions = questions.filter((q: any) => !q.position_id);
  const positionQuestionMap: Record<string, any[]> = {};
  for (const q of questions) {
    if (q.position_id) {
      if (!positionQuestionMap[q.position_id]) positionQuestionMap[q.position_id] = [];
      positionQuestionMap[q.position_id].push(q);
    }
  }

  useEffect(() => {
    if (appsLoading || qLoading || !profile) return;
    const load = async () => {
      // Load responses for all apps
      const appIds = applications.map((a: any) => a.id);
      if (appIds.length > 0) {
        const { data: respData } = await supabase
          .from("responses")
          .select("application_id, question_id, content")
          .in("application_id", appIds);
        const map: Record<string, string> = {};
        (respData || []).forEach((r: any) => { map[`${r.application_id}:${r.question_id}`] = r.content; });
        setResponses(map);
      }

      // Load activities
      const { data: actData } = await supabase
        .from("activities")
        .select("*")
        .eq("user_id", profile.id)
        .order("sort_order");
      setActivities(actData || []);

      // Load honors
      const { data: honData } = await supabase
        .from("honors")
        .select("*")
        .eq("user_id", profile.id)
        .order("sort_order");
      setHonors(honData || []);

      // Expand all initially
      setExpandedApps(new Set(appIds));
      setLoading(false);
    };
    load();
  }, [appsLoading, qLoading, profile?.id]);

  const toggleApp = (id: string) => {
    setExpandedApps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getCompletionStatus = (app: any) => {
    const issues: string[] = [];

    // Check profile
    if (!profile?.first_name || !profile?.last_name) issues.push("Profile incomplete");

    // Check general questions
    for (const q of generalQuestions) {
      if (q.is_required) {
        const content = responses[`${app.id}:${q.id}`] || "";
        if (!content.trim()) issues.push(`Missing: ${q.prompt.substring(0, 40)}...`);
        if (content.length > (q.char_limit || 2000)) issues.push(`Over limit: ${q.prompt.substring(0, 40)}...`);
      }
    }

    // Check position questions
    const posQs = positionQuestionMap[app.position_id] || [];
    for (const q of posQs) {
      if (q.is_required) {
        const content = responses[`${app.id}:${q.id}`] || "";
        if (!content.trim()) issues.push(`Missing: ${q.prompt.substring(0, 40)}...`);
        if (content.length > (q.char_limit || 2000)) issues.push(`Over limit: ${q.prompt.substring(0, 40)}...`);
      }
    }

    return issues;
  };

  const handleSubmit = async (appId: string) => {
    setSubmitting(appId);
    const { error } = await supabase
      .from("applications")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", appId);

    if (error) {
      console.error("Failed to submit:", error);
    } else {
      setSubmitted((prev) => new Set(prev).add(appId));
      await refetchApps();
    }
    setSubmitting(null);
  };

  if (loading || appsLoading || qLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#6c6c6c]" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="border-b border-[#dbe0ec] pb-8">
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Step 07</p>
          <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
            Review &<br />Submit
          </h1>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
            You haven't started any applications yet.
          </p>
        </header>
        <button onClick={() => navigate("/applicant/positions")} className="bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors">
          <div className="bg-white shrink-0 w-[5px] h-[5px]" />
          <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">Browse Positions</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <header className="border-b border-[#dbe0ec] pb-8">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Step 07</p>
        <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
          Review &<br />Submit
        </h1>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          Review your application details below, then submit each position individually.
        </p>
      </header>

      {/* Shared info (profile, activities, honors) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">Shared Information</h2>
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">Applies to all applications</span>
        </div>

        <div className="border border-[#dbe0ec]">
          {/* Profile */}
          <div className="px-6 py-5 border-b border-[#dbe0ec]">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">01</span>
              <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">Profile</p>
              {profile?.first_name && profile?.last_name ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-black ml-auto" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-[#6c6c6c] ml-auto" />
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ml-8">
              {[
                { label: "Name", value: `${profile?.first_name || "—"} ${profile?.last_name || ""}`.trim() },
                { label: "Email", value: profile?.email || "—" },
                { label: "Grade", value: profile?.grade || "—" },
                { label: "Student #", value: profile?.student_number || "—" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] mb-1">{item.label}</p>
                  <p className="font-['Radio_Canada_Big',sans-serif] text-sm text-black">{item.value || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Activities */}
          <div className="px-6 py-5 border-b border-[#dbe0ec]">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">02</span>
              <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">Activities</p>
              <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] ml-auto">{activities.length} added</span>
            </div>
            {activities.length > 0 ? (
              <div className="ml-8 space-y-2">
                {activities.map((a: any, i: number) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-[#dbe0ec] last:border-0">
                    <div>
                      <p className="font-['Radio_Canada_Big',sans-serif] text-sm text-black">{a.role || a.organization || "Activity"}</p>
                      <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-xs mt-0.5">{a.organization}{a.type ? ` · ${a.type}` : ""}</p>
                    </div>
                    <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">{a.hours_per_week || 0}h/wk</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm ml-8">No activities added yet.</p>
            )}
          </div>

          {/* Honors */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">03</span>
              <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">Honors & Awards</p>
              <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] ml-auto">{honors.length} added</span>
            </div>
            {honors.length > 0 ? (
              <div className="ml-8 space-y-2">
                {honors.map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between py-2 border-b border-[#dbe0ec] last:border-0">
                    <p className="font-['Radio_Canada_Big',sans-serif] text-sm text-black">{h.title}</p>
                    <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">{h.recognition_level} · {h.grade_level}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm ml-8">No honors added yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Per-Position Applications */}
      {applications.map((app: any, appIdx: number) => {
        const isExpanded = expandedApps.has(app.id);
        const isAlreadySubmitted = app.status !== "draft" || submitted.has(app.id);
        const issues = getCompletionStatus(app);
        const posQuestions = positionQuestionMap[app.position_id] || [];
        const allQuestions = [...generalQuestions, ...posQuestions];

        return (
          <motion.section
            key={app.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: appIdx * 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">{String(appIdx + 1).padStart(2, "0")}</span>
                <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">{app.positions?.title}</h2>
                {isAlreadySubmitted && (
                  <span className="font-['Geist_Mono',monospace] text-[10px] text-black border border-black px-2 py-0.5">Submitted</span>
                )}
              </div>
              <button onClick={() => toggleApp(app.id)} className="text-[#6c6c6c] hover:text-black transition-colors">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isExpanded && (
              <div className="border border-[#dbe0ec]">
                {/* General responses for this application */}
                {generalQuestions.length > 0 && (
                  <div className="border-b border-[#dbe0ec]">
                    <div className="px-6 py-4 bg-[#f9f9f7] border-b border-[#dbe0ec]">
                      <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em]">General Responses</p>
                    </div>
                    {generalQuestions.map((q: any, idx: number) => {
                      const content = responses[`${app.id}:${q.id}`] || "";
                      return (
                        <div key={q.id} className={cn("px-6 py-4", idx !== 0 && "border-t border-[#dbe0ec]")}>
                          <p className="font-['Radio_Canada_Big',sans-serif] text-sm text-black mb-1">{q.prompt}</p>
                          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>
                            {content || <span className="italic">No response yet</span>}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Position-specific responses */}
                {posQuestions.length > 0 && (
                  <div className={generalQuestions.length > 0 ? "" : ""}>
                    <div className="px-6 py-4 bg-[#f9f9f7] border-b border-[#dbe0ec]">
                      <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em]">
                        {app.positions?.title} — Specific Questions
                      </p>
                    </div>
                    {posQuestions.map((q: any, idx: number) => {
                      const content = responses[`${app.id}:${q.id}`] || "";
                      return (
                        <div key={q.id} className={cn("px-6 py-4", idx !== 0 && "border-t border-[#dbe0ec]")}>
                          <p className="font-['Radio_Canada_Big',sans-serif] text-sm text-black mb-1">{q.prompt}</p>
                          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>
                            {content || <span className="italic">No response yet</span>}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {allQuestions.length === 0 && (
                  <div className="px-6 py-8 text-center">
                    <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm">No questions assigned to this application.</p>
                  </div>
                )}

                {/* Issues / Submit */}
                <div className="px-6 py-5 border-t border-[#dbe0ec] bg-[#f9f9f7]">
                  {isAlreadySubmitted ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-black" />
                      <div>
                        <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">Application Submitted</p>
                        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-0.5">
                          {app.submitted_at ? `Submitted on ${new Date(app.submitted_at).toLocaleDateString()}` : "This application has been submitted."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {issues.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-[#6c6c6c]" />
                            <p className="font-['Radio_Canada_Big',sans-serif] text-sm text-[#6c6c6c]">
                              {issues.length} issue{issues.length !== 1 ? "s" : ""} to resolve
                            </p>
                          </div>
                          <ul className="ml-6 space-y-1">
                            {issues.slice(0, 5).map((issue, i) => (
                              <li key={i} className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-xs">
                                {issue}
                              </li>
                            ))}
                            {issues.length > 5 && (
                              <li className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">
                                + {issues.length - 5} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      <button
                        onClick={() => handleSubmit(app.id)}
                        disabled={submitting === app.id}
                        className="bg-black flex gap-[10px] items-center justify-center px-6 py-4 hover:bg-zinc-800 transition-colors disabled:opacity-50 w-full"
                      >
                        {submitting === app.id ? (
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        ) : (
                          <>
                            <div className="bg-white shrink-0 w-[5px] h-[5px]" />
                            <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">
                              Submit Application — {app.positions?.title}
                            </span>
                          </>
                        )}
                      </button>

                      {issues.length > 0 && (
                        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-xs mt-2 text-center">
                          You can still submit with incomplete fields, but we recommend completing everything first.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.section>
        );
      })}

      {/* Edit links */}
      <section className="border-t border-[#dbe0ec] pt-6">
        <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] mb-3">Need to make changes?</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Edit Profile", to: "/applicant/profile" },
            { label: "Edit Activities", to: "/applicant/activities" },
            { label: "Edit Responses", to: "/applicant/responses" },
            { label: "Edit Honors", to: "/applicant/honors" },
          ].map((link) => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className="border border-[#dbe0ec] flex gap-[10px] items-center justify-center px-4 py-2.5 hover:border-black transition-colors"
            >
              <span className="font-['Geist_Mono',monospace] text-[12px] text-black whitespace-nowrap leading-none">{link.label}</span>
              <ArrowRight className="w-3 h-3 text-[#6c6c6c]" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
