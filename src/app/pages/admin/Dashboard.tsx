import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { Search, Loader2, ChevronDown } from "lucide-react";
import { useAllApplications } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { STATUS_LABELS } from "../../data";
import { cn } from "../../lib/utils";

const STATUS_STYLE: Record<string, string> = {
  submitted: "border-black text-black",
  under_review: "border-[#6c6c6c] text-[#6c6c6c]",
  interview_scheduled: "border-[#6c6c6c] text-[#6c6c6c]",
  accepted: "border-black text-black",
  rejected: "border-[#dbe0ec] text-[#6c6c6c]",
  draft: "border-[#dbe0ec] text-[#6c6c6c]",
};

const FILTERS = ["All", "submitted", "under_review", "interview_scheduled", "accepted", "rejected"];
const FILTER_LABELS: Record<string, string> = {
  All: "All",
  submitted: "Submitted",
  under_review: "In Review",
  interview_scheduled: "Interview",
  accepted: "Accepted",
  rejected: "Rejected",
};

const NEXT_ACTIONS: Record<string, { label: string; status: string }[]> = {
  submitted: [
    { label: "Begin Review", status: "under_review" },
    { label: "Advance to Interview", status: "interview_scheduled" },
    { label: "Decline", status: "rejected" },
  ],
  under_review: [
    { label: "Advance to Interview", status: "interview_scheduled" },
    { label: "Accept", status: "accepted" },
    { label: "Decline", status: "rejected" },
  ],
  interview_scheduled: [
    { label: "Accept", status: "accepted" },
    { label: "Decline", status: "rejected" },
    { label: "Back to Review", status: "under_review" },
  ],
  accepted: [
    { label: "Revert to Review", status: "under_review" },
  ],
  rejected: [
    { label: "Reopen for Review", status: "under_review" },
  ],
};

export function AdminDashboard() {
  const { applications, loading, refetch } = useAllApplications();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (openMenuId && tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  const handleQuickStatus = async (appId: string, newStatus: string) => {
    setUpdating(appId);
    setOpenMenuId(null);
    setStatusError(null);
    const { error } = await supabase
      .from("applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", appId);
    if (error) {
      console.error("Failed to update status:", error);
      setStatusError(`Failed to update status: ${error.message}`);
    } else {
      refetch();
    }
    setUpdating(null);
  };

  const filteredApps = applications.filter((app: any) => {
    const name = `${app.profiles?.first_name || ""} ${app.profiles?.last_name || ""}`.trim().toLowerCase();
    const pos = (app.positions?.title || "").toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || pos.includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "All" || app.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#6c6c6c]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="border-b border-[#dbe0ec] pb-7">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">
          Admin — 01
        </p>
        <div className="flex items-end justify-between">
          <h1 className="font-['Source_Serif_4',serif] text-[40px] text-black tracking-[-1.2px]" style={{ lineHeight: 1.05 }}>
            Application<br />Review
          </h1>
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] border border-[#dbe0ec] px-2.5 py-1 mb-1">
            {applications.length} total
          </span>
        </div>
      </header>

      {/* Status Error */}
      {statusError && (
        <div className="border border-red-300 bg-red-50 px-5 py-4 flex items-start justify-between gap-4">
          <p className="font-['Radio_Canada_Big',sans-serif] text-sm text-red-700">{statusError}</p>
          <button onClick={() => setStatusError(null)} className="font-['Geist_Mono',monospace] text-[11px] text-red-500 hover:text-red-700 shrink-0">Dismiss</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6c6c6c] w-4 h-4" />
          <input
            type="text"
            placeholder="Search applicants..."
            className="w-full border border-[#dbe0ec] bg-white pl-11 pr-4 py-3 font-['Radio_Canada_Big',sans-serif] text-sm text-black placeholder-[#6c6c6c] outline-none focus:border-black transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex border border-[#dbe0ec] flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-4 py-2.5 font-['Geist_Mono',monospace] text-[11px] transition-colors border-r last:border-r-0 border-[#dbe0ec]",
                activeFilter === f
                  ? "bg-black text-white"
                  : "text-[#6c6c6c] hover:text-black hover:bg-[#f9f9f7]"
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} className="border border-[#dbe0ec]">
        <div className="grid grid-cols-12 border-b border-[#dbe0ec] bg-[#f9f9f7]">
          {["#", "Applicant", "Position", "Submitted", "Status", "Actions"].map((h, i) => (
            <div
              key={i}
              className={cn(
                "px-4 py-3 font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.06em]",
                i === 0 ? "col-span-1" :
                i === 1 ? "col-span-3" :
                i === 2 ? "col-span-2" :
                i === 3 ? "col-span-2" :
                i === 4 ? "col-span-2" :
                "col-span-2 text-right"
              )}
            >
              {h}
            </div>
          ))}
        </div>

        {filteredApps.map((app: any, i: number) => {
          const name = `${app.profiles?.first_name || ""} ${app.profiles?.last_name || ""}`.trim() || app.profiles?.email || "Unknown";
          const actions = NEXT_ACTIONS[app.status] || [];
          return (
            <div
              key={app.id}
              className={cn(
                "grid grid-cols-12 items-center hover:bg-[#f9f9f7] transition-colors group",
                i !== 0 && "border-t border-[#dbe0ec]"
              )}
            >
              <div className="col-span-1 px-4 py-4">
                <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="col-span-3 px-4 py-4">
                <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">{name}</p>
                <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] mt-0.5">{app.profiles?.email}</p>
              </div>
              <div className="col-span-2 px-4 py-4">
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm">{app.positions?.title}</p>
              </div>
              <div className="col-span-2 px-4 py-4">
                <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
                  {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : "—"}
                </p>
              </div>
              <div className="col-span-2 px-4 py-4">
                <span className={cn("font-['Geist_Mono',monospace] text-[10px] border px-2 py-0.5", STATUS_STYLE[app.status] ?? "border-[#dbe0ec] text-[#6c6c6c]")}>
                  {STATUS_LABELS[app.status] || app.status}
                </span>
              </div>
              <div className="col-span-2 px-4 py-4 flex items-center justify-end gap-2">
                {/* Quick action dropdown */}
                {actions.length > 0 && app.status !== "draft" && (
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === app.id ? null : app.id)}
                      disabled={updating === app.id}
                      className="flex items-center gap-1 border border-[#dbe0ec] px-2 py-1 font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] hover:border-black hover:text-black transition-colors disabled:opacity-50"
                    >
                      {updating === app.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          Move
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                    {openMenuId === app.id && (
                      <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-[#dbe0ec] shadow-sm min-w-[160px]">
                        {actions.map((action) => (
                          <button
                            key={action.status}
                            onClick={() => handleQuickStatus(app.id, action.status)}
                            className="w-full text-left px-4 py-2.5 font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] hover:bg-[#f9f9f7] hover:text-black transition-colors border-b last:border-b-0 border-[#dbe0ec]"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <Link
                  to={`/admin/applications/${app.id}`}
                  className="font-['Geist_Mono',monospace] text-[11px] text-black opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                >
                  Review →
                </Link>
              </div>
            </div>
          );
        })}

        {filteredApps.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base">
              {searchTerm ? `No applications found matching "${searchTerm}"` : "No applications yet."}
            </p>
          </div>
        )}

        <div className="px-4 py-3 border-t border-[#dbe0ec] bg-[#f9f9f7] flex items-center justify-between">
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">{filteredApps.length} results</span>
        </div>
      </div>
    </div>
  );
}
