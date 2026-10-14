export const WORKSPACE_VERSION = 1 as const;
export const MAX_NOTE_CHARS = 20_000;
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const DUPLICATE_WINDOW_MS = 2_000;
export const DEFAULT_DOUBLE_TAP_MS = 400;

export type NoteId = string;
export type SectionId = string;
export type AttachmentId = string;

export type NoteKind = "text" | "sketch";

export type ActiveView =
  | { type: "all" }
  | { type: "section"; id: SectionId }
  | { type: "logbook" };

export type ThemeName = "system" | "light" | "dark" | "glass";

export interface Attachment {
  id: AttachmentId;
  name: string;
  mimeType: string;
  size: number;
  relativePath?: string;
  dataUrl?: string;
}

export interface Point {
  x: number;
  y: number;
}

export type SketchTool = "pen" | "rect" | "ellipse" | "line" | "arrow" | "text";

export interface SketchStroke {
  id: string;
  tool: SketchTool;
  color: string;
  width: number;
  points: Point[];
  text?: string;
}

export interface SketchDocument {
  width: number;
  height: number;
  background: string;
  strokes: SketchStroke[];
}

export interface Note {
  id: NoteId;
  body: string;
  done: boolean;
  sectionId: SectionId | null;
  kind: NoteKind;
  createdAt: string;
  updatedAt: string;
  expanded: boolean;
  attachments: Attachment[];
  sketch: SketchDocument | null;
}

export interface Section {
  id: SectionId;
  name: string;
  order: number;
  collapsed: boolean;
}

export interface Settings {
  theme: ThemeName;
  markDoneOnCopy: boolean;
  keepOnTop: boolean;
  launchAtStartup: boolean;
  restoreClipboardAfterCapture: boolean;
  enableDoubleShift: boolean;
  showTray: boolean;
}

export interface WindowFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Workspace {
  version: typeof WORKSPACE_VERSION;
  notes: Note[];
  sections: Section[];
  logbook: Note[];
  activeView: ActiveView;
  settings: Settings;
  window: WindowFrame;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  markDoneOnCopy: false,
  keepOnTop: true,
  launchAtStartup: false,
  restoreClipboardAfterCapture: true,
  enableDoubleShift: true,
  showTray: true,
};

export const DEFAULT_WINDOW: WindowFrame = {
  x: -1,
  y: -1,
  width: 400,
  height: 640,
};

export function emptyWorkspace(): Workspace {
  return {
    version: WORKSPACE_VERSION,
    notes: [],
    sections: [],
    logbook: [],
    activeView: { type: "all" },
    settings: { ...DEFAULT_SETTINGS },
    window: { ...DEFAULT_WINDOW },
  };
}

export function createNote(input: {
  id: NoteId;
  body: string;
  now: string;
  sectionId?: SectionId | null;
  kind?: NoteKind;
  attachments?: Attachment[];
  sketch?: SketchDocument | null;
}): Note {
  return {
    id: input.id,
    body: input.body,
    done: false,
    sectionId: input.sectionId ?? null,
    kind: input.kind ?? "text",
    createdAt: input.now,
    updatedAt: input.now,
    expanded: false,
    attachments: input.attachments ?? [],
    sketch: input.sketch ?? null,
  };
}

export function createSection(input: {
  id: SectionId;
  name: string;
  order: number;
}): Section {
  return {
    id: input.id,
    name: input.name,
    order: input.order,
    collapsed: false,
  };
}

export function inboxSectionId(note: Note): SectionId | null {
  return note.sectionId;
}
