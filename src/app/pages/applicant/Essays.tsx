import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { useQuestions, useApplications } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

export function ApplicantEssays() {
  const { profile } = useAuth();
  const { questions, loading: qLoading } = useQuestions();
  const { applications, loading: appsLoading } = useApplications(profile?.id);
  const navigate = useNavigate();

  // responses keyed by `${applicationId}:${questionId}`
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const [loaded, setLoaded] = useState(false);

  // Separate general vs position-specific questions
  const generalQuestions = questions.filter((q: any) => !q.position_id);
  const positionQuestionMap: Record<string, any[]> = {};
  for (const q of questions) {
    if (q.position_id) {
      if (!positionQuestionMap[q.position_id]) positionQuestionMap[q.position_id] = [];
      positionQuestionMap[q.position_id].push(q);
    }
  }

  // Load all responses across all applications
  useEffect(() => {
    if (appsLoading || qLoading) return;
    if (applications.length === 0) { setLoaded(true); return; }

    const loadAll = async () => {
      const appIds = applications.map((a: any) => a.id);
      const { data, error } = await supabase
        .from("responses")
        .select("application_id, question_id, content")
        .in("application_id", appIds);
      if (error) console.error("Failed to fetch responses:", error);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        map[`${r.application_id}:${r.question_id}`] = r.content;
      });
      setResponses(map);
      setLoaded(true);
    };
    loadAll();
  }, [appsLoading, qLoading, applications.map((a: any) => a.id).join(",")]);

  const saveResponse = useCallback(
    async (applicationId: string, questionId: string, content: string) => {
      const { data: existing } = await supabase
        .from("responses")
        .select("id")
        .eq("application_id", applicationId)
        .eq("question_id", questionId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("responses")
          .update({ content, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("responses")
          .insert({ application_id: applicationId, question_id: questionId, content, updated_at: new Date().toISOString() });
      }
    },
    []
  );

  const handleChange = (applicationId: string, questionId: string, content: string) => {
    const key = `${applicationId}:${questionId}`;
    setResponses((prev) => ({ ...prev, [key]: content }));
    setSavingState("saving");
  };

  // For general questions: save response to ALL applications
  const handleGeneralChange = (questionId: string, content: string) => {
    const newResponses = { ...responses };
    for (const app of applications) {
      newResponses[`${app.id}:${questionId}`] = content;
    }
    setResponses(newResponses);
    setSavingState("saving");
  };

  // Auto-save with debounce
  useEffect(() => {
    if (savingState !== "saving") return;
    const timer = setTimeout(async () => {
      if (applications.length === 0) return;
      for (const [key, content] of Object.entries(responses)) {
        const [appId, qId] = key.split(":");
        if (!appId || !qId) continue;
        await saveResponse(appId, qId, content);
      }
      setSavingState("saved");
    }, 1000);
    return () => clearTimeout(timer);
  }, [savingState, responses, applications.length]);

  if (qLoading || appsLoading || !loaded) {
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
          <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
            Written<br />Responses
          </h1>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
            You need to select a position first before answering questions.
          </p>
        </header>
        <button onClick={() => navigate("/applicant/positions")} className="bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors">
          <div className="bg-white shrink-0 w-[5px] h-[5px]" />
          <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">Browse Positions</span>
        </button>
      </div>
    );
  }

  const renderQuestion = (q: any, idx: number, applicationId: string, isGeneral: boolean) => {
    const key = `${applicationId}:${q.id}`;
    const content = responses[key] || "";
    const charCount = content.length;
    const limit = q.char_limit || 2000;
    const isNearLimit = charCount > limit * 0.9;
    const isOverLimit = charCount > limit;

    return (
      <motion.div
        key={`${applicationId}-${q.id}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.05 }}
        className={cn("p-6", idx !== 0 && "border-t border-[#dbe0ec]")}
      >
        <div className="flex items-start gap-4 mb-2">
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] shrink-0 mt-0.5">
            {String(idx + 1).padStart(2, "0")}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base leading-snug">
                {q.prompt}
              </p>
              {q.is_required && <span className="font-['Geist_Mono',monospace] text-[9px] text-[#6c6c6c] border border-[#dbe0ec] px-1.5 py-0.5 shrink-0">Required</span>}
            </div>
            {q.description && (
              <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-1">{q.description}</p>
            )}
          </div>
        </div>

        {q.type === "textarea" || q.type === "short_text" ? (
          <>
            <textarea
              className={cn(
                "w-full border bg-[#f9f9f7] px-5 py-4 font-['Source_Serif_4',serif] text-base text-black leading-relaxed tracking-[-0.2px] resize-y outline-none transition-colors placeholder-[#6c6c6c]",
                q.type === "short_text" ? "min-h-[80px]" : "min-h-[200px]",
                isOverLimit ? "border-black" : "border-[#dbe0ec] focus:border-black"
              )}
              value={content}
              onChange={(e) => isGeneral ? handleGeneralChange(q.id, e.target.value) : handleChange(applicationId, q.id, e.target.value)}
              placeholder="Start writing here..."
            />
            <div className="flex justify-end mt-2">
              <span className={cn("font-['Geist_Mono',monospace] text-[11px]", isOverLimit || isNearLimit ? "text-black" : "text-[#6c6c6c]")}>
                {charCount} / {limit}
              </span>
            </div>
          </>
        ) : q.type === "select" ? (
          <select
            className="w-full border border-[#dbe0ec] bg-[#f9f9f7] px-5 py-4 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors"
            value={content}
            onChange={(e) => isGeneral ? handleGeneralChange(q.id, e.target.value) : handleChange(applicationId, q.id, e.target.value)}
          >
            <option value="">Select an option...</option>
            {(q.options || []).map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : q.type === "checkbox" ? (
          <div className="space-y-2 mt-2">
            {(q.options || []).map((opt: string) => {
              const selected = content.split(",").filter(Boolean);
              const isChecked = selected.includes(opt);
              return (
                <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn("w-4 h-4 border flex items-center justify-center transition-colors", isChecked ? "border-black bg-black" : "border-[#dbe0ec] group-hover:border-black")}>
                    {isChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <span className="font-['Radio_Canada_Big',sans-serif] text-sm text-black">{opt}</span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={() => {
                      const newVal = isChecked ? selected.filter((s) => s !== opt).join(",") : [...selected, opt].join(",");
                      isGeneral ? handleGeneralChange(q.id, newVal) : handleChange(applicationId, q.id, newVal);
                    }}
                  />
                </label>
              );
            })}
          </div>
        ) : q.type === "number" ? (
          <input
            type="number"
            className="w-full border border-[#dbe0ec] bg-[#f9f9f7] px-5 py-4 font-['Geist_Mono',monospace] text-base text-black outline-none focus:border-black transition-colors placeholder-[#6c6c6c]"
            value={content}
            onChange={(e) => isGeneral ? handleGeneralChange(q.id, e.target.value) : handleChange(applicationId, q.id, e.target.value)}
            placeholder="0"
          />
        ) : null}
      </motion.div>
    );
  };

  // Use first application for general question responses display
  const primaryApp = applications[0];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header */}
      <header className="border-b border-[#dbe0ec] pb-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
              Step 05
            </p>
            <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
              Written<br />Responses
            </h1>
            <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
              Answer the prompts below. Your work is automatically saved.
            </p>
          </div>

          {/* Autosave indicator */}
          <div className="flex items-center gap-2 border border-[#dbe0ec] px-3 py-2 mt-1 shrink-0">
            <AnimatePresence mode="wait">
              {savingState === "idle" && (
                <span key="idle" className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">Ready</span>
              )}
              {savingState === "saving" && (
                <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-[#6c6c6c]" />
                  <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">Saving...</span>
                </motion.div>
              )}
              {savingState === "saved" && (
                <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-black" />
                  <span className="font-['Geist_Mono',monospace] text-[11px] text-black">Saved</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* General Questions */}
      {generalQuestions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">General Questions</h2>
              <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-0.5">These apply to all positions you are applying for.</p>
            </div>
            <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] border border-[#dbe0ec] px-2.5 py-1">
              {generalQuestions.length} question{generalQuestions.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="border border-[#dbe0ec]">
            {generalQuestions.map((q: any, idx: number) => renderQuestion(q, idx, primaryApp.id, true))}
          </div>
        </section>
      )}

      {/* Position-specific Questions */}
      {applications.map((app: any, appIdx: number) => {
        const posQuestions = positionQuestionMap[app.position_id] || [];
        if (posQuestions.length === 0) return null;

        return (
          <section key={app.id}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] mb-1">
                  Position-Specific
                </p>
                <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">
                  {app.positions?.title}
                </h2>
              </div>
              <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] border border-[#dbe0ec] px-2.5 py-1">
                {posQuestions.length} question{posQuestions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="border border-[#dbe0ec]">
              {posQuestions.map((q: any, idx: number) => renderQuestion(q, idx, app.id, false))}
            </div>
          </section>
        );
      })}

      {/* No position-specific questions notice */}
      {applications.every((app: any) => !(positionQuestionMap[app.position_id]?.length > 0)) && generalQuestions.length === 0 && (
        <div className="border border-dashed border-[#dbe0ec] p-16 text-center">
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base">
            No questions have been added yet. Check back later.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-[#dbe0ec] px-8 py-4 flex justify-between items-center z-20">
        <button onClick={() => navigate("/applicant/activities")} className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c] hover:text-black transition-colors">
          ← Back
        </button>
        <button
          onClick={() => navigate("/applicant/honors")}
          className="bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors"
        >
          <div className="bg-white shrink-0 w-[5px] h-[5px]" />
          <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">Save & Continue</span>
        </button>
      </div>
    </div>
  );
}
