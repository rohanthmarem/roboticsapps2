import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { supabase } from "../../lib/supabase";
import { GRADE_LEVELS } from "../../data";

const fieldCls =
  "w-full border border-[#dbe0ec] bg-white px-4 py-3 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors placeholder-[#6c6c6c]";

const selectCls =
  "w-full border border-[#dbe0ec] bg-white px-4 py-3 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors";

const labelCls = "font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] block mb-2";

export function ApplicantProfile() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    grade: "",
    student_number: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone: profile.phone || "",
        grade: profile.grade || "",
        student_number: profile.student_number || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        ...form,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
    if (error) {
      console.error("Failed to save profile:", error);
      alert(`Failed to save profile: ${error.message}`);
      setSaving(false);
      return;
    }
    await refreshProfile();
    setSaving(false);
    navigate("/applicant/activities");
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="border-b border-[#dbe0ec] pb-8">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
          Step 03
        </p>
        <h1
          className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]"
          style={{ lineHeight: 1.05 }}
        >
          Profile<br />Details
        </h1>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          Basic information about you.
        </p>
      </header>

      {/* Personal Info */}
      <section>
        <div className="flex items-center justify-between py-5 border-t border-[#dbe0ec]">
          <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">
            Personal Information
          </h2>
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">001</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>First Name</label>
            <input
              className={fieldCls}
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              placeholder="Your first name"
            />
          </div>
          <div>
            <label className={labelCls}>Last Name</label>
            <input
              className={fieldCls}
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder="Your last name"
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              className={fieldCls + " opacity-60 cursor-not-allowed"}
              type="email"
              value={profile?.email || ""}
              disabled
            />
          </div>
          <div>
            <label className={labelCls}>Phone Number</label>
            <input
              className={fieldCls}
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className={labelCls}>Current Grade</label>
            <select
              className={selectCls}
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
            >
              <option value="">Select Grade</option>
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Student Number</label>
            <input
              className={fieldCls}
              value={form.student_number}
              onChange={(e) => setForm({ ...form, student_number: e.target.value })}
              placeholder="e.g. 123456"
            />
          </div>
        </div>
      </section>

      {/* Footer nav */}
      <div className="flex justify-between items-center pt-6 border-t border-[#dbe0ec]">
        <button
          onClick={() => navigate("/applicant/positions")}
          className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c] hover:text-black transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <>
              <div className="bg-white shrink-0 w-[5px] h-[5px]" />
              <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">
                Save & Continue
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
