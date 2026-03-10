import { useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/AuthContext";
import { usePositions } from "../lib/hooks";
import { supabase } from "../lib/supabase";
import { GRADE_LEVELS } from "../data";
import { cn } from "../lib/utils";

const fieldCls =
  "w-full border border-[#dbe0ec] bg-white px-4 py-3.5 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors placeholder-[#6c6c6c]";

const selectCls =
  "w-full border border-[#dbe0ec] bg-white px-4 py-3.5 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors";

const labelCls =
  "font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] block mb-2";

export function Onboarding() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { positions, loading: positionsLoading } = usePositions();
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [grade, setGrade] = useState(profile?.grade || "");
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const openPositions = positions.filter((p: any) => p.is_open);

  const togglePosition = (id: string) => {
    setSelectedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !grade) {
      setTouched({ firstName: true, lastName: true, grade: true });
      toast.error("Please fill in all fields");
      return;
    }
    if (!profile) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        grade,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to save profile");
      setSaving(false);
      return;
    }

    // Create application and selected positions
    if (selectedPositions.size > 0) {
      const { data: appData, error: appErr } = await supabase
        .from("applications")
        .insert({ user_id: profile.id, status: "draft" })
        .select()
        .single();

      if (!appErr && appData) {
        const posInserts = [...selectedPositions].map((position_id) => ({
          application_id: appData.id,
          position_id,
        }));
        await supabase.from("application_positions").insert(posInserts);
      }
    }

    await refreshProfile();
    toast.success(`Welcome, ${firstName.trim()}! Let's get your application started.`);
    setSaving(false);
    navigate("/applicant");
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-[#a8d3ff] via-[#e8f3ff] to-[#fff4df]" />

      <div className="relative z-10 w-full max-w-lg px-6">
        <div className="flex items-center gap-2.5 mb-12 justify-center">
          <div className="w-2 h-2 bg-black" />
          <span className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm tracking-tight">
            WOSS Robotics
          </span>
        </div>

        <div className="bg-white border-2 border-black p-8 md:p-10">
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
            Welcome
          </p>
          <h1
            className="font-['Source_Serif_4',serif] text-[32px] text-black tracking-[-1px] mb-2"
            style={{ lineHeight: 1.1 }}
          >
            Let's get started
          </h1>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base tracking-[-0.3px] mb-8">
            Tell us a bit about yourself before continuing to the application portal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={`${fieldCls} ${touched.firstName && !firstName.trim() ? "border-red-400" : ""}`}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
                  placeholder="First"
                />
              </div>
              <div>
                <label className={labelCls}>
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  className={`${fieldCls} ${touched.lastName && !lastName.trim() ? "border-red-400" : ""}`}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
                  placeholder="Last"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Grade <span className="text-red-500">*</span>
              </label>
              <select
                className={`${selectCls} ${touched.grade && !grade ? "border-red-400" : ""}`}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, grade: true }))}
              >
                <option value="">Select your grade</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Position Selection */}
            {!positionsLoading && openPositions.length > 0 && (
              <div>
                <label className={labelCls}>
                  Positions you're interested in
                </label>
                <div className="space-y-0 border border-[#dbe0ec]">
                  {openPositions.map((pos: any) => {
                    const isSelected = selectedPositions.has(pos.id);
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => togglePosition(pos.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[#dbe0ec] last:border-b-0",
                          isSelected ? "bg-[#f5f5f3]" : "hover:bg-[#f9f9f7]"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 border flex items-center justify-center shrink-0",
                          isSelected ? "border-black bg-black" : "border-[#dbe0ec]"
                        )}>
                          {isSelected ? <Check className="w-2.5 h-2.5 text-white" /> : <Plus className="w-2.5 h-2.5 text-[#ccc]" />}
                        </div>
                        <span className="font-['Radio_Canada_Big',sans-serif] text-sm text-black">{pos.title}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-xs mt-2">
                  You can change your selection later in the portal.
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-black flex gap-[10px] items-center justify-center px-5 py-4 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <>
                    <div className="bg-white shrink-0 w-[5px] h-[5px]" />
                    <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">
                      Continue to Portal
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] text-center mt-6">
          WOSS Robotics · 2026-2027 Executive Applications
        </p>
      </div>
    </div>
  );
}
