import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Reorder } from "motion/react";
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../lib/AuthContext";
import { useApplication } from "../../lib/hooks";
import { useDataContext } from "../../lib/DataContext";
import { supabase } from "../../lib/supabase";
import { ACTIVITY_TYPES } from "../../data";
import { cn } from "../../lib/utils";

const fieldCls =
  "w-full border border-[#dbe0ec] bg-white px-4 py-3 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors placeholder-[#6c6c6c]";

const selectCls =
  "w-full border border-[#dbe0ec] bg-white px-4 py-3 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors";

const labelCls =
  "font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] block mb-2";

interface ActivityItem {
  id: string;
  type: string;
  role: string;
  organization: string;
  description: string;
  years: string[];
  hours_per_week: number;
  weeks_per_year: number;
  plan_to_continue: boolean;
  expanded: boolean;
}

export function ApplicantActivities() {
  const { profile } = useAuth();
  const { application } = useApplication(profile?.id);
  const { refetchProgressCounts } = useDataContext();
  const isSubmitted = application && application.status !== "draft";
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const activitiesRef = useRef(activities);

  // Keep ref in sync
  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!profile || hasFetched.current) {
      setLoading(false);
      return;
    }
    hasFetched.current = true;
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", profile.id)
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) console.error("Failed to fetch activities:", error);
        setActivities(
          (data || []).map((a: any) => ({
            ...a,
            years: a.years || [],
            expanded: false,
          }))
        );
        setLoading(false);
      });
  }, [profile]);

  const savingRef = useRef(false);

  const doSave = useCallback(async (activitiesToSave: ActivityItem[]) => {
    if (!profile || savingRef.current) return;
    savingRef.current = true;
    setAutoSaveState("saving");

    try {
      const currentIds = activitiesToSave.map((a) => a.id);

      // Single delete for removed items
      const { error: delError } = await supabase
        .from("activities")
        .delete()
        .eq("user_id", profile.id)
        .not("id", "in", `(${currentIds.join(",")})`);

      if (delError) {
        console.error("Failed to delete activities:", delError);
        toast.error("Failed to save activities. Please try again.");
        setAutoSaveState("idle");
        return;
      }

      // Single upsert for all current items
      if (activitiesToSave.length > 0) {
        const rows = activitiesToSave.map((a, i) => ({
          id: a.id,
          user_id: profile.id,
          type: a.type,
          role: a.role,
          organization: a.organization,
          description: a.description,
          years: a.years,
          hours_per_week: a.hours_per_week,
          weeks_per_year: a.weeks_per_year,
          plan_to_continue: a.plan_to_continue,
          sort_order: i,
        }));

        const { error: upsertError } = await supabase
          .from("activities")
          .upsert(rows, { onConflict: "id" });

        if (upsertError) {
          console.error("Failed to save activities:", upsertError);
          toast.error("Failed to save activities. Please try again.");
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

  const triggerAutoSave = useCallback((newActivities: ActivityItem[]) => {
    setAutoSaveState("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(newActivities), 1000);
  }, [doSave]);

  // Save on visibility change (tab switch)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && profile) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        doSave(activitiesRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [doSave, profile]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const addActivity = () => {
    if (isSubmitted || activities.length >= 10) return;
    const newActivities = [
      ...activities,
      {
        id: crypto.randomUUID(),
        type: "",
        role: "",
        organization: "",
        description: "",
        years: [],
        hours_per_week: 0,
        weeks_per_year: 0,
        plan_to_continue: true,
        expanded: true,
      },
    ];
    setActivities(newActivities);
    triggerAutoSave(newActivities);
  };

  const removeActivity = (id: string) => {
    if (isSubmitted) return;
    const newActivities = activities.filter((a) => a.id !== id);
    setActivities(newActivities);
    triggerAutoSave(newActivities);
  };

  const toggleExpand = (id: string) => {
    setActivities(activities.map((a) => (a.id === id ? { ...a, expanded: !a.expanded } : a)));
  };

  const updateField = (index: number, field: string, value: any) => {
    if (isSubmitted) return;
    const newAct = [...activities];
    (newAct[index] as any)[field] = value;
    setActivities(newAct);
    triggerAutoSave(newAct);
  };

  const handleReorder = (newOrder: ActivityItem[]) => {
    if (isSubmitted) return;
    setActivities(newOrder);
    triggerAutoSave(newOrder);
  };

  const getMissingFields = (a: ActivityItem) => {
    const missing: string[] = [];
    if (!a.type) missing.push("type");
    if (!a.role?.trim()) missing.push("role");
    if (!a.organization?.trim()) missing.push("organization");
    if (!a.description?.trim()) missing.push("description");
    if (!a.years?.length) missing.push("years");
    if (!a.hours_per_week) missing.push("hours_per_week");
    if (!a.weeks_per_year) missing.push("weeks_per_year");
    return missing;
  };

  const handleSaveAndContinue = async () => {
    if (!profile) return;
    setSaving(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await doSave(activities);
    toast.success("Activities saved");
    setSaving(false);
    navigate("/applicant/responses");
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
      {/* Header */}
      <header className="border-b border-[#dbe0ec] pb-8">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
          Step 04
        </p>
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]"
              style={{ lineHeight: 1.05 }}
            >
              Activities
            </h1>
            <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
              List up to 10 extracurricular activities. Drag to reorder by importance.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0 mb-1">
            <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] border border-[#dbe0ec] px-2.5 py-1">
              {activities.length} / 10
            </span>
            <div className="flex items-center gap-2 border border-[#dbe0ec] px-3 py-1">
              {autoSaveState === "idle" && (
                <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">Ready</span>
              )}
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

      {isSubmitted && (
        <div className="border border-[#dbe0ec] bg-[#f9f9f7] px-5 py-4">
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">Your application has been submitted. This section is locked.</p>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="border border-dashed border-[#dbe0ec] p-16 flex flex-col items-center text-center">
          <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-lg mb-2">
            No Activities Added
          </p>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base mb-6 max-w-sm">
            Add activities like robotics teams, clubs, sports, work, or volunteering.
          </p>
          <button
            onClick={addActivity}
            disabled={!!isSubmitted}
            className={cn("bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors disabled:opacity-50", isSubmitted && "cursor-not-allowed")}
          >
            <div className="bg-white shrink-0 w-[5px] h-[5px]" />
            <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">
              Add First Activity
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <Reorder.Group axis="y" values={activities} onReorder={handleReorder} className="space-y-3">
            {activities.map((activity, index) => (
              <Reorder.Item
                key={activity.id}
                value={activity}
                className="border border-[#dbe0ec] bg-white overflow-hidden"
              >
                <div className="flex">
                  <div className={cn("bg-[#f9f9f7] w-10 flex items-center justify-center border-r border-[#dbe0ec] transition-colors", isSubmitted ? "cursor-not-allowed opacity-60" : "cursor-grab active:cursor-grabbing hover:bg-[#f0f0ee]")}>
                    <GripVertical className="w-4 h-4 text-[#6c6c6c]" />
                  </div>
                  <div className="flex-1">
                    <div
                      className="px-5 py-4 flex justify-between items-center cursor-pointer hover:bg-[#f9f9f7] transition-colors"
                      onClick={() => toggleExpand(activity.id)}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] shrink-0">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          {activity.type && (
                            <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.06em] mb-0.5">
                              {activity.type}
                            </p>
                          )}
                          <h4 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm truncate">
                            {activity.role || "(No Role Specified)"}{" "}
                            {activity.organization ? `at ${activity.organization}` : ""}
                          </h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!activity.expanded && getMissingFields(activity).length > 0 && (
                          <span className="flex items-center gap-1 font-['Geist_Mono',monospace] text-[10px] text-red-500">
                            <AlertCircle className="w-3 h-3" />
                            {getMissingFields(activity).length} missing
                          </span>
                        )}
                        {!isSubmitted && (
                        <button
                          className="p-1.5 text-[#6c6c6c] hover:text-black transition-colors"
                          onClick={(e) => { e.stopPropagation(); removeActivity(activity.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        )}
                        <div className="p-1.5 text-[#6c6c6c]">
                          {activity.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {activity.expanded && (
                      <div className="px-5 pb-5 pt-4 border-t border-[#dbe0ec] bg-[#f9f9f7] grid grid-cols-1 md:grid-cols-2 gap-5">
                        {(() => { const miss = new Set(getMissingFields(activity)); return (<>
                        <div>
                          <label className={labelCls}>Activity Type <span className="text-red-500">*</span></label>
                          <select className={cn(selectCls, miss.has("type") && "border-red-400")} value={activity.type} onChange={(e) => updateField(index, "type", e.target.value)}>
                            <option value="">Select type</option>
                            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Position / Role <span className="text-red-500">*</span> ({activity.role?.length || 0}/50)</label>
                          <input className={cn(fieldCls, miss.has("role") && "border-red-400")} maxLength={50} value={activity.role} onChange={(e) => updateField(index, "role", e.target.value)} placeholder="e.g. Captain, Lead Programmer" />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelCls}>Organization Name <span className="text-red-500">*</span> ({activity.organization?.length || 0}/100)</label>
                          <input className={cn(fieldCls, miss.has("organization") && "border-red-400")} maxLength={100} value={activity.organization} onChange={(e) => updateField(index, "organization", e.target.value)} placeholder="e.g. WOSS Robotics, Student Council" />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelCls}>Description <span className="text-red-500">*</span> ({activity.description?.length || 0}/150)</label>
                          <textarea className={cn(fieldCls, miss.has("description") && "border-red-400") + " h-20 resize-none"} maxLength={150} value={activity.description} onChange={(e) => updateField(index, "description", e.target.value)} placeholder="Describe your role and contributions..." />
                        </div>
                        </>); })()}
                        <div className="md:col-span-2">
                          <label className={labelCls}>Years of Participation</label>
                          <div className="flex gap-5 pt-1">
                            {["Grade 9", "Grade 10", "Grade 11", "Grade 12"].map((yr) => (
                              <label key={yr} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 border-[#dbe0ec]"
                                  checked={activity.years.includes(yr)}
                                  onChange={(e) => {
                                    const newYears = e.target.checked
                                      ? [...activity.years, yr]
                                      : activity.years.filter((y) => y !== yr);
                                    updateField(index, "years", newYears);
                                  }}
                                />
                                <span className="font-['Radio_Canada_Big',sans-serif] text-sm text-black">{yr}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Hours per week</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className={fieldCls}
                            value={activity.hours_per_week || ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              updateField(index, "hours_per_week", Math.min(parseInt(val) || 0, 168));
                            }}
                            placeholder="e.g. 5"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Weeks per year</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            className={fieldCls}
                            value={activity.weeks_per_year || ""}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              updateField(index, "weeks_per_year", Math.min(parseInt(val) || 0, 52));
                            }}
                            placeholder="e.g. 30"
                          />
                        </div>
                        <div className="md:col-span-2 border-t border-[#dbe0ec] pt-4">
                          <label className={labelCls}>Plan to continue?</label>
                          <div className="flex gap-6 pt-1">
                            {["Yes", "No"].map((opt) => (
                              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name={`continue-${activity.id}`} className="w-4 h-4" checked={opt === "Yes" ? activity.plan_to_continue : !activity.plan_to_continue} onChange={() => updateField(index, "plan_to_continue", opt === "Yes")} />
                                <span className="font-['Radio_Canada_Big',sans-serif] text-sm text-black">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {activities.length < 10 && !isSubmitted && (
            <button onClick={addActivity} className="w-full border border-dashed border-[#dbe0ec] py-4 flex items-center justify-center gap-2 hover:border-black transition-colors">
              <Plus className="w-4 h-4 text-[#6c6c6c]" />
              <span className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c]">Add Another Activity</span>
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-[#dbe0ec] px-8 py-4 flex justify-between items-center z-20">
        <button onClick={() => navigate("/applicant/profile")} className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c] hover:text-black transition-colors">
          ← Back
        </button>
        <button onClick={handleSaveAndContinue} disabled={saving || !!isSubmitted} className={cn("bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors disabled:opacity-50", isSubmitted && "cursor-not-allowed")}>
          {saving ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : (
            <>
              <div className="bg-white shrink-0 w-[5px] h-[5px]" />
              <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">Save & Continue</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
