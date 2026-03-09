import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
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
  const navigate = useNavigate();
  const [honors, setHonors] = useState<HonorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
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

  const addHonor = () => {
    if (honors.length >= 5) return;
    setHonors([...honors, { id: crypto.randomUUID(), title: "", grade_level: "", recognition_level: "" }]);
  };

  const removeHonor = (id: string) => {
    setHonors(honors.filter((h) => h.id !== id));
  };

  const updateHonor = (id: string, field: string, value: string) => {
    setHonors(honors.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    // Fetch current DB honors to determine what to insert/update/delete
    const { data: existing } = await supabase.from("honors").select("id").eq("user_id", profile.id);
    const existingIds = new Set((existing || []).map((h: any) => h.id));
    const currentIds = new Set(honors.map((h) => h.id));

    // Delete removed honors individually
    for (const eh of existing || []) {
      if (!currentIds.has(eh.id)) {
        const { error } = await supabase.from("honors").delete().eq("id", eh.id);
        if (error) console.error("Failed to delete honor:", eh.id, error);
      }
    }

    // Upsert each honor
    for (let i = 0; i < honors.length; i++) {
      const h = honors[i];
      const row = {
        id: h.id,
        user_id: profile.id,
        title: h.title,
        grade_level: h.grade_level,
        recognition_level: h.recognition_level,
        sort_order: i,
      };

      if (existingIds.has(h.id)) {
        const { error } = await supabase.from("honors").update(row).eq("id", h.id);
        if (error) console.error("Failed to update honor:", h.id, error);
      } else {
        const { error } = await supabase.from("honors").insert(row);
        if (error) console.error("Failed to insert honor:", h.id, error);
      }
    }

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
      {/* Header */}
      <header className="border-b border-[#dbe0ec] pb-8">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
          Step 06
        </p>
        <div className="flex items-end justify-between">
          <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
            Honors &<br />Awards
          </h1>
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] border border-[#dbe0ec] px-2.5 py-1 mb-1">
            {honors.length} / 5
          </span>
        </div>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          List up to 5 academic or extracurricular recognitions you have received.
        </p>
      </header>

      {honors.length === 0 ? (
        <div className="border border-dashed border-[#dbe0ec] p-16 flex flex-col items-center text-center">
          <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-lg mb-2">No Honors Added</p>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base mb-6 max-w-sm">Add any recognitions or awards you are proud of.</p>
          <button onClick={addHonor} className="bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors">
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
                    <label className={labelCls}>Honor Title ({honor.title.length}/100)</label>
                    <input className={fieldCls} value={honor.title} onChange={(e) => updateHonor(honor.id, "title", e.target.value)} placeholder="e.g. Skills Ontario Robotics Award" maxLength={100} />
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelCls}>Grade Level</label>
                    <select className={selectCls} value={honor.grade_level} onChange={(e) => updateHonor(honor.id, "grade_level", e.target.value)}>
                      <option value="">Select</option>
                      {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className={labelCls}>Recognition Level</label>
                    <select className={selectCls} value={honor.recognition_level} onChange={(e) => updateHonor(honor.id, "recognition_level", e.target.value)}>
                      <option value="">Select</option>
                      {RECOGNITION_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => removeHonor(honor.id)} className="p-1.5 text-[#6c6c6c] hover:text-black transition-colors shrink-0 mt-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {honors.length < 5 && (
            <button onClick={addHonor} className="w-full border-t border-dashed border-[#dbe0ec] py-4 flex items-center justify-center gap-2 hover:bg-[#f9f9f7] transition-colors">
              <Plus className="w-4 h-4 text-[#6c6c6c]" />
              <span className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c]">Add Another Honor</span>
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-[#dbe0ec] px-8 py-4 flex justify-between items-center z-20">
        <button onClick={() => navigate("/applicant/responses")} className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c] hover:text-black transition-colors">
          ← Back
        </button>
        <button onClick={handleSave} disabled={saving} className="bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors disabled:opacity-50">
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
