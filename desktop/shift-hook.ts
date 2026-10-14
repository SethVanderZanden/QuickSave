import { app } from "electron";
import { type ChildProcess, spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseShiftHookLine, type HookMessage } from "../src/core/hook-protocol";
import { ShiftTapDetector } from "../src/core/shift-tap";
import { firstExisting, hookScriptCandidates, windowsPowershellPath } from "./packaged-paths";

export interface ShiftHookHandle {
  stop(): void;
  sendCopy(): Promise<void>;
}

const RESTART_MS = [750, 1500, 3000, 5000];
const COPY_TIMEOUT_MS = 2000;

export function startShiftHook(onMessage: (message: HookMessage) => void): ShiftHookHandle | null {
  if (process.platform !== "win32") {
    return null;
  }

  const script = resolveHookScript();
  if (!script) {
    console.error(
      "[QuickSave] shift hook script not found. Looked in:",
      hookScriptCandidates({
        resourcesPath: process.resourcesPath,
        appPath: app.getAppPath(),
        cwd: process.cwd(),
        moduleDir: __dirname,
      }),
    );
    return null;
  }
  const hookPath = script;

  let child: ChildProcess | null = null;
  let stopped = false;
  let buffer = "";
  let restartAttempt = 0;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  const detector = new ShiftTapDetector();
  const copyWaiters: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

  function failCopy(error: Error): void {
    while (copyWaiters.length) {
      copyWaiters.shift()?.reject(error);
    }
  }

  function handleLine(line: string): void {
    const parsed = parseShiftHookLine(line);
    if (!parsed) return;
    if (parsed.type === "copied") {
      copyWaiters.shift()?.resolve();
      return;
    }
    if (parsed.type === "error") {
      console.error("[QuickSave] shift hook:", parsed.detail);
      return;
    }
    if (parsed.type === "ready") {
      restartAttempt = 0;
      console.log("[QuickSave] shift hook ready");
      if (process.env.QUICKSAVE_E2E === "1") {
        void writeFile(join(app.getPath("userData"), "hook-ready"), "ready").catch((error) => {
          console.error("[QuickSave] failed to write hook-ready", error);
        });
      }
      return;
    }
    if (parsed.type === "legacy") {
      onMessage(parsed.message);
      return;
    }
    const action = detector.push(parsed.event);
    if (action) onMessage(action);
  }

  function spawnChild(): void {
    if (stopped) return;
    const shell = windowsPowershellPath();
    console.log("[QuickSave] starting shift hook", shell, hookPath);
    const next: ChildProcess = spawn(
      shell,
      ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-File", hookPath],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
    );
    child = next;
    buffer = "";
    detector.reset();

    next.stdout?.setEncoding("utf8");
    next.stdout?.on("data", (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) handleLine(line);
    });

    next.stderr?.setEncoding("utf8");
    next.stderr?.on("data", (chunk: string) => {
      const text = chunk.trim();
      if (text) console.error("[QuickSave] shift hook:", text);
    });

    next.on("exit", (code, signal) => {
      if (child === next) child = null;
      failCopy(new Error("shift hook exited"));
      if (stopped) return;
      const delay = RESTART_MS[Math.min(restartAttempt, RESTART_MS.length - 1)] ?? 5000;
      restartAttempt += 1;
      console.error(`[QuickSave] shift hook exited (${code ?? signal ?? "?"}); restarting in ${delay}ms`);
      restartTimer = setTimeout(spawnChild, delay);
    });

    next.on("error", (error) => {
      console.error("[QuickSave] shift hook spawn failed", error);
    });
  }

  spawnChild();

  return {
    stop() {
      stopped = true;
      if (restartTimer) clearTimeout(restartTimer);
      const current = child;
      child = null;
      failCopy(new Error("shift hook stopped"));
      if (!current) return;
      try {
        current.stdin?.write("QUIT\n");
      } catch {
        /* already gone */
      }
      setTimeout(() => {
        if (!current.killed) current.kill();
      }, 400);
    },
    sendCopy() {
      return new Promise<void>((resolve, reject) => {
        const current = child;
        if (!current?.stdin) {
          reject(new Error("shift hook is not running"));
          return;
        }
        const waiter = { resolve, reject };
        copyWaiters.push(waiter);
        try {
          current.stdin.write("COPY\n");
        } catch (error) {
          const index = copyWaiters.indexOf(waiter);
          if (index >= 0) copyWaiters.splice(index, 1);
          reject(error instanceof Error ? error : new Error("failed to send copy"));
          return;
        }
        setTimeout(() => {
          const index = copyWaiters.indexOf(waiter);
          if (index < 0) return;
          copyWaiters.splice(index, 1);
          reject(new Error("copy chord timed out"));
        }, COPY_TIMEOUT_MS);
      });
    },
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
