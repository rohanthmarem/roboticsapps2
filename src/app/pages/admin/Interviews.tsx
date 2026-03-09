import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

const fieldCls =
  "w-full border border-[#dbe0ec] bg-white px-4 py-3 font-['Radio_Canada_Big',sans-serif] text-sm text-black outline-none focus:border-black transition-colors placeholder-[#6c6c6c]";

const labelCls =
  "font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] block mb-2";

export function AdminInterviews() {
  const [slots, setSlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // New slot form
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newInterviewer, setNewInterviewer] = useState("");

  const fetchData = async () => {
    const { data: slotData } = await supabase
      .from("interview_slots")
      .select("*")
      .order("date")
      .order("start_time");
    setSlots(slotData || []);

    const { data: bookingData } = await supabase
      .from("interview_bookings")
      .select("*, interview_slots(*), profiles(first_name, last_name, email), applications(positions(title))")
      .order("created_at", { ascending: false });
    setBookings(bookingData || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSlot = async () => {
    if (!newDate || !newStart || !newEnd) return;
    setAdding(true);
    const { error } = await supabase.from("interview_slots").insert({
      date: newDate,
      start_time: newStart,
      end_time: newEnd,
      interviewer_name: newInterviewer || null,
    });
    if (error) {
      console.error("Failed to add interview slot:", error);
      setAdding(false);
      return;
    }
    setNewDate("");
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
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Admin — 02</p>
        <h1 className="font-['Source_Serif_4',serif] text-[40px] text-black tracking-[-1.2px]" style={{ lineHeight: 1.05 }}>
          Interview<br />Slots
        </h1>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          Manage availability for applicants to book interviews.
        </p>
      </header>

      {/* Booked interviews */}
      {bookings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">Booked Interviews</h2>
            <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">{bookings.length} scheduled</span>
          </div>

          <div className="border border-[#dbe0ec] space-y-0">
            {bookings.map((item: any, i: number) => {
              const name = `${item.profiles?.first_name || ""} ${item.profiles?.last_name || ""}`.trim() || item.profiles?.email || "Unknown";
              const slot = item.interview_slots;
              return (
                <div key={item.id} className={`flex items-center justify-between px-6 py-5 hover:bg-[#f9f9f7] transition-colors ${i !== 0 ? "border-t border-[#dbe0ec]" : ""}`}>
                  <div className="flex items-start gap-4">
                    <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] w-6 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">{name}</p>
                      <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mt-0.5">{item.applications?.positions?.title || "Position"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-['Geist_Mono',monospace] text-[11px] text-black">
                        {slot ? format(parseISO(slot.date), "MMM d") : "—"}
                      </p>
                      <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] mt-0.5">{slot?.start_time || ""}</p>
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

      {/* Available slots */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-base">Available Slots</h2>
          <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
            {slots.filter((s) => !s.is_booked).length} open
          </span>
        </div>

        <div className="border border-[#dbe0ec]">
          {slots.map((slot, i) => (
            <div key={slot.id} className={`flex items-center justify-between px-6 py-4 ${i !== 0 ? "border-t border-[#dbe0ec]" : ""}`}>
              <div className="flex items-center gap-4">
                <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] w-6">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-['Radio_Canada_Big',sans-serif] text-black text-sm">
                    {format(parseISO(slot.date), "EEE, MMM d")} · {slot.start_time} – {slot.end_time}
                  </p>
                  {slot.interviewer_name && (
                    <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] mt-0.5">Interviewer: {slot.interviewer_name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("font-['Geist_Mono',monospace] text-[10px] border px-2 py-0.5", slot.is_booked ? "border-black text-black" : "border-[#dbe0ec] text-[#6c6c6c]")}>
                  {slot.is_booked ? "Booked" : "Open"}
                </span>
                {!slot.is_booked && (
                  <button onClick={() => handleDeleteSlot(slot.id)} className="text-[#6c6c6c] hover:text-black transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {slots.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm">No interview slots created yet.</p>
            </div>
          )}

          {/* Add new slot */}
          <div className="border-t border-dashed border-[#dbe0ec] px-6 py-4">
            <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] mb-3">Add New Slot</p>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-3">
                <label className={labelCls}>Date</label>
                <input type="date" className={fieldCls} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Start Time</label>
                <input type="time" className={fieldCls} value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>End Time</label>
                <input type="time" className={fieldCls} value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
              <div className="md:col-span-3">
                <label className={labelCls}>Interviewer (optional)</label>
                <input className={fieldCls} value={newInterviewer} onChange={(e) => setNewInterviewer(e.target.value)} placeholder="e.g. Sarah K." />
              </div>
              <div className="md:col-span-2">
                <button onClick={handleAddSlot} disabled={adding || !newDate || !newStart || !newEnd} className="w-full bg-black flex gap-[10px] items-center justify-center px-4 py-3 hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  {adding ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : (
                    <span className="font-['Geist_Mono',monospace] text-[12px] text-white whitespace-nowrap leading-none">+ Add</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
