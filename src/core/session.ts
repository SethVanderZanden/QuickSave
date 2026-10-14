import type { WorkspaceAction } from "./actions";
import { CapturePolicy } from "./capture-policy";
import type { Clock } from "./clock";
import { parseComposer } from "./composer";
import { copyAsList, copyPlain, exportMarkdown, mergeBodies } from "./export";
import type { IdGenerator } from "./ids";
import {
  createNote,
  createSection,
  type Attachment,
  type Note,
  type NoteId,
  type SectionId,
  type Settings,
  type SketchDocument,
  type Workspace,
} from "./models";
import type { DomainEvent, WorkspaceStore } from "./ports";
import { nextSectionOrder, reduce } from "./reduce";
import { filterNotes, findSectionByName, visibleNotes } from "./search";

const UNDO_LIMIT = 40;

export class WorkspaceSession {
  private workspace: Workspace;
  private past: Workspace[] = [];
  private future: Workspace[] = [];
  private readonly listeners = new Set<(workspace: Workspace, event: DomainEvent) => void>();
  readonly capturePolicy: CapturePolicy;

  constructor(
    private readonly store: WorkspaceStore,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    initial: Workspace,
  ) {
    this.workspace = initial;
    this.capturePolicy = new CapturePolicy(clock);
  }

  snapshot(): Workspace {
    return this.workspace;
  }

