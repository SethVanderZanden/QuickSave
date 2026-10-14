import { app } from "electron";
import { join } from "node:path";

export function dataDir(): string {
  return join(app.getPath("userData"), "QuickSave");
}

export function workspacePath(): string {
  return join(dataDir(), "workspace.json");
}

export function attachmentsDir(): string {
  return join(dataDir(), "attachments");
}
