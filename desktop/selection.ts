import { clipboard } from "electron";
import { spawn } from "node:child_process";

export async function captureSelectedText(restoreClipboard: boolean): Promise<string | null> {
  const previous = {
    text: clipboard.readText(),
    html: clipboard.readHTML(),
  };

  await sendCopyChord();
  await wait(90);

  const next = clipboard.readText();
  const captured = next && next !== previous.text ? next : null;

  if (restoreClipboard) {
    clipboard.write({ text: previous.text, html: previous.html });
  }

  return captured;
}

async function sendCopyChord(): Promise<void> {
  if (process.platform !== "win32") {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class QSSend {
  [DllImport("user32.dll")] static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr extra);
  const byte VK_CONTROL = 0x11;
  const byte C = 0x43;
  const uint KEYUP = 0x0002;
  public static void Copy() {
    keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
    keybd_event(C, 0, 0, UIntPtr.Zero);
    keybd_event(C, 0, KEYUP, UIntPtr.Zero);
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
