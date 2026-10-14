import { existsSync } from "node:fs";
import { join } from "node:path";

export interface PathRoots {
  resourcesPath: string;
  appPath: string;
  cwd: string;
  moduleDir: string;
}

export function hookScriptCandidates(roots: PathRoots): string[] {
  return [
    join(roots.resourcesPath, "scripts", "windows-shift-hook.ps1"),
    join(roots.appPath, "scripts", "windows-shift-hook.ps1"),
    join(roots.cwd, "scripts", "windows-shift-hook.ps1"),
    join(roots.moduleDir, "..", "..", "scripts", "windows-shift-hook.ps1"),
  ];
}

export function iconCandidates(roots: PathRoots): string[] {
  return [
    join(roots.resourcesPath, "icon.png"),
    join(roots.appPath, "assets", "icon.png"),
    join(roots.cwd, "assets", "icon.png"),
    join(roots.moduleDir, "..", "..", "assets", "icon.png"),
  ];
}

export function firstExisting(candidates: string[]): string | null {
  return candidates.find((path) => existsSync(path)) ?? null;
}

export function windowsPowershellPath(systemRoot = process.env.SystemRoot ?? "C:\\Windows"): string {
  return join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}
