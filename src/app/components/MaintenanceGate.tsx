import { useSettings } from "../lib/hooks";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const isDown =
    settings.maintenance_mode === true || settings.maintenance_mode === "true";

  return (
    <>
      {children}
      {isDown && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
          <p className="font-['Geist_Mono',monospace] text-[11px] text-[#6c6c6c] uppercase tracking-[0.15em] mb-6">
            application overlord
          </p>
          <h1
            className="font-['Source_Serif_4',serif] text-[120px] text-black tracking-[-4px] leading-none"
          >
            Error 67
          </h1>
        </div>
      )}
    </>
  );
}
