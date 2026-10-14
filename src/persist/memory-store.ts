import { emptyWorkspace, type Workspace } from "@/core/models";
import type { WorkspaceStore } from "@/core/ports";

export class MemoryStore implements WorkspaceStore {
  constructor(private workspace: Workspace = emptyWorkspace()) {}

  async load(): Promise<Workspace> {
    return structuredClone(this.workspace);
  }

  async save(workspace: Workspace): Promise<void> {
    this.workspace = structuredClone(workspace);
  }
}
