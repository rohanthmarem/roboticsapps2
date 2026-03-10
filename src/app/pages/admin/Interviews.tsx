import { useState, useEffect, useMemo } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { Plus, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

const fieldCls =
  "w-full border border-[#dbe0ec] bg-white px-4 py-3 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors placeholder-[#6c6c6c]";

const labelCls =
  "font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] block mb-2";

/* ─── Visual Timeline Constants ─── */
const TIMELINE_START_HOUR = 8;
const TIMELINE_END_HOUR = 18;
const TOTAL_BLOCKS = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 2; // 30-min blocks

function blockToTime(block: number): string {
  const totalMinutes = (TIMELINE_START_HOUR * 60) + (block * 30);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToBlock(time: string): number | null {
  if (!time) return null;
  const [hStr, mStr] = time.split(":");
  const totalMinutes = parseInt(hStr) * 60 + parseInt(mStr);
  const offset = totalMinutes - TIMELINE_START_HOUR * 60;
  if (offset < 0 || offset > (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60) return null;
  return Math.round(offset / 30);
}

function formatTimeLabel(block: number): string {
  const totalMinutes = (TIMELINE_START_HOUR * 60) + (block * 30);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}`;
}

function stripSeconds(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}

/* ─── Timeline Picker Component ─── */
function TimelinePicker({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: {
  startTime: string;
  endTime: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  const startBlock = timeToBlock(startTime);
  const endBlock = timeToBlock(endTime);

  const handleBlockClick = (block: number) => {
    const time = blockToTime(block);
    if (startBlock === null || (startBlock !== null && endBlock !== null)) {
      // No selection or both set -> start fresh
      onStartChange(time);
      onEndChange("");
    } else {
      // Start is set, set end
      if (block <= startBlock) {
        // Clicked before or on start -> reset
        onStartChange(time);
        onEndChange("");
      } else {
        onEndChange(blockToTime(block));
      }
    }
  };

  // Hour labels (only show on the hour)
  const hourLabels: { block: number; label: string }[] = [];
  for (let i = 0; i <= TOTAL_BLOCKS; i += 2) {
    hourLabels.push({ block: i, label: formatTimeLabel(i) });
  }

  return (
    <div className="mb-4">
      <p className={labelCls}>Select Time Range</p>
      {/* Hour labels */}
      <div className="relative h-4 mb-1">
        {hourLabels.map(({ block, label }) => (
          <span
            key={block}
            className="absolute font-['Geist_Mono',monospace] text-[9px] text-[#6c6c6c] -translate-x-1/2"
            style={{ left: `${(block / TOTAL_BLOCKS) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>
      {/* Timeline blocks */}
      <div className="flex h-10 border border-[#dbe0ec]">
        {Array.from({ length: TOTAL_BLOCKS }).map((_, i) => {
          const isInRange =
            startBlock !== null &&
            endBlock !== null &&
            i >= startBlock &&
            i < endBlock;
          const isStart = startBlock === i;
          const isHourBoundary = i % 2 === 0 && i !== 0;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleBlockClick(i)}
              className={cn(
                "flex-1 transition-colors relative",
                isHourBoundary && "border-l border-[#dbe0ec]",
                !isHourBoundary && i !== 0 && "border-l border-[#f0f0ee]",
                isInRange && "bg-black",
                isStart && !endTime && "bg-black",
                !isInRange && !isStart && "bg-white hover:bg-[#f5f5f3]",
              )}
              title={formatTimeLabel(i)}
            />
          );
        })}
      </div>
      {/* Fine-tune inputs */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className={labelCls}>Start Time</label>
          <input
            type="time"
            className={fieldCls}
            value={startTime}
            onChange={(e) => onStartChange(e.target.value)}
            step="60"
          />
        </div>
        <div>
          <label className={labelCls}>End Time</label>
          <input
            type="time"
            className={fieldCls}
            value={endTime}
            onChange={(e) => onEndChange(e.target.value)}
            step="60"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Calendar Component (shared by both views) ─── */
function Calendar({
  currentMonth,
  setCurrentMonth,
  selectedDate,
  setSelectedDate,
  slotCountByDate,
  bookedCountByDate,
  disablePast = false,
}: {
  currentMonth: Date;
  setCurrentMonth: (d: Date) => void;
  selectedDate: string | null;
  setSelectedDate: (d: string | null) => void;
  slotCountByDate: Record<string, number>;
  bookedCountByDate: Record<string, number>;
  disablePast?: boolean;
}) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="p-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">
          {format(currentMonth, "MMMM yyyy")}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="text-[#6c6c6c] hover:text-black transition-colors p-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="text-[#6c6c6c] hover:text-black transition-colors p-1"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayHeaders.map((d) => (
          <div key={d} className="text-center py-2">
            <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase">
              {d}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, currentMonth);
          const openCount = slotCountByDate[dateStr] || 0;
          const bookedCount = bookedCountByDate[dateStr] || 0;
          const isSelected = selectedDate === dateStr;
          const todayDate = isToday(day);
          const isPast = disablePast && isBefore(day, startOfDay(new Date()));
          const isClickable = inMonth && !isPast;

          return (
            <button
              key={dateStr}
              disabled={!isClickable}
              onClick={() => {
                if (isClickable) setSelectedDate(dateStr);
              }}
              className={cn(
                "flex flex-col items-center py-2 transition-colors relative",
                !inMonth && "opacity-0 pointer-events-none",
                isPast && inMonth && "opacity-40 cursor-not-allowed",
                isClickable && !isSelected && "cursor-pointer hover:bg-[#f5f5f3]",
                isSelected && !isPast && "bg-black text-white",
                todayDate && !isSelected && !isPast && "border border-black",
              )}
            >
              <span
                className={cn(
                  "font-['Geist_Mono',monospace] text-[13px]",
                  inMonth && openCount === 0 && bookedCount === 0 && !isSelected && "text-[#999]",
                  inMonth && (openCount > 0 || bookedCount > 0) && !isSelected && "text-black",
                  isSelected && "text-white",
                )}
              >
                {format(day, "d")}
              </span>
              {/* Indicators */}
              {inMonth && (bookedCount > 0 || openCount > 0) && (
                <div className="flex items-center gap-1 mt-0.5">
                  {bookedCount > 0 && (
                    <span
                      className={cn(
                        "font-['Geist_Mono',monospace] text-[8px] px-1",
                        isSelected ? "text-emerald-300" : "text-emerald-600 bg-emerald-50",
                      )}
                    >
                      {bookedCount}
                    </span>
                  )}
                  {openCount > 0 && (
                    <span
                      className={cn(
                        "font-['Geist_Mono',monospace] text-[8px] px-1",
                        isSelected ? "text-white/70" : "text-[#6c6c6c]",
                      )}
                    >
                      {openCount}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export function AdminInterviews() {
  const [view, setView] = useState<"overview" | "slots">("overview");
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [interviewApplicants, setInterviewApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // New slot form
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newInterviewer, setNewInterviewer] = useState("");

  const fetchData = async () => {
    const [slotsRes, bookingsRes, applicantsRes] = await Promise.all([
      supabase
        .from("interview_slots")
        .select("*")
        .order("date")
        .order("start_time"),
      supabase
        .from("interview_bookings")
        .select(
          "*, interview_slots(*), profiles(first_name, last_name, email), applications(id, application_positions(positions(title)))",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("application_positions")
        .select(
          "*, applications!inner(id, status, user_id, profiles(first_name, last_name, email)), positions(title)",
        )
        .eq("applications.status", "interview_scheduled"),
    ]);

    setSlots(slotsRes.data || []);
    setBookings(bookingsRes.data || []);
    setInterviewApplicants(applicantsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSlot = async () => {
    if (!selectedDate || !newStart || !newEnd) return;
    setAdding(true);
    const { error } = await supabase.from("interview_slots").insert({
      date: selectedDate,
      start_time: newStart,
      end_time: newEnd,
      interviewer_name: newInterviewer || null,
    });
    if (error) {
      console.error("Failed to add interview slot:", error);
      setAdding(false);
      return;
    }
    setNewStart("");
    setNewEnd("");
    setNewInterviewer("");
    await fetchData();
    setAdding(false);
  };

  const handleDeleteSlot = async (id: string) => {
    const { error } = await supabase.from("interview_slots").delete().eq("id", id);
    if (error) console.error("Failed to delete interview slot:", error);
    await fetchData();
  };

  /* ─── Derived data ─── */

  // Open (unbooked) slot counts per date
  const openSlotCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    slots
      .filter((s) => !s.is_booked)
      .forEach((s) => {
        counts[s.date] = (counts[s.date] || 0) + 1;
      });
    return counts;
  }, [slots]);

  // Booked slot counts per date
  const bookedCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      const date = b.interview_slots?.date;
      if (date) counts[date] = (counts[date] || 0) + 1;
    });
    return counts;
  }, [bookings]);

  // Map application_id -> booking for overview matching
  const bookingsByApplicationId = useMemo(() => {
    const map: Record<string, any> = {};
    bookings.forEach((b) => {
      if (b.application_id) map[b.application_id] = b;
    });
    return map;
  }, [bookings]);

  // Slots for currently selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return slots.filter((s) => s.date === selectedDate);
  }, [slots, selectedDate]);

  /* ─── Overview table data ─── */
  const overviewRows = useMemo(() => {
    return interviewApplicants.map((ap: any) => {
      const app = ap.applications;
      const profile = app?.profiles;
      const name =
        `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
        profile?.email ||
        "Unknown";
      const email = profile?.email || "";
      const position = ap.positions?.title || "—";
      const booking = bookingsByApplicationId[app?.id];
      const slot = booking?.interview_slots;

      return {
        id: ap.id,
        name,
        email,
        position,
        hasBooking: !!booking,
        date: slot?.date ? format(parseISO(slot.date), "MMM d, yyyy") : null,
        time: slot?.start_time ? stripSeconds(slot.start_time) : null,
      };
    });
  }, [interviewApplicants, bookingsByApplicationId]);

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
          Admin — 02
        </p>
        <h1
          className="font-['Source_Serif_4',serif] text-[40px] text-black tracking-[-1.2px]"
          style={{ lineHeight: 1.05 }}
        >
          Interview
          <br />
          Management
        </h1>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          Track applicant interviews and manage availability slots.
        </p>
      </header>

      {/* View Toggle */}
      <div className="flex items-center gap-0 border border-[#dbe0ec] w-fit">
        <button
          onClick={() => setView("overview")}
          className={cn(
            "px-5 py-2.5 font-['Geist_Mono',monospace] text-[11px] uppercase tracking-[0.08em] transition-colors",
            view === "overview"
              ? "bg-black text-white"
              : "bg-white text-[#6c6c6c] hover:text-black",
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setView("slots")}
          className={cn(
            "px-5 py-2.5 font-['Geist_Mono',monospace] text-[11px] uppercase tracking-[0.08em] transition-colors",
            view === "slots"
              ? "bg-black text-white"
              : "bg-white text-[#6c6c6c] hover:text-black",
          )}
        >
          Manage Slots
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* OVERVIEW VIEW                                      */}
      {/* ═══════════════════════════════════════════════════ */}
      {view === "overview" && (
        <>
          {/* Applicant Table */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">
                Interview Applicants
              </h2>
              <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
                {overviewRows.length} in interview stage
              </span>
            </div>

            {overviewRows.length > 0 ? (
              <div className="border border-[#dbe0ec]">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#f9f9f7] border-b border-[#dbe0ec]">
                  <div className="col-span-3">
                    <span className={labelCls}>Name</span>
                  </div>
                  <div className="col-span-3">
                    <span className={labelCls}>Email</span>
                  </div>
                  <div className="col-span-2">
                    <span className={labelCls}>Position</span>
                  </div>
                  <div className="col-span-2">
                    <span className={labelCls}>Status</span>
                  </div>
                  <div className="col-span-2">
                    <span className={labelCls}>Date / Time</span>
                  </div>
                </div>

                {/* Table rows */}
                {overviewRows.map((row: any, i: number) => (
                  <div
                    key={row.id}
                    className={cn(
                      "grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[#f9f9f7] transition-colors",
                      i !== 0 && "border-t border-[#dbe0ec]",
                    )}
                  >
                    <div className="col-span-3">
                      <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">
                        {row.name}
                      </p>
                    </div>
                    <div className="col-span-3">
                      <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm truncate">
                        {row.email}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-['Source_Serif_4',serif] text-black text-sm">
                        {row.position}
                      </p>
                    </div>
                    <div className="col-span-2">
                      {row.hasBooking ? (
                        <span className="font-['Geist_Mono',monospace] text-[10px] border border-emerald-600 text-emerald-700 bg-emerald-50 px-2 py-0.5 inline-block">
                          Confirmed
                        </span>
                      ) : (
                        <span className="font-['Geist_Mono',monospace] text-[10px] border border-[#dbe0ec] text-[#6c6c6c] px-2 py-0.5 inline-block">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {row.hasBooking ? (
                        <div>
                          <p className="font-['Geist_Mono',monospace] text-[11px] text-black">
                            {row.date}
                          </p>
                          <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] mt-0.5">
                            {row.time}
                          </p>
                        </div>
                      ) : (
                        <span className="font-['Geist_Mono',monospace] text-[11px] text-[#999]">
                          —
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-[#dbe0ec] bg-white px-6 py-10 text-center">
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm">
                  No applicants in the interview stage yet.
                </p>
              </div>
            )}
          </section>

          {/* Calendar in overview */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">
                Interview Calendar
              </h2>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 inline-block" />
                  <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">
                    Booked
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#6c6c6c] inline-block" />
                  <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">
                    Open
                  </span>
                </span>
              </div>
            </div>
            <div className="bg-[#f9f9f7] border border-[#dbe0ec]">
              <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                slotCountByDate={openSlotCountByDate}
                bookedCountByDate={bookedCountByDate}
                disablePast
              />

              {/* Selected date detail in overview */}
              {selectedDate && (
                <div className="border-t border-[#dbe0ec] p-6">
                  <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm mb-4">
                    {format(parseISO(selectedDate), "EEEE, MMMM do")}
                  </p>

                  {/* Bookings for this date */}
                  {bookings.filter((b) => b.interview_slots?.date === selectedDate).length > 0 && (
                    <div className="mb-4">
                      <p className={cn(labelCls, "mb-2")}>Booked Interviews</p>
                      <div className="border border-[#dbe0ec] space-y-0">
                        {bookings
                          .filter((b) => b.interview_slots?.date === selectedDate)
                          .map((item: any, i: number) => {
                            const name =
                              `${item.profiles?.first_name || ""} ${item.profiles?.last_name || ""}`.trim() ||
                              item.profiles?.email ||
                              "Unknown";
                            const slot = item.interview_slots;
                            return (
                              <div
                                key={item.id}
                                className={cn(
                                  "flex items-center justify-between px-4 py-3 bg-white",
                                  i !== 0 && "border-t border-[#dbe0ec]",
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-2 h-2 bg-emerald-500 inline-block" />
                                  <p className="font-['Radio_Canada_Big',sans-serif] text-black text-sm">
                                    {name}
                                  </p>
                                </div>
                                <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
                                  {stripSeconds(slot?.start_time)} – {stripSeconds(slot?.end_time)}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Open slots for this date */}
                  {slots.filter((s) => s.date === selectedDate && !s.is_booked).length > 0 ? (
                    <div>
                      <p className={cn(labelCls, "mb-2")}>Open Slots</p>
                      <div className="border border-[#dbe0ec] space-y-0">
                        {slots
                          .filter((s) => s.date === selectedDate && !s.is_booked)
                          .map((slot: any, i: number) => (
                            <div
                              key={slot.id}
                              className={cn(
                                "flex items-center justify-between px-4 py-3 bg-white",
                                i !== 0 && "border-t border-[#dbe0ec]",
                              )}
                            >
                              <p className="font-['Radio_Canada_Big',sans-serif] text-black text-sm">
                                {stripSeconds(slot.start_time)} – {stripSeconds(slot.end_time)}
                              </p>
                              {slot.interviewer_name && (
                                <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c]">
                                  w/ {slot.interviewer_name}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    !bookings.filter((b) => b.interview_slots?.date === selectedDate).length && (
                      <div className="border border-[#dbe0ec] bg-white px-4 py-6 text-center">
                        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm">
                          No interviews or open slots on this date.
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}

              {!selectedDate && (
                <div className="border-t border-[#dbe0ec] p-6 text-center">
                  <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm">
                    Click a date to see interview details.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* MANAGE SLOTS VIEW                                  */}
      {/* ═══════════════════════════════════════════════════ */}
      {view === "slots" && (
        <>
          {/* Booked interviews summary */}
          {bookings.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">
                  Booked Interviews
                </h2>
                <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
                  {bookings.length} scheduled
                </span>
              </div>

              <div className="border border-[#dbe0ec] space-y-0">
                {bookings.map((item: any, i: number) => {
                  const name =
                    `${item.profiles?.first_name || ""} ${item.profiles?.last_name || ""}`.trim() ||
                    item.profiles?.email ||
                    "Unknown";
                  const slot = item.interview_slots;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between px-6 py-5 hover:bg-[#f9f9f7] transition-colors",
                        i !== 0 && "border-t border-[#dbe0ec]",
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] w-6 mt-0.5">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">
                            {name}
                          </p>
                          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-0.5">
                            {item.applications?.application_positions
                              ?.map((ap: any) => ap.positions?.title)
                              .filter(Boolean)
                              .join(", ") || "Position"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-['Geist_Mono',monospace] text-[11px] text-black">
                            {slot ? format(parseISO(slot.date), "MMM d") : "—"}
                          </p>
                          <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] mt-0.5">
                            {stripSeconds(slot?.start_time)}
                          </p>
                        </div>
                        {slot?.interviewer_name && (
                          <span className="font-['Source_Serif_4',serif] text-sm text-[#6c6c6c] hidden md:block">
                            w/ {slot.interviewer_name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Available slots with calendar */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">
                Available Slots
              </h2>
              <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
                {slots.filter((s) => !s.is_booked).length} open
              </span>
            </div>

            <div className="bg-[#f9f9f7] border border-[#dbe0ec]">
              <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                slotCountByDate={openSlotCountByDate}
                bookedCountByDate={bookedCountByDate}
                disablePast
              />

              {/* Day detail panel */}
              {selectedDate && (
                <div className="border-t border-[#dbe0ec] p-6">
                  <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm mb-4">
                    {format(parseISO(selectedDate), "EEEE, MMMM do")}
                  </p>

                  {/* Existing slots for this date */}
                  {slotsForSelectedDate.length > 0 ? (
                    <div className="space-y-0 border border-[#dbe0ec] mb-4">
                      {slotsForSelectedDate.map((slot, i) => (
                        <div
                          key={slot.id}
                          className={cn(
                            "flex items-center justify-between px-4 py-3 bg-white",
                            i !== 0 && "border-t border-[#dbe0ec]",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] w-5">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <p className="font-['Radio_Canada_Big',sans-serif] text-black text-sm">
                                {stripSeconds(slot.start_time)} – {stripSeconds(slot.end_time)}
                              </p>
                              {slot.interviewer_name && (
                                <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] mt-0.5">
                                  Interviewer: {slot.interviewer_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "font-['Geist_Mono',monospace] text-[10px] border px-2 py-0.5",
                                slot.is_booked
                                  ? "border-emerald-600 text-emerald-700 bg-emerald-50"
                                  : "border-[#dbe0ec] text-[#6c6c6c]",
                              )}
                            >
                              {slot.is_booked ? "Booked" : "Open"}
                            </span>
                            {!slot.is_booked && (
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="text-[#6c6c6c] hover:text-black transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-[#dbe0ec] bg-white px-4 py-6 text-center mb-4">
                      <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm">
                        No slots for this date yet.
                      </p>
                    </div>
                  )}

                  {/* Inline add slot form with visual timeline */}
                  <div className="border border-dashed border-[#dbe0ec] bg-white px-4 py-4">
                    <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] mb-3">
                      Add Slot
                    </p>

                    <TimelinePicker
                      startTime={newStart}
                      endTime={newEnd}
                      onStartChange={setNewStart}
                      onEndChange={setNewEnd}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-10">
                        <label className={labelCls}>Interviewer (optional)</label>
                        <input
                          className={fieldCls}
                          value={newInterviewer}
                          onChange={(e) => setNewInterviewer(e.target.value)}
                          placeholder="e.g. Sarah K."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button
                          onClick={handleAddSlot}
                          disabled={adding || !newStart || !newEnd}
                          className="w-full bg-black flex gap-[10px] items-center justify-center px-4 py-3 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                          {adding ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <span className="font-['Geist_Mono',monospace] text-[12px] text-white whitespace-nowrap leading-none">
                              + Add
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Prompt to select a date if none selected */}
              {!selectedDate && (
                <div className="border-t border-[#dbe0ec] p-6 text-center">
                  <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm">
                    Click a date on the calendar to view or add slots.
                  </p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
