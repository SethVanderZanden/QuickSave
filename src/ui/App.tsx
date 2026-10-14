import { useEffect, useState, type ReactNode } from "react";
import { LOCAL_STORAGE_KEY } from "@/persist/local-storage-store";
import { getBridge, isDesktopRuntime } from "./bridge";
import { createBrowserBridge } from "./browser-bridge";
import { Panel } from "./components/Panel";
import { AppController } from "./controller";
import { AppContext } from "./hooks/use-app";

interface AppProps {
  controller?: AppController;
}

export function App({ controller: injected }: AppProps) {
  const [controller] = useState(() => injected ?? new AppController(getBridge() ?? createBrowserBridge()));
  const [ready, setReady] = useState(Boolean(injected));

  useEffect(() => {
    if (injected) return;
    void controller.start().then(() => setReady(true));
  }, [controller, injected]);

  if (!ready) {
    return (
      <div className="grid h-full place-items-center text-sm text-[var(--muted)]">
        Opening QuickSave…
      </div>
    );
  }

  const desktop = isDesktopRuntime();

  return (
    <AppContext.Provider value={controller}>
      {desktop ? (
        <div className="h-screen p-0">
          <Panel />
        </div>
      ) : (
        <WebFrame>
          <Panel />
        </WebFrame>
      )}
    </AppContext.Provider>
  );
}

function WebFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_-10%,#3a2416_0%,transparent_55%),linear-gradient(180deg,#110e0c,#090807)] px-4 py-10 text-[var(--ink)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center">
        <div className="max-w-md lg:pt-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-copper-soft)]">
            Windows capture pad
          </p>
          <h1 className="mt-2 text-4xl font-medium tracking-tight">QuickSave</h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">
            To-do list, clipboard, and scratchpad for AI-assisted work. Local file. No account. No
            telemetry.
          </p>
          <ul className="mt-6 space-y-2 text-[13px] text-[var(--muted)]">
            <li>
              <kbd>Left Shift ×2</kbd> capture selection
            </li>
            <li>
              <kbd>Right Shift ×2</kbd> show or hide
            </li>
            <li>
              <kbd># Name</kbd> create a section
            </li>
            <li>
              <kbd>Ctrl+K</kbd> switch and command
            </li>
          </ul>
          <p className="mt-6 text-[12px] leading-5 text-[var(--muted)]">
            This browser view is the same UI. On Windows, run <code>start.bat</code> from the repo
            for global hotkeys, tray, and always-on-top.
          </p>
          <button
            type="button"
            className="mt-4 text-[12px] text-[var(--color-copper-soft)] underline-offset-2 hover:underline"
            onClick={() => {
              localStorage.removeItem(LOCAL_STORAGE_KEY);
              window.location.reload();
            }}
          >
            Reset preview data
          </button>
        </div>
        <div className="h-[720px] w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
