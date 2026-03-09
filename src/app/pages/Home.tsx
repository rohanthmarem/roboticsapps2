import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { usePositions } from "../lib/hooks";
import { Loader2 } from "lucide-react";

function PrimaryButton({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="bg-black flex gap-[10px] items-center justify-center px-5 py-4 hover:bg-zinc-800 transition-colors"
    >
      <div className="bg-white shrink-0 w-[5px] h-[5px]" />
      <span className="font-['Geist_Mono',monospace] text-[14px] text-white whitespace-nowrap leading-none">
        {children}
      </span>
    </Link>
  );
}

function NavDot() {
  return <div className="w-1.5 h-1.5 rounded-full bg-black" />;
}

export function Home() {
  const { user, profile } = useAuth();
  const { positions, loading: positionsLoading } = usePositions();
  const navigate = useNavigate();
  const openPositions = positions.filter((p: any) => p.is_open);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#a8d3ff] via-[#e8f3ff] to-[#fff4df]" style={{ bottom: "40%" }} />
      <div className="absolute inset-0 top-[60%] bg-white" />

      {/* Minimal Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <NavDot />
          <span className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm tracking-tight">
            WOSS Robotics
          </span>
        </div>
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link to="/applicant" className="font-['Geist_Mono',monospace] text-xs text-[#6c6c6c] hover:text-black transition-colors">
                My Application
              </Link>
              {profile?.role === "admin" && (
                <Link to="/admin" className="font-['Geist_Mono',monospace] text-xs text-[#6c6c6c] hover:text-black transition-colors">
                  Admin Portal
                </Link>
              )}
            </>
          ) : (
            <Link to="/login" className="font-['Geist_Mono',monospace] text-xs text-[#6c6c6c] hover:text-black transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-24 flex-1">
        <div className="max-w-3xl w-full">
          {/* Eyebrow */}
          <p className="font-['Geist_Mono',monospace] text-[12px] text-[#6c6c6c] tracking-[0.1em] uppercase mb-8">
            2026-2027 Executive Applications
          </p>

          {/* Main heading */}
          <div className="mb-6 leading-none">
            <h1
              className="font-['Source_Serif_4',serif] text-[68px] md:text-[80px] text-black tracking-[-3px] block"
              style={{ lineHeight: 1.05 }}
            >
              Lead the team,
            </h1>
            <h2
              className="font-['Radio_Canada_Big',sans-serif] font-normal text-[68px] md:text-[80px] text-black tracking-[-3.5px] block"
              style={{ lineHeight: 1.05 }}
            >
              shape the future.
            </h2>
          </div>

          <p className="font-['Source_Serif_4',serif] text-[18px] text-black tracking-[-0.5px] leading-[1.3] mb-10 max-w-xl mx-auto">
            Apply to become an executive for WOSS Robotics. One portal for applications, reviews, and decisions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            {user ? (
              <PrimaryButton to="/applicant">Go to My Application</PrimaryButton>
            ) : (
              <PrimaryButton to="/login">Apply Now</PrimaryButton>
            )}
            {profile?.role === "admin" && (
              <PrimaryButton to="/admin">Admin Portal</PrimaryButton>
            )}
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="mt-20 max-w-3xl w-full">
          <div className="border-2 border-black bg-white overflow-hidden">
            <div className="bg-[#f9f9f7] border-b border-[#dbe0ec] px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">WOSS Robotics Executive Portal</p>
                <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-xs mt-0.5">Apply for leadership positions for 2026-2027.</p>
              </div>
              <span className="font-['Geist_Mono',monospace] text-[10px] text-[#6c6c6c] border border-[#dbe0ec] px-2 py-1">
                {positions.length} position{positions.length !== 1 ? "s" : ""} · {openPositions.length} open
              </span>
            </div>
            <div className="divide-y divide-[#dbe0ec]">
              {positionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-[#6c6c6c]" />
                </div>
              ) : positions.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-sm">No positions available yet. Check back soon.</p>
                </div>
              ) : (
                positions.map((pos: any, i: number) => (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-[#f9f9f7] transition-colors cursor-pointer"
                    onClick={() => navigate(user ? "/applicant/positions" : "/login")}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">
                        {String(i + 1).padStart(3, "0")}
                      </span>
                      <div>
                        <p className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-sm">{pos.title}</p>
                        {pos.description && (
                          <p className="font-['Source_Serif_4',serif] text-[#6c6c6c] text-xs">{pos.description}</p>
                        )}
                      </div>
                    </div>
                    <span className={`font-['Geist_Mono',monospace] text-[11px] border px-2 py-0.5 ${pos.is_open ? "text-black border-black" : "text-[#6c6c6c] border-[#dbe0ec]"}`}>
                      {pos.is_open ? "Open" : "Closed"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Feature list */}
        <div className="mt-24 max-w-3xl w-full">
          <h2 className="font-['Radio_Canada_Big',sans-serif] font-medium text-[32px] text-black tracking-[-1px] text-center mb-12">
            Everything you need to apply
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {[
              { num: "001", title: "Apply", desc: "Answer tailored questions, list your activities, and showcase your experience." },
              { num: "002", title: "Track", desc: "See real-time status updates on your executive application." },
              { num: "003", title: "Interview", desc: "Book your interview slot directly when invited." },
              { num: "004", title: "Results", desc: "Receive your decision and accept your offer — all in one place." },
            ].map((item, i) => (
              <div
                key={item.num}
                className={`py-8 px-6 border-t border-[#dbe0ec] ${i % 2 === 1 ? "md:border-l" : ""} ${i >= 2 ? "md:border-b" : ""}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-['Radio_Canada_Big',sans-serif] font-medium text-black text-lg">{item.title}</h3>
                  <span className="font-['Geist_Mono',monospace] text-[#6c6c6c] text-xs">{item.num}</span>
                </div>
                <p className="font-['Source_Serif_4',serif] text-black text-base leading-[1.4] tracking-[-0.3px]">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="border-b border-[#dbe0ec]" />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#dbe0ec] px-8 py-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <NavDot />
          <span className="font-['Radio_Canada_Big',sans-serif] text-sm text-black">WOSS Robotics</span>
        </div>
        <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c]">© 2026</p>
      </footer>
    </div>
  );
}
