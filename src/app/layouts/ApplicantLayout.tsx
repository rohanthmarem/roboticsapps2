import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/AuthContext";
import { useApplication, useQuestions } from "../lib/hooks";
import { useDataContext } from "../lib/DataContext";
import {
  LayoutDashboard,
  Layers,
  User,
  Activity,
  PenTool,
  Award,
  ClipboardCheck,
  Calendar,
  Mail,
  LogOut,
  X,
  AlertTriangle,
} from "lucide-react";

const DEADLINE_REMINDER_START = Date.UTC(2026, 3, 11, 1, 59); // Apr 11, 2026 01:59 UTC
const DEADLINE_EXTENDED_START = Date.UTC(2026, 3, 11, 5, 0);  // Apr 11, 2026 05:00 UTC
const DEADLINE_EXTENDED_END   = Date.UTC(2026, 3, 14, 3, 59); // Apr 14, 2026 03:59 UTC (after Apr 13 11:59PM)

function useDeadlineNotification() {
  const [notification, setNotification] = useState<{ id: string; message: string } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      if (now >= DEADLINE_EXTENDED_START && now < DEADLINE_EXTENDED_END) {
        setNotification({ id: "deadline_extended", message: "Applications have been extended to Monday, April 13 at 11:59 PM." });
      } else if (now >= DEADLINE_REMINDER_START && now < DEADLINE_EXTENDED_START) {
        setNotification({ id: "deadline_reminder", message: "Applications are due in 2 hours! Make sure to review and submit before the deadline." });
      } else {
        setNotification(null);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (notification) {
      const stored = localStorage.getItem(`notif_dismissed_${notification.id}`);
      setDismissed(stored);
    }
  }, [notification?.id]);

  const dismiss = () => {
    if (notification) {
      localStorage.setItem(`notif_dismissed_${notification.id}`, "1");
      setDismissed("1");
    }
  };

  const visible = notification && dismissed !== "1";
  return { notification: visible ? notification : null, dismiss };
}

