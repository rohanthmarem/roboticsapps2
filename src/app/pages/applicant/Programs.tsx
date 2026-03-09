import { useState } from "react";
import { motion } from "motion/react";
import { Search, Check, Plus, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { usePositions, useApplications, useSettings } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

export function ApplicantPrograms() {
  const { profile } = useAuth();
  const { positions, loading: positionsLoading } = usePositions();
  const { applications, loading: appsLoading, refetch } = useApplications(profile?.id);
  const { settings, loading: settingsLoading } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  const appWindowOpen = settings.application_window_open === true || settings.application_window_open === "true";

  const appliedPositionIds = new Set(applications.map((a: any) => a.position_id));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sync selectedIds when applications load
  if (appsLoading) {
    // wait
  } else if (selectedIds.size === 0 && appliedPositionIds.size > 0 && selectedIds !== appliedPositionIds) {
    // Initial sync
  }

  const toggleSelection = (positionId: string) => {
    if (appliedPositionIds.has(positionId)) return; // already applied, can't toggle
    const newSet = new Set(selectedIds);
    if (newSet.has(positionId)) {
      newSet.delete(positionId);
    } else {
      newSet.add(positionId);
    }
    setSelectedIds(newSet);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    // Create applications for newly selected positions
    for (const posId of selectedIds) {
      if (!appliedPositionIds.has(posId)) {
        const { error } = await supabase.from("applications").insert({
          user_id: profile.id,
          position_id: posId,
          status: "draft",
        });
        if (error) console.error("Failed to create application for position:", posId, error);
      }
    }
    await refetch();
    setSelectedIds(new Set());
    setSaving(false);
  };

  const filteredPositions = positions.filter(
    (p: any) =>
      p.is_open &&
      (p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (positionsLoading || appsLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#6c6c6c]" />
      </div>
    );
  }

  if (!appWindowOpen && applications.length === 0) {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="border-b border-[#dbe0ec] pb-8">
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Step 02</p>
          <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
            Executive<br />Positions
          </h1>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
            The application window is currently closed. Check back when applications open.
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      {/* Header */}
      <header className="border-b border-[#dbe0ec] pb-8">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
          Step 02
        </p>
        <h1
          className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]"
          style={{ lineHeight: 1.05 }}
        >
          Executive<br />Positions
        </h1>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          Browse available positions and select the ones you want to apply for.
        </p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c6c6c] w-4 h-4" />
        <input
          type="text"
          placeholder="Search positions..."
          className="w-full border border-[#dbe0ec] bg-white pl-11 pr-4 py-3.5 font-['Radio_Canada_Big',sans-serif] text-sm text-black placeholder-[#6c6c6c] outline-none focus:border-black transition-colors"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Position list */}
      <div className="space-y-0 border border-[#dbe0ec]">
        {filteredPositions.map((pos: any, i: number) => {
          const isApplied = appliedPositionIds.has(pos.id);
          const isSelected = selectedIds.has(pos.id) || isApplied;
          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              key={pos.id}
              className={cn("p-6", i !== 0 && "border-t border-[#dbe0ec]")}
            >
              <button
                onClick={() => toggleSelection(pos.id)}
                disabled={isApplied}
                className={cn(
                  "w-full flex items-center justify-between text-left transition-colors",
                  isApplied && "opacity-70 cursor-not-allowed"
                )}
              >
                <div className="flex items-start gap-4 flex-1">
                  <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] mt-0.5 w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-lg tracking-[-0.3px]">
                      {pos.title}
                    </h3>
                    <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base mt-0.5 tracking-[-0.2px]">
                      {pos.description}
                    </p>
                    {isApplied && (
                      <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] border border-[#dbe0ec] px-2 py-0.5 mt-2 inline-block">
                        Already Applied
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "w-5 h-5 border flex items-center justify-center shrink-0 ml-4",
                    isSelected ? "border-black bg-black" : "border-[#dbe0ec]"
                  )}
                >
                  {isSelected ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : (
                    <Plus className="w-3 h-3 text-[#6c6c6c]" />
                  )}
                </div>
              </button>
            </motion.div>
          );
        })}
        {filteredPositions.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base">
              No positions matching "{searchTerm}"
            </p>
          </div>
        )}
      </div>

      {/* Fixed footer */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-60 right-0 bg-white border-t border-[#dbe0ec] px-8 py-4 flex justify-between items-center z-20">
          <div>
            <span className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">
              {selectedIds.size} new position{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] mt-0.5">
              This will create draft applications for your selected positions.
            </p>
          </div>
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
                  Save Selection
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
