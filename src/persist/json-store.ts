import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { hydrateWorkspace } from "@/core/hydrate";
import { emptyWorkspace, type Workspace } from "@/core/models";
import type { WorkspaceStore } from "@/core/ports";

export class JsonFileStore implements WorkspaceStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<Workspace> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return hydrateWorkspace(JSON.parse(raw));
    } catch (error) {
      if (isNotFound(error)) {
        const workspace = emptyWorkspace();
        await this.save(workspace);
        return workspace;
      }
      const backup = `${this.filePath}.corrupt.${Date.now()}.json`;
      try {
        await rename(this.filePath, backup);
      } catch {
        // The original file may already be unreadable; start clean.
      }
      const workspace = emptyWorkspace();
      await this.save(workspace);
      return workspace;
    }
  }

  async save(workspace: Workspace): Promise<void> {
    const directory = dirname(this.filePath);
    await mkdir(directory, { recursive: true });
    const tempPath = join(directory, `${process.pid}.${Date.now()}.tmp`);
    const json = `${JSON.stringify(workspace, null, 2)}\n`;
    await writeFile(tempPath, json, { encoding: "utf8" });
    await rename(tempPath, this.filePath);
  }
}

function isNotFound(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT",
  );
}
