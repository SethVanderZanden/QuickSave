import { app } from "electron";
import { type ChildProcess, spawn } from "node:child_process";
import { parseHookLine, type HookMessage } from "../src/core/hook-protocol";
import { firstExisting, hookScriptCandidates } from "./packaged-paths";

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
  return firstExisting(
    hookScriptCandidates({
      resourcesPath: process.resourcesPath,
      appPath: app.getAppPath(),
      cwd: process.cwd(),
      moduleDir: __dirname,
    }),
  );
}
