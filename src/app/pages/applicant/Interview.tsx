import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Clock, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";
import { useApplications, useSettings } from "../../lib/hooks";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";
import { interviewScheduledEmail } from "../../lib/email-templates";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  interviewer_name: string | null;
  is_booked: boolean;
}

export function ApplicantInterview() {
  const { profile } = useAuth();
  const { applications } = useApplications(profile?.id);
  const { settings } = useSettings();
  const interviewsOpen = settings.interview_scheduling_open === true || settings.interview_scheduling_open === "true";
  const [slots, setSlots] = useState<Slot[]>([]);
  const [booking, setBooking] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const interviewApp = applications.find((a: any) => a.status === "interview_scheduled");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch available slots
      const { data: slotData } = await supabase
        .from("interview_slots")
        .select("*")
        .eq("is_booked", false)
        .order("date")
        .order("start_time");
      setSlots(slotData || []);

      // Check existing booking
      if (profile) {
        const { data: bookingData } = await supabase
          .from("interview_bookings")
          .select("*, interview_slots(*)")
          .eq("user_id", profile.id)
          .maybeSingle();
        setBooking(bookingData);
      }
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  const uniqueDates = [...new Set(slots.map((s) => s.date))];
  const slotsForDate = slots.filter((s) => s.date === selectedDate);

  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!selectedSlotId || !interviewApp || !profile) return;
    setConfirming(true);
    setBookingError(null);

    // Create booking
    const { error: bookErr } = await supabase.from("interview_bookings").insert({
      application_id: interviewApp.id,
      slot_id: selectedSlotId,
      user_id: profile.id,
    });
    if (bookErr) {
      console.error("Failed to create booking:", bookErr);
      setBookingError(`Failed to book interview: ${bookErr.message}`);
      setConfirming(false);
      return;
    }

    // Mark slot as booked
    const { error: slotErr } = await supabase.from("interview_slots").update({ is_booked: true }).eq("id", selectedSlotId);
    if (slotErr) console.error("Failed to mark slot as booked:", slotErr);

    // Refresh booking
    const { data } = await supabase
      .from("interview_bookings")
      .select("*, interview_slots(*)")
      .eq("user_id", profile.id)
      .maybeSingle();
    setBooking(data);

    // Send interview confirmation email
    if (data?.interview_slots) {
      const slot = data.interview_slots;
      const posTitle = interviewApp.positions?.title || "Executive Position";
      const dateStr = format(parseISO(slot.date), "EEEE, MMMM do, yyyy");
      const timeStr = `${slot.start_time} – ${slot.end_time}`;
      const location = slot.interviewer_name ? `With ${slot.interviewer_name}` : "TBD — check portal for updates";
      const portalUrl = window.location.origin + "/applicant/interview";

      const html = interviewScheduledEmail(profile.first_name || "Applicant", posTitle, dateStr, timeStr, location, portalUrl);

      supabase.functions.invoke("send-email", {
        body: {
          to: profile.email,
          subject: `Interview Confirmed — ${posTitle} · ${format(parseISO(slot.date), "MMM d")} at ${slot.start_time}`,
          html,
        },
      }).catch(console.error);
    }

    setConfirming(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#6c6c6c]" />
      </div>
    );
  }

  // Show confirmed state
  if (booking) {
    const slot = booking.interview_slots;
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 max-w-2xl mt-12 text-center mx-auto">
        <div className="border border-[#dbe0ec] p-16 flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-black flex items-center justify-center mb-8">
            <CheckCircle2 className="w-6 h-6 text-black" />
          </div>
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Confirmed</p>
          <h1 className="font-['Source_Serif_4',serif] text-[40px] text-black tracking-[-1.2px] mb-4" style={{ lineHeight: 1.1 }}>
            Interview Booked
          </h1>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg leading-[1.3] mb-8">
            You are scheduled for{" "}
            <strong className="text-black">{slot ? format(parseISO(slot.date), "EEEE, MMMM do") : ""}</strong> at{" "}
            <strong className="text-black">{slot?.start_time}</strong>.
          </p>
          <div className="border border-[#dbe0ec] p-6 w-full mb-6">
            <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm mb-5">
              Details will be sent to your email. Please arrive on time.
            </p>
            {slot?.interviewer_name && (
              <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
                Interviewer: {slot.interviewer_name}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show scheduling closed state
  if (interviewApp && !booking && !interviewsOpen) {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <header className="border-b border-[#dbe0ec] pb-8">
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Step 08</p>
          <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
            Schedule<br />Interview
          </h1>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
            Interview scheduling is not yet open. You will be able to book a slot once scheduling opens.
          </p>
        </header>
      </div>
    );
  }

  // Show no-invite state
  if (!interviewApp) {
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <header className="border-b border-[#dbe0ec] pb-8">
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Step 08</p>
          <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
            Schedule<br />Interview
          </h1>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
            You have not been invited to an interview yet. Check back later!
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="border-b border-[#dbe0ec] pb-8">
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Step 08</p>
        <h1 className="font-['Source_Serif_4',serif] text-[48px] text-black tracking-[-1.5px]" style={{ lineHeight: 1.05 }}>
          Schedule<br />Interview
        </h1>
        <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-lg tracking-[-0.3px] mt-2">
          You have been invited to interview for <span className="text-black">{interviewApp.positions?.title}</span>. Select a slot below.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 border border-[#dbe0ec] bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#dbe0ec]">
            {/* Date list */}
            <div className="p-6">
              <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm mb-5">Available Dates</p>
              <div className="space-y-2">
                {uniqueDates.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setSelectedDate(d); setSelectedSlotId(null); }}
                    className={cn(
                      "w-full py-3 px-4 border flex items-center justify-between transition-colors",
                      selectedDate === d ? "border-black bg-black text-white" : "border-[#dbe0ec] hover:border-black text-black"
                    )}
                  >
                    <span className="font-['Geist_Mono',monospace] text-[13px]">{format(parseISO(d), "EEEE, MMM do")}</span>
                    <span className="font-['Geist_Mono',monospace] text-[10px] opacity-60">
                      {slots.filter((s) => s.date === d).length} slots
                    </span>
                  </button>
                ))}
                {uniqueDates.length === 0 && (
                  <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm text-center py-8">No available slots at the moment.</p>
                )}
              </div>
            </div>

            {/* Time slots */}
            <div className="p-6">
              <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm mb-5">
                {selectedDate ? format(parseISO(selectedDate), "EEEE, MMM do") : "Select a date"}
              </p>
              {slotsForDate.length > 0 ? (
                <div className="space-y-2">
                  {slotsForDate.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={cn(
                        "w-full py-3 px-4 border flex items-center justify-between transition-colors",
                        selectedSlotId === slot.id ? "border-black bg-black text-white" : "border-[#dbe0ec] hover:border-black text-black"
                      )}
                    >
                      <span className="font-['Geist_Mono',monospace] text-[13px]">{slot.start_time} – {slot.end_time}</span>
                      {selectedSlotId === slot.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 flex flex-col items-center">
                  <Clock className="w-6 h-6 text-[#dbe0ec] mb-2" />
                  <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm">Select a date to see available times.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="md:col-span-4 space-y-4">
          <div className="border border-[#dbe0ec] p-5">
            <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm mb-4">Important Details</p>
            <div className="space-y-4">
              {[
                { icon: Clock, text: "Interviews are approximately 15-20 minutes. Please be on time." },
                { icon: AlertCircle, text: "Contact the executive team to reschedule at least 24 hours in advance." },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex gap-3">
                  <Icon className="w-4 h-4 text-[#6c6c6c] shrink-0 mt-0.5" />
                  <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm leading-[1.4]">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {bookingError && (
            <div className="border border-red-300 bg-red-50 px-4 py-3">
              <p className="font-['Source_Serif_4',serif] text-red-700 text-sm">{bookingError}</p>
            </div>
          )}

          <button
            className={cn(
              "w-full bg-black flex gap-[10px] items-center justify-center px-5 py-4 transition-colors",
              !selectedSlotId ? "opacity-40 cursor-not-allowed" : "hover:bg-zinc-800"
            )}
            disabled={!selectedSlotId || confirming}
            onClick={handleConfirm}
          >
            {confirming ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <>
                <div className="bg-white shrink-0 w-[5px] h-[5px]" />
                <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">Confirm Booking</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
