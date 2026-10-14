import { clipboard } from "electron";
import { spawn } from "node:child_process";
import { windowsPowershellPath } from "./packaged-paths";

export async function captureSelectedText(
  restoreClipboard: boolean,
  sendCopy: () => Promise<void> = sendCopyChord,
): Promise<string | null> {
  const previous = {
    text: clipboard.readText(),
    html: clipboard.readHTML(),
  };

  try {
    await sendCopy();
  } catch (error) {
    console.error("[QuickSave] copy chord failed", error);
    return null;
  }

  const captured = await pollClipboardChange(previous.text, 400);
  if (restoreClipboard) {
    clipboard.write({ text: previous.text, html: previous.html });
  }
  return captured;
}

async function pollClipboardChange(previous: string, budgetMs: number): Promise<string | null> {
  const deadline = Date.now() + budgetMs;
  while (Date.now() <= deadline) {
    const next = clipboard.readText();
    if (next && next !== previous) return next;
    await wait(50);
  }
  const last = clipboard.readText();
  return last && last !== previous ? last : null;
}

export async function sendCopyChord(): Promise<void> {
  if (process.platform !== "win32") {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      windowsPowershellPath(),
      [
        "-NoProfile",
        "-STA",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Threading;
public static class QSSend {
  [DllImport("user32.dll")] static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr extra);
  const byte VK_SHIFT = 0x10;
  const byte VK_LSHIFT = 0xA0;
  const byte VK_RSHIFT = 0xA1;
  const byte VK_MENU = 0x12;
  const byte VK_CONTROL = 0x11;
  const byte C = 0x43;
  const uint KEYUP = 0x0002;
  public static void Copy() {
    keybd_event(VK_LSHIFT, 0x2A, KEYUP, UIntPtr.Zero);
    keybd_event(VK_RSHIFT, 0x36, KEYUP, UIntPtr.Zero);
    keybd_event(VK_SHIFT, 0, KEYUP, UIntPtr.Zero);
    keybd_event(VK_MENU, 0, KEYUP, UIntPtr.Zero);
    Thread.Sleep(25);
    keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
    keybd_event(C, 0x2E, 0, UIntPtr.Zero);
    keybd_event(C, 0x2E, KEYUP, UIntPtr.Zero);
    keybd_event(VK_CONTROL, 0, KEYUP, UIntPtr.Zero);
  }
}
"@
[QSSend]::Copy()
`,
      ],
      { windowsHide: true },
    );
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`copy chord failed (${code})`));
    });
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
