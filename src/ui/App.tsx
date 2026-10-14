import { useEffect, useState, type ReactNode } from "react";
import { getBridge, isDesktopShell } from "./bridge";
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

  const desktop = isDesktopShell(controller.bridge);

  return (
    <AppContext.Provider value={controller}>
      {desktop ? (
        <div className="h-full overflow-hidden bg-transparent">
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
    <div className="grid h-full place-items-center overflow-auto bg-[var(--bg)] p-6">
      <div className="h-[720px] w-full max-w-[400px]">{children}</div>
    </div>
  );
}
