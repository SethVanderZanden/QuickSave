import { hydrateWorkspace } from "@/core/hydrate";
import { emptyWorkspace, type Workspace } from "@/core/models";
import type { WorkspaceStore } from "@/core/ports";

export const LOCAL_STORAGE_KEY = "quicksave.workspace.v1";

export class LocalStorageStore implements WorkspaceStore {
  constructor(
    private readonly key = LOCAL_STORAGE_KEY,
    private readonly storage: Storage | null = typeof localStorage === "undefined"
      ? null
      : localStorage,
  ) {}

  async load(): Promise<Workspace> {
    if (!this.storage) return emptyWorkspace();
    const raw = this.storage.getItem(this.key);
    if (!raw) return emptyWorkspace();
    try {
      return hydrateWorkspace(JSON.parse(raw));
    } catch {
      return emptyWorkspace();
    }
  }

  async save(workspace: Workspace): Promise<void> {
    this.storage?.setItem(this.key, JSON.stringify(workspace));
  }
}
