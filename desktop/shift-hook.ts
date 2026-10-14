import { app } from "electron";
import { existsSync } from "node:fs";
import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";
import { parseHookLine, type HookMessage } from "../src/core/hook-protocol";

export function startShiftHook(onMessage: (message: HookMessage) => void): () => void {
  if (process.platform !== "win32") {
    return () => undefined;
  }

  const script = resolveHookScript();
  if (!script) {
    return () => undefined;
  }
  const child: ChildProcess = spawn(
    "powershell.exe",
    ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", script],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );

  let buffer = "";
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const message = parseHookLine(line);
      if (message) onMessage(message);
    }
  });

  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", () => {
    /* Shift-only detector; ignore diagnostics. */
  });

  return () => {
    if (!child.killed) child.kill();
  };
}

function resolveHookScript(): string | null {
  const candidates = [
    join(app.getAppPath(), "scripts/windows-shift-hook.ps1"),
    join(process.cwd(), "scripts/windows-shift-hook.ps1"),
    join(__dirname, "../../scripts/windows-shift-hook.ps1"),
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
}