  subscribe(listener: (workspace: Workspace, event: DomainEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async hydrate(): Promise<Workspace> {
    const loaded = await this.store.load();
    this.workspace = loaded;
    this.past = [];
    this.future = [];
    this.emit({ type: "changed" });
    return loaded;
  }

  captureText(text: string): { ok: boolean; reason?: "empty" | "duplicate"; note?: Note } {
    const decision = this.capturePolicy.prepare(text);
    if (!decision.ok) {
      this.emit({ type: "rejected", reason: decision.reason });
      return { ok: false, reason: decision.reason };
    }
    const note = this.addNote(decision.text);
    this.emit({ type: "captured", noteId: note.id });
    return { ok: true, note };
  }

  submitComposer(raw: string): { kind: "empty" | "note" | "section"; id?: string } {
    const intent = parseComposer(raw);
    if (intent.type === "empty") return { kind: "empty" };
    if (intent.type === "section") {
      const id = this.upsertSection(intent.name, intent.fresh);
      return { kind: "section", id };
    }
    const note = this.addNote(intent.body);
    return { kind: "note", id: note.id };
  }

  addNote(body: string, extra?: Partial<Note>): Note {
    const note = createNote({
      id: extra?.id ?? this.ids.next(),
      body,
      now: this.clock.nowIso(),
      sectionId: extra?.sectionId ?? this.activeSectionId(),
      kind: extra?.kind,
      attachments: extra?.attachments,
      sketch: extra?.sketch,
    });
    this.dispatch({ type: "ADD_NOTE", note });
    return note;
  }

  updateNote(id: NoteId, body: string): void {
    this.dispatch({ type: "UPDATE_NOTE", id, body, now: this.clock.nowIso() });
  }

  toggleDone(ids: NoteId[]): void {
    this.dispatch({ type: "TOGGLE_DONE", ids, now: this.clock.nowIso() });
  }

  setDone(ids: NoteId[], done: boolean): void {
    this.dispatch({ type: "SET_DONE", ids, done, now: this.clock.nowIso() });
  }

  deleteNotes(ids: NoteId[]): void {
    this.dispatch({ type: "DELETE_NOTES", ids });
  }

  archiveNotes(ids: NoteId[]): void {
    this.dispatch({ type: "ARCHIVE_NOTES", ids, now: this.clock.nowIso() });
  }

  restoreNote(id: NoteId): void {
    this.dispatch({ type: "RESTORE_NOTE", id, now: this.clock.nowIso() });
  }

  purgeLogbook(ids: NoteId[]): void {
    this.dispatch({ type: "PURGE_LOGBOOK", ids });
  }

  mergeNotes(ids: NoteId[]): void {
    const notes = ids
      .map((id) => this.workspace.notes.find((note) => note.id === id))
      .filter((note): note is Note => Boolean(note));
    if (notes.length < 2) return;
    this.dispatch({
      type: "MERGE_NOTES",
      ids,
      body: mergeBodies(notes),
      now: this.clock.nowIso(),
    });
  }

  moveNotes(ids: NoteId[], sectionId: SectionId | null): void {
    this.dispatch({ type: "MOVE_NOTES", ids, sectionId, now: this.clock.nowIso() });
  }

  reorderNotes(orderedIds: NoteId[]): void {
    this.dispatch({ type: "REORDER_NOTES", orderedIds });
  }

  toggleExpand(ids: NoteId[]): void {
    this.dispatch({ type: "TOGGLE_EXPAND", ids });
  }

  attach(id: NoteId, attachment: Attachment): void {
    this.dispatch({ type: "ATTACH", id, attachment, now: this.clock.nowIso() });
  }

  detach(id: NoteId, attachmentId: string): void {
    this.dispatch({ type: "DETACH", id, attachmentId, now: this.clock.nowIso() });
  }

  addSketch(sketch: SketchDocument, preview: string, png?: Attachment): Note {
    const note = createNote({
      id: this.ids.next(),
      body: preview,
      now: this.clock.nowIso(),
      sectionId: this.activeSectionId(),
      kind: "sketch",
      sketch,
      attachments: png ? [png] : [],
    });
    this.dispatch({ type: "ADD_SKETCH", note });
    return note;
  }

  updateSketch(id: NoteId, sketch: SketchDocument, preview: string): void {
    this.dispatch({ type: "UPDATE_SKETCH", id, sketch, preview, now: this.clock.nowIso() });
  }

  upsertSection(name: string, fresh = false): SectionId {
    const existing = findSectionByName(this.workspace.sections, name);
    const section = existing
      ? { ...existing }
      : createSection({
          id: this.ids.next(),
          name: name.trim(),
          order: nextSectionOrder(this.workspace.sections),
        });
    this.dispatch({ type: "UPSERT_SECTION", section, fresh, now: this.clock.nowIso() });
    return existing?.id ?? section.id;
  }

  renameSection(id: SectionId, name: string): void {
    this.dispatch({ type: "RENAME_SECTION", id, name: name.trim() });
  }

  deleteSection(id: SectionId, keepNotes: boolean): void {
    this.dispatch({ type: "DELETE_SECTION", id, keepNotes, now: this.clock.nowIso() });
  }

  reorderSections(orderedIds: SectionId[]): void {
    this.dispatch({ type: "REORDER_SECTIONS", orderedIds });
  }

  toggleSectionCollapse(id: SectionId): void {
    this.dispatch({ type: "TOGGLE_SECTION_COLLAPSE", id });
  }

  setView(view: Workspace["activeView"]): void {
    this.dispatch({ type: "SET_VIEW", view });
  }

  cycleView(direction: 1 | -1): void {
    const views: Workspace["activeView"][] = [
      { type: "all" },
      ...[...this.workspace.sections]
        .sort((a, b) => a.order - b.order)
        .map((section) => ({ type: "section" as const, id: section.id })),
    ];
    const current = this.workspace.activeView;
    const index = views.findIndex((view) =>
      current.type === "all"
        ? view.type === "all"
        : current.type === "section" && view.type === "section" && view.id === current.id,
    );
    const next = views[(index + direction + views.length) % views.length];
    if (next) this.setView(next);
  }

  clearDone(scope: "view" | "section" = "view", sectionId?: SectionId): void {
    this.dispatch({ type: "CLEAR_DONE", scope, sectionId, now: this.clock.nowIso() });
  }

  patchSettings(patch: Partial<Settings>): void {
    this.dispatch({ type: "PATCH_SETTINGS", patch });
  }

  copyPayload(ids: NoteId[], format: "plain" | "list"): string {
    const selected = pickNotes(this.workspace, ids);
    return format === "list" ? copyAsList(selected) : copyPlain(selected);
  }

  exportMarkdown(): string {
    return exportMarkdown(this.workspace);
  }

  search(query: string) {
    return filterNotes(this.workspace, query);
  }

  visible(): Note[] {
    return visibleNotes(this.workspace);
  }

  undo(): boolean {
    const previous = this.past.pop();
    if (!previous) return false;
    this.future.push(this.workspace);
    this.workspace = previous;
    this.emit({ type: "changed" });
    void this.store.save(this.workspace);
    return true;
  }

  redo(): boolean {
    const next = this.future.pop();
    if (!next) return false;
    this.past.push(this.workspace);
    this.workspace = next;
    this.emit({ type: "changed" });
    void this.store.save(this.workspace);
    return true;
  }

  private activeSectionId(): SectionId | null {
    return this.workspace.activeView.type === "section"
      ? this.workspace.activeView.id
      : null;
  }

  private dispatch(action: WorkspaceAction): void {
    this.past.push(this.workspace);
    if (this.past.length > UNDO_LIMIT) this.past.shift();
    this.future = [];
    this.workspace = reduce(this.workspace, action);
    this.emit({ type: "changed" });
    void this.store.save(this.workspace);
  }

  private emit(event: DomainEvent): void {
    for (const listener of this.listeners) {
      listener(this.workspace, event);
    }
  }
}

function pickNotes(workspace: Workspace, ids: NoteId[]): Note[] {
  const pool = workspace.activeView.type === "logbook" ? workspace.logbook : workspace.notes;
  if (ids.length === 0) return visibleNotes(workspace);
  const map = new Map(pool.map((note) => [note.id, note]));
  return ids.map((id) => map.get(id)).filter((note): note is Note => Boolean(note));
}
