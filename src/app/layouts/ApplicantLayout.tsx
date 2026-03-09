import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/AuthContext";
import { useApplications } from "../lib/hooks";
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
} from "lucide-react";

const APPLICANT_NAV = [
  { path: "/applicant", icon: LayoutDashboard, label: "Dashboard", num: "01" },
  { path: "/applicant/positions", icon: Layers, label: "Positions", num: "02" },
  { path: "/applicant/profile", icon: User, label: "Profile", num: "03" },
  { path: "/applicant/activities", icon: Activity, label: "Activities", num: "04" },
  { path: "/applicant/responses", icon: PenTool, label: "Written Responses", num: "05" },
  { path: "/applicant/honors", icon: Award, label: "Honors & Awards", num: "06" },
  { path: "/applicant/review", icon: ClipboardCheck, label: "Review & Submit", num: "07" },
  { path: "/applicant/interview", icon: Calendar, label: "Interviews", num: "08" },
  { path: "/applicant/decisions", icon: Mail, label: "Decisions", num: "09" },
];

export function ApplicantLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
    : profile?.email || "";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-white text-black" style={{ fontFamily: "'Radio Canada Big', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-60 border-r border-[#dbe0ec] bg-white flex flex-col fixed inset-y-0 left-0 z-10">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[#dbe0ec]">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-2 h-2 bg-black" />
            <span className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm tracking-tight">
              WOSS Robotics
            </span>
          </Link>
          <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] mt-1.5 uppercase tracking-[0.08em]">
            Applicant Portal
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {APPLICANT_NAV.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between px-6 py-3 transition-colors group",
                  isActive
                    ? "bg-black text-white"
                    : "text-[#6c6c6c] hover:bg-[#f5f5f3] hover:text-black"
                )}
              >
                <span
                  className={cn(
                    "font-['Radio_Canada_Big',sans-serif] text-sm",
                    isActive ? "text-white font-medium" : "text-black"
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "font-['Geist_Mono',monospace] text-[10px]",
                    isActive ? "text-white/60" : "text-[#6c6c6c]"
                  )}
                >
                  {item.num}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Progress Widget */}
        <div className="px-6 py-5 border-t border-[#dbe0ec]">
          <p className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] uppercase tracking-[0.08em] mb-4">
            2026-2027 Exec Apps
          </p>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-xs">
            Complete your profile, activities, and written responses to submit.
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
        <div className="max-w-4xl mx-auto px-10 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
