import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../lib/AuthContext";
import { useDeadlinePassed } from "../../lib/hooks";
import { useDataContext } from "../../lib/DataContext";
import { supabase } from "../../lib/supabase";
import { GRADE_LEVELS, RECOGNITION_LEVELS } from "../../data";
import { cn } from "../../lib/utils";

const fieldCls =
  "w-full border border-[#dbe0ec] bg-white px-4 py-3 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors placeholder-[#6c6c6c]";

const selectCls =
  "w-full border border-[#dbe0ec] bg-white px-4 py-3 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors";

const labelCls =
  "font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] block mb-2";

interface HonorItem {
  id: string;
  title: string;
  grade_level: string;
  recognition_level: string;
}

export function ApplicantHonors() {
  const { profile } = useAuth();
  const { refetchProgressCounts } = useDataContext();
  const isDeadlinePassed = useDeadlinePassed();
  const navigate = useNavigate();
  const [honors, setHonors] = useState<HonorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const honorsRef = useRef(honors);

  useEffect(() => { honorsRef.current = honors; }, [honors]);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!profile || hasFetched.current) { setLoading(false); return; }
    hasFetched.current = true;
    supabase
      .from("honors")
      .select("*")
      .eq("user_id", profile.id)
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) console.error("Failed to fetch honors:", error);
        setHonors(data || []);
        setLoading(false);
      });
  }, [profile]);

  const savingRef = useRef(false);

  const doSave = useCallback(async (honorsToSave: HonorItem[]) => {
    if (!profile || savingRef.current) return;
    savingRef.current = true;
    setAutoSaveState("saving");

    try {
      const currentIds = honorsToSave.map((h) => h.id);

      // Single delete for removed items
      const { error: delError } = await supabase
        .from("honors")
        .delete()
        .eq("user_id", profile.id)
        .not("id", "in", `(${currentIds.join(",")})`);

      if (delError) {
        console.error("Failed to delete honors:", delError);
        toast.error("Failed to save honors. Please try again.");
        setAutoSaveState("idle");
        return;
      }

      // Single upsert for all current items
      if (honorsToSave.length > 0) {
        const rows = honorsToSave.map((h, i) => ({
          id: h.id, user_id: profile.id, title: h.title,
          grade_level: h.grade_level, recognition_level: h.recognition_level, sort_order: i,
        }));

        const { error: upsertError } = await supabase
          .from("honors")
          .upsert(rows, { onConflict: "id" });

        if (upsertError) {
          console.error("Failed to save honors:", upsertError);
          toast.error("Failed to save honors. Please try again.");
          setAutoSaveState("idle");
          return;
        }
      }

      setAutoSaveState("saved");
      refetchProgressCounts();
    } finally {
      savingRef.current = false;
    }
  }, [profile, refetchProgressCounts]);

  const triggerAutoSave = useCallback((newHonors: HonorItem[]) => {
    setAutoSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(newHonors), 1000);
  }, [doSave]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && profile) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        doSave(honorsRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [doSave, profile]);

  const addHonor = () => {
    if (isDeadlinePassed || honors.length >= 5) return;
    const newHonors = [...honors, { id: crypto.randomUUID(), title: "", grade_level: "", recognition_level: "" }];
    setHonors(newHonors);
    triggerAutoSave(newHonors);
  };

  const removeHonor = (id: string) => {
    if (isDeadlinePassed) return;
    const newHonors = honors.filter((h) => h.id !== id);
    setHonors(newHonors);
    triggerAutoSave(newHonors);
  };

  const updateHonor = (id: string, field: string, value: string) => {
    if (isDeadlinePassed) return;
    const newHonors = honors.map((h) => (h.id === id ? { ...h, [field]: value } : h));
    setHonors(newHonors);
    triggerAutoSave(newHonors);
  };

  const handleSaveAndContinue = async () => {
    if (!profile) return;
    setSaving(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await doSave(honors);
    toast.success("Honors saved");
    setSaving(false);
    navigate("/applicant/review");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#6c6c6c]" />
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <header className="border-b border-[#dbe0ec] pb-8">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Step 06</p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
              Honors &<br />Awards
            </h1>
            <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
              List up to 5 academic or extracurricular recognitions you have received.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0 mb-1">
            <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] border border-[#dbe0ec] px-2.5 py-1">
              {honors.length} / 5
            </span>
            <div className="flex items-center gap-2 border border-[#dbe0ec] px-3 py-1">
              {autoSaveState === "idle" && <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">Ready</span>}
              {autoSaveState === "saving" && (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-[#6c6c6c]" />
                  <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">Saving...</span>
                </div>
              )}
              {autoSaveState === "saved" && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-black" />
                  <span className="font-['Geist_Mono',monospace] text-[11px] text-black">Saved</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {isDeadlinePassed && (
        <div className="border border-[#dbe0ec] bg-[#f9f9f7] px-5 py-4">
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">The application deadline has passed. This section is locked.</p>
        </div>
      )}

      {honors.length === 0 ? (
        <div className="border border-dashed border-[#dbe0ec] p-16 flex flex-col items-center text-center">
          <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-lg mb-2">No Honors Added</p>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base mb-6 max-w-sm">Add any recognitions or awards you are proud of.</p>
          <button onClick={addHonor} disabled={!!isDeadlinePassed} className={cn("bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors disabled:opacity-50", isDeadlinePassed && "cursor-not-allowed")}>
            <div className="bg-white shrink-0 w-[5px] h-[5px]" />
            <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">Add First Honor</span>
          </button>
        </div>
      ) : (
        <div className="border border-[#dbe0ec] space-y-0">
          {honors.map((honor, idx) => (
            <div key={honor.id} className={cn("p-5", idx !== 0 && "border-t border-[#dbe0ec]")}>
              <div className="flex items-start gap-4">
                <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] w-6 shrink-0 mt-1">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label className={labelCls}>Honor Title <span className="text-red-500">*</span> ({honor.title.length}/100)</label>
                    <input className={cn(fieldCls, !honor.title.trim() && "border-red-400", isDeadlinePassed && "opacity-60 cursor-not-allowed")} value={honor.title} onChange={(e) => updateHonor(honor.id, "title", e.target.value)} placeholder="e.g. Skills Ontario Robotics Award" maxLength={100} disabled={!!isDeadlinePassed} />
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelCls}>Grade Level <span className="text-red-500">*</span></label>
                    <select className={cn(selectCls, !honor.grade_level && "border-red-400", isDeadlinePassed && "opacity-60 cursor-not-allowed")} value={honor.grade_level} onChange={(e) => updateHonor(honor.id, "grade_level", e.target.value)} disabled={!!isDeadlinePassed}>
                      <option value="">Select</option>
                      {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelCls}>Recognition Level <span className="text-red-500">*</span></label>
                    <select className={cn(selectCls, !honor.recognition_level && "border-red-400", isDeadlinePassed && "opacity-60 cursor-not-allowed")} value={honor.recognition_level} onChange={(e) => updateHonor(honor.id, "recognition_level", e.target.value)} disabled={!!isDeadlinePassed}>
                      <option value="">Select</option>
                      {RECOGNITION_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-1">
                  {(!honor.title.trim() || !honor.grade_level || !honor.recognition_level) && (
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  )}
                  {!isDeadlinePassed && (
                  <button onClick={() => removeHonor(honor.id)} className="p-1.5 text-[#6c6c6c] hover:text-black transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {honors.length < 5 && !isDeadlinePassed && (
            <button onClick={addHonor} className="w-full border-t border-dashed border-[#dbe0ec] py-4 flex items-center justify-center gap-2 hover:bg-[#f9f9f7] transition-colors">
              <Plus className="w-4 h-4 text-[#6c6c6c]" />
              <span className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c]">Add Another Honor</span>
            </button>
          )}
        </div>
      )}

      <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-[#dbe0ec] px-8 py-4 flex justify-between items-center z-20">
        <button onClick={() => navigate("/applicant/responses")} className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c] hover:text-black transition-colors">
          ← Back
        </button>
        <button onClick={handleSaveAndContinue} disabled={saving || !!isDeadlinePassed} className={cn("bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors disabled:opacity-50", isDeadlinePassed && "cursor-not-allowed")}>
          {saving ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : (
            <>
              <div className="bg-white shrink-0 w-[5px] h-[5px]" />
              <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">Save & Review</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