const NAV_SECTIONS = [
  {
    label: null, // no section header for dashboard
    items: [
      { path: "/applicant", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Application",
    items: [
      { path: "/applicant/positions", icon: Layers, label: "Positions" },
      { path: "/applicant/profile", icon: User, label: "Profile" },
      { path: "/applicant/activities", icon: Activity, label: "Activities" },
      { path: "/applicant/responses", icon: PenTool, label: "Written Responses" },
      { path: "/applicant/honors", icon: Award, label: "Honors & Awards" },
    ],
  },
  {
    label: "Submit",
    items: [
      { path: "/applicant/review", icon: ClipboardCheck, label: "Review & Submit" },
    ],
  },
  {
    label: "After Review",
    items: [
      { path: "/applicant/interview", icon: Calendar, label: "Interviews" },
      { path: "/applicant/decisions", icon: Mail, label: "Decisions" },
    ],
  },
];

export function ApplicantLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { application } = useApplication(profile?.id);
  const appPositions = application?.application_positions || [];
  const { questions } = useQuestions();

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
    : profile?.email || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Use cached progress counts from DataContext — no re-fetch on navigation
  const { progressCounts } = useDataContext();

  // Calculate progress (6 steps matching dashboard)
  const hasProfile = !!(profile?.first_name && profile?.last_name && profile?.grade);
  const hasPositions = appPositions.length > 0;
  const hasActivities = progressCounts.activities > 0;
  const hasResponses = progressCounts.responses > 0;
  const hasHonors = progressCounts.honors > 0;
  const isSubmitted = !!application && application.status !== "draft";
  const totalSteps = 6;
  let completedSteps = 0;
  if (hasProfile) completedSteps++;
  if (hasPositions) completedSteps++;
  if (hasActivities) completedSteps++;
  if (hasResponses) completedSteps++;
  if (hasHonors) completedSteps++;
  if (isSubmitted) completedSteps++;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  // Questions breakdown for sidebar
  const generalQuestions = questions.filter((q: any) => !q.position_id);
  const positionQuestionMap: Record<string, any[]> = {};
  for (const q of questions) {
    if (q.position_id) {
      if (!positionQuestionMap[q.position_id]) positionQuestionMap[q.position_id] = [];
      positionQuestionMap[q.position_id].push(q);
    }
  }

  // Get all applied positions for sidebar display (show even if 0 position-specific questions)
  const appliedPositionsForSidebar = appPositions
    .map((ap: any) => ({ id: ap.position_id, title: ap.positions?.title, questionCount: positionQuestionMap[ap.position_id]?.length || 0 }));

  const { notification, dismiss: dismissNotification } = useDeadlineNotification();

  return (
    <div className="flex min-h-screen bg-white text-black" style={{ fontFamily: "'Radio Canada Big', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-60 border-r border-[#dbe0ec] bg-white flex flex-col fixed inset-y-0 left-0 z-10">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[#dbe0ec]">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="WOSS Robotics"
              className="h-7 w-7 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
              }}
            />
            <div className="w-2 h-2 bg-black hidden" />
            <span className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm tracking-tight">
              WOSS Robotics
            </span>
          </Link>
          <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] mt-1.5 uppercase tracking-[0.08em]">
            Applicant Portal
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className={cn(sIdx > 0 && "mt-1")}>
              {section.label && (
                <div className="px-6 pt-4 pb-1.5">
                  <p className="font-['Geist_Mono',monospace] text-[9px] text-[#6c6c6c] uppercase tracking-[0.1em]">
                    {section.label}
                  </p>
                </div>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const isResponses = item.path === "/applicant/responses";
                return (
                  <div key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-2.5 px-6 py-2.5 transition-colors group",
                        isActive
                          ? "bg-black text-white"
                          : "text-[#6c6c6c] hover:bg-[#f5f5f3] hover:text-black"
                      )}
                    >
                      <item.icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-white" : "text-[#6c6c6c]")} />
                      <span
                        className={cn(
                          "font-['Radio_Canada_Big',sans-serif] text-[13px]",
                          isActive ? "text-white font-medium" : "text-black"
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                    {/* Show sub-items under Written Responses */}
                    {isResponses && isActive && (
                      <div className="bg-[#f5f5f3]">
                        {generalQuestions.length > 0 && (
                          <div className="px-8 py-2">
                            <p className="font-['Geist_Mono',monospace] text-[9px] text-[#6c6c6c] uppercase tracking-[0.06em]">
                              General ({generalQuestions.length})
                            </p>
                          </div>
                        )}
                        {appliedPositionsForSidebar.map((pos: any) => (
                          <div key={pos.id} className="px-8 py-2">
                            <p className="font-['Geist_Mono',monospace] text-[9px] text-[#6c6c6c] uppercase tracking-[0.06em]">
                              {pos.title} {pos.questionCount > 0 ? `(${pos.questionCount})` : ""}
                            </p>
                          </div>
                        ))}
                        {appliedPositionsForSidebar.length === 0 && generalQuestions.length === 0 && (
                          <div className="px-8 py-2">
                            <p className="font-['Geist_Mono',monospace] text-[9px] text-[#6c6c6c]">No questions yet</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Progress Widget */}
        <div className="px-6 py-5 border-t border-[#dbe0ec]">
          <div className="flex items-center justify-between mb-2">
            <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em]">
              Progress
            </p>
            <span className="font-['Geist_Mono',monospace] text-[10px] text-black">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#dbe0ec]">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-xs mt-2">
            {isSubmitted
              ? "Application submitted"
              : `${completedSteps}/${totalSteps} sections complete`}
          </p>
        </div>

        {/* User Info */}
        <div className="px-6 py-4 border-t border-[#dbe0ec] flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-['Radio_Canada_Big',sans-serif] text-xs font-medium text-black truncate">{displayName}</p>
            <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] mt-0.5 truncate">{profile?.email}</p>
          </div>
          <button onClick={handleSignOut} className="text-[#6c6c6c] hover:text-black transition-colors shrink-0 ml-2">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-60 min-h-screen bg-white">
        {notification && (
          <div className="bg-black text-white px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-white shrink-0" />
              <p className="font-['Radio_Canada_Big',sans-serif] text-sm">
                {notification.message}
              </p>
            </div>
            <button
              onClick={dismissNotification}
              className="text-white/60 hover:text-white transition-colors shrink-0 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="max-w-4xl mx-auto px-10 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
