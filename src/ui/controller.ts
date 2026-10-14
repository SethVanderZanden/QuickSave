import { systemClock } from "@/core/clock";
import { cryptoIds } from "@/core/ids";
import type { DomainEvent } from "@/core/ports";
import {
  emptyWorkspace,
  type Attachment,
  type NoteId,
  type SketchDocument,
  type Workspace,
} from "@/core/models";
import { WorkspaceSession } from "@/core/session";
import { MemoryStore } from "@/persist/memory-store";
import type { QuickSaveBridge } from "./bridge";

export interface HudMessage {
  id: number;
  text: string;
  kind: "ok" | "empty" | "error";
}

export interface UiState {
  query: string;
  selectedIds: NoteId[];
  editingId: NoteId | null;
  paletteOpen: boolean;
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  logbookOpen: boolean;
  sketchOpen: boolean;
  sketchNoteId: NoteId | null;
  confirm: { title: string; body: string; action: () => void } | null;
  hud: HudMessage | null;
  composer: string;
}

const initialUi = (): UiState => ({
  query: "",
  selectedIds: [],
  editingId: null,
  paletteOpen: false,
  settingsOpen: false,
  shortcutsOpen: false,
  logbookOpen: false,
  sketchOpen: false,
  sketchNoteId: null,
  confirm: null,
  hud: null,
  composer: "",
});

export class AppController {
  readonly session: WorkspaceSession;
  private ui: UiState = initialUi();
  private readonly listeners = new Set<() => void>();
  private hudTimer: ReturnType<typeof setTimeout> | null = null;
  private hudSeq = 0;

  constructor(readonly bridge: QuickSaveBridge) {
    this.session = new WorkspaceSession(
      {
        load: () => this.bridge.load(),
        save: (workspace) => this.bridge.save(workspace),
      },
      systemClock,
      cryptoIds,
      emptyWorkspace(),
    );
    this.session.subscribe(() => this.notify());
  }

  static demo(options: { isDesktop?: boolean } = {}): AppController {
    const memory = new MemoryStore();
    const controller = new AppController({
      isDesktop: Boolean(options.isDesktop),
      load: () => memory.load(),
      save: (workspace) => memory.save(workspace),
      captureSelection: async () => null,
      writeClipboard: async () => undefined,
      hide: async () => undefined,
      show: async () => undefined,
      quit: async () => undefined,
      setAlwaysOnTop: async () => undefined,
      setLaunchAtStartup: async () => undefined,
      exportFile: async () => undefined,
      saveAttachment: async () => {
        throw new Error("unavailable");
      },
      openDataFolder: async () => undefined,
      onEvent: () => () => undefined,
    });
    return controller;
  }

  async start(): Promise<void> {
    await this.session.hydrate();
    this.bridge.onEvent((event) => {
      if (event.type === "capture-request") void this.captureFromSystem();
      if (event.type === "captured-text") this.applyCapture(event.text);
      if (event.type === "toggle-request") void this.bridge.show();
      if (event.type === "sketch-request") this.patchUi({ sketchOpen: true, sketchNoteId: null });
      if (event.type === "captured-empty") this.toast("Nothing selected", "empty");
    });
    this.notify();
  }

  getWorkspace(): Workspace {
    return this.session.snapshot();
  }

  getUi(): UiState {
    return this.ui;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  patchUi(patch: Partial<UiState>): void {
    this.ui = { ...this.ui, ...patch };
    this.notify();
  }

  toast(text: string, kind: HudMessage["kind"] = "ok"): void {
    if (this.hudTimer) clearTimeout(this.hudTimer);
    this.hudSeq += 1;
    this.ui = { ...this.ui, hud: { id: this.hudSeq, text, kind } };
    this.notify();
    this.hudTimer = setTimeout(() => {
      this.ui = { ...this.ui, hud: null };
      this.notify();
    }, 1600);
  }

  async captureFromSystem(): Promise<void> {
    const text = await this.bridge.captureSelection();
    this.applyCapture(text);
  }

  applyCapture(text: string | null): void {
    if (!text) {
      this.toast("Nothing selected", "empty");
      return;
    }
    const result = this.session.captureText(text);
    if (!result.ok) {
      this.toast(result.reason === "duplicate" ? "Already captured" : "Nothing selected", "empty");
      return;
    }
    this.toast("Captured", "ok");
    if (result.note) this.patchUi({ selectedIds: [result.note.id] });
  }

  submitComposer(): void {
    const result = this.session.submitComposer(this.ui.composer);
    if (result.kind === "empty") return;
    this.patchUi({ composer: "", selectedIds: result.id ? [result.id] : this.ui.selectedIds });
    if (result.kind === "section") this.toast("Section ready", "ok");
  }

  select(id: NoteId, mode: "replace" | "toggle" | "range", orderedIds: NoteId[]): void {
    const current = this.ui.selectedIds;
    if (mode === "toggle") {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      this.patchUi({ selectedIds: next, editingId: null });
      return;
    }
    if (mode === "range" && current[0]) {
      const origin = orderedIds.indexOf(current[0]);
      const target = orderedIds.indexOf(id);
      if (origin >= 0 && target >= 0) {
        const [from, to] = origin < target ? [origin, target] : [target, origin];
        this.patchUi({ selectedIds: orderedIds.slice(from, to + 1), editingId: null });
        return;
      }
    }
    this.patchUi({ selectedIds: [id], editingId: null });
  }

  async copySelection(format: "plain" | "list"): Promise<void> {
    const text = this.session.copyPayload(this.ui.selectedIds, format);
    if (!text) return;
    await this.bridge.writeClipboard(text);
    if (this.session.snapshot().settings.markDoneOnCopy && this.ui.selectedIds.length > 0) {
      this.session.setDone(this.ui.selectedIds, true);
    }
    this.toast(format === "list" ? "Copied as list" : "Copied", "ok");
  }

  async attachFiles(noteId: NoteId | null, files: File[]): Promise<void> {
    const targetId =
      noteId ??
      this.ui.selectedIds[0] ??
      this.session.addNote(files.length === 1 ? files[0]?.name ?? "Attachment" : "Files").id;
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const attachment: Attachment = await this.bridge.saveAttachment({
        name: file.name,
        bytes,
        mimeType: file.type || "application/octet-stream",
      });
      this.session.attach(targetId, attachment);
    }
  }

  saveSketch(sketch: SketchDocument, preview: string, png?: Attachment): void {
    if (this.ui.sketchNoteId) {
      this.session.updateSketch(this.ui.sketchNoteId, sketch, preview);
      if (png) this.session.attach(this.ui.sketchNoteId, png);
    } else {
      this.session.addSketch(sketch, preview, png);
    }
    this.patchUi({ sketchOpen: false, sketchNoteId: null });
    this.toast("Sketch saved", "ok");
  }

  handleDomainHud(event: DomainEvent): void {
    if (event.type === "captured") this.toast("Captured", "ok");
    if (event.type === "rejected") {
      this.toast(event.reason === "duplicate" ? "Already captured" : "Nothing selected", "empty");
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
