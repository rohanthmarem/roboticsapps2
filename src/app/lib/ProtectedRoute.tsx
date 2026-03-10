import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "applicant" | "admin";
}) {
  const { user, profile, loading, profileError } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-black" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If profile failed to load, show error instead of silently allowing access
  if (!profile && profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="max-w-md text-center">
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.1em] mb-3">Error</p>
          <h1 className="font-['Source_Serif_4',serif] text-[32px] text-black tracking-[-1px] mb-4" style={{ lineHeight: 1.1 }}>
            Profile Unavailable
          </h1>
          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-base mb-6">
            {profileError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-black flex gap-[10px] items-center justify-center px-5 py-3.5 hover:bg-zinc-800 transition-colors mx-auto"
          >
            <div className="bg-white shrink-0 w-[5px] h-[5px]" />
            <span className="font-['Geist_Mono',monospace] text-[13px] text-white whitespace-nowrap leading-none">Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Wait for profile to load before checking role
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-black" />
      </div>
    );
  }

  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to={profile.role === "admin" ? "/admin" : "/applicant"} replace />;
  }

  // Force onboarding for applicants who haven't completed their profile
  if (
    requiredRole === "applicant" &&
    location.pathname !== "/onboarding" &&
    (!profile.first_name || !profile.last_name || !profile.grade)
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
