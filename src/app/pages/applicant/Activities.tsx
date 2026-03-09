import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Reorder } from "motion/react";
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
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
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
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

  const addActivity = () => {
    if (activities.length >= 10) return;
    setActivities([
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
    ]);
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter((a) => a.id !== id));
  };

  const toggleExpand = (id: string) => {
    setActivities(activities.map((a) => (a.id === id ? { ...a, expanded: !a.expanded } : a)));
  };

  const updateField = (index: number, field: string, value: any) => {
    const newAct = [...activities];
    (newAct[index] as any)[field] = value;
    setActivities(newAct);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    // Fetch current DB activities to determine what to insert/update/delete
    const { data: existing } = await supabase.from("activities").select("id").eq("user_id", profile.id);
    const existingIds = new Set((existing || []).map((a: any) => a.id));
    const currentIds = new Set(activities.map((a) => a.id));

    // Delete removed activities individually
    for (const ea of existing || []) {
      if (!currentIds.has(ea.id)) {
        const { error } = await supabase.from("activities").delete().eq("id", ea.id);
        if (error) console.error("Failed to delete activity:", ea.id, error);
      }
    }

    // Upsert each activity
    for (let i = 0; i < activities.length; i++) {
      const a = activities[i];
      const row = {
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
      };

      if (existingIds.has(a.id)) {
        const { error } = await supabase.from("activities").update(row).eq("id", a.id);
        if (error) console.error("Failed to update activity:", a.id, error);
      } else {
        const { error } = await supabase.from("activities").insert(row);
        if (error) console.error("Failed to insert activity:", a.id, error);
      }
    }

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
          <h1
            className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]"
            style={{ lineHeight: 1.05 }}
          >
            Activities
          </h1>
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] border border-[#dbe0ec] px-2.5 py-1 mb-1">
            {activities.length} / 10
          </span>
        </div>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          List up to 10 extracurricular activities. Drag to reorder by importance.
        </p>
      </header>

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
            className="bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors"
          >
            <div className="bg-white shrink-0 w-[5px] h-[5px]" />
            <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">
              Add First Activity
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <Reorder.Group axis="y" values={activities} onReorder={setActivities} className="space-y-3">
            {activities.map((activity, index) => (
              <Reorder.Item
                key={activity.id}
                value={activity}
                className="border border-[#dbe0ec] bg-white overflow-hidden"
              >
                <div className="flex">
                  <div className="bg-[#f9f9f7] w-10 flex items-center justify-center border-r border-[#dbe0ec] cursor-grab active:cursor-grabbing hover:bg-[#f0f0ee] transition-colors">
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
                        <button
                          className="p-1.5 text-[#6c6c6c] hover:text-black transition-colors"
                          onClick={(e) => { e.stopPropagation(); removeActivity(activity.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="p-1.5 text-[#6c6c6c]">
                          {activity.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {activity.expanded && (
                      <div className="px-5 pb-5 pt-4 border-t border-[#dbe0ec] bg-[#f9f9f7] grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className={labelCls}>Activity Type</label>
                          <select className={selectCls} value={activity.type} onChange={(e) => updateField(index, "type", e.target.value)}>
                            <option value="">Select type</option>
                            {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Position / Role ({activity.role?.length || 0}/50)</label>
                          <input className={fieldCls} maxLength={50} value={activity.role} onChange={(e) => updateField(index, "role", e.target.value)} placeholder="e.g. Captain, Lead Programmer" />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelCls}>Organization Name ({activity.organization?.length || 0}/100)</label>
                          <input className={fieldCls} maxLength={100} value={activity.organization} onChange={(e) => updateField(index, "organization", e.target.value)} placeholder="e.g. WOSS Robotics, Student Council" />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelCls}>Description ({activity.description?.length || 0}/150)</label>
                          <textarea className={fieldCls + " h-20 resize-none"} maxLength={150} value={activity.description} onChange={(e) => updateField(index, "description", e.target.value)} placeholder="Describe your role and contributions..." />
                        </div>
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
                          <input type="number" min={0} max={168} className={fieldCls} value={activity.hours_per_week || ""} onChange={(e) => updateField(index, "hours_per_week", parseInt(e.target.value) || 0)} placeholder="e.g. 5" />
                        </div>
                        <div>
                          <label className={labelCls}>Weeks per year</label>
                          <input type="number" min={0} max={52} className={fieldCls} value={activity.weeks_per_year || ""} onChange={(e) => updateField(index, "weeks_per_year", parseInt(e.target.value) || 0)} placeholder="e.g. 30" />
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

          {activities.length < 10 && (
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
        <button onClick={handleSave} disabled={saving} className="bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors disabled:opacity-50">
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
