import { createContext, useContext, useSyncExternalStore } from "react";
import type { AppController } from "../controller";

export const AppContext = createContext<AppController | null>(null);

export function useApp() {
  const controller = useContext(AppContext);
  if (!controller) {
    throw new Error("useApp must be used inside AppContext");
  }
  const workspace = useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.getWorkspace(),
    () => controller.getWorkspace(),
  );
  const ui = useSyncExternalStore(
    (listener) => controller.subscribe(listener),
    () => controller.getUi(),
    () => controller.getUi(),
  );
  return { controller, workspace, ui };
}
