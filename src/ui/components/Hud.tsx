import { useApp } from "../hooks/use-app";

export function Hud() {
  const { ui } = useApp();
  if (!ui.hud) return null;
  return (
    <div
      data-testid="hud"
      className="hud pointer-events-none absolute bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[var(--line)] bg-[var(--bg-elev)] px-3.5 py-1.5 text-[12px] tracking-[0.01em] shadow-[var(--shadow)]"
    >
      {ui.hud.text}
    </div>
  );
}
