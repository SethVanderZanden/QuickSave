import { spawnSync } from "node:child_process";

function runPowerShell(script: string): void {
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script],
    { encoding: "utf8", windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `PowerShell exited ${result.status}`);
  }
}

const BINDINGS = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class QSE2EInput {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, int dx, int dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
  public const uint MOUSEEVENTF_LEFTUP = 0x0004;
  public const uint KEYEVENTF_KEYUP = 0x0002;
  public const byte VK_CONTROL = 0x11;
  public const byte VK_C = 0x43;
}
"@
`;

export function nativeClickScreen(x: number, y: number): void {
  const sx = Math.round(x);
  const sy = Math.round(y);
  runPowerShell(`
${BINDINGS}
[QSE2EInput]::SetCursorPos(${sx}, ${sy}) | Out-Null
Start-Sleep -Milliseconds 80
[QSE2EInput]::mouse_event([QSE2EInput]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 40
[QSE2EInput]::mouse_event([QSE2EInput]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
`);
}

export function nativeCtrlC(): void {
  runPowerShell(`
${BINDINGS}
[QSE2EInput]::keybd_event([QSE2EInput]::VK_CONTROL, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 20
[QSE2EInput]::keybd_event([QSE2EInput]::VK_C, 0x2E, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 20
[QSE2EInput]::keybd_event([QSE2EInput]::VK_C, 0x2E, [QSE2EInput]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 20
[QSE2EInput]::keybd_event([QSE2EInput]::VK_CONTROL, 0, [QSE2EInput]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
`);
}
