import type { BrowserWindow } from "electron";
import { classifyWindowHotkey } from "../src/core/window-hotkeys";

export function installWindowHotkeys(
  win: BrowserWindow,
  handlers: {
    copyPlain: () => void;
    copyList: () => void;
    quit: () => void;
  },
): void {
  win.webContents.on("before-input-event", (event, input) => {
    const action = classifyWindowHotkey(input);
    if (!action) return;
    event.preventDefault();
    if (action === "copy-plain") handlers.copyPlain();
    if (action === "copy-list") handlers.copyList();
    if (action === "quit") handlers.quit();
  });
}
