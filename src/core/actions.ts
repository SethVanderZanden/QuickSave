import type {
  ActiveView,
  Attachment,
  Note,
  NoteId,
  Section,
  SectionId,
  Settings,
  SketchDocument,
  WindowFrame,
} from "./models";

export type WorkspaceAction =
  | { type: "REPLACE"; workspace: import("./models").Workspace }
  | { type: "ADD_NOTE"; note: Note }
  | { type: "UPDATE_NOTE"; id: NoteId; body: string; now: string }
  | { type: "TOGGLE_DONE"; ids: NoteId[]; now: string }
  | { type: "SET_DONE"; ids: NoteId[]; done: boolean; now: string }
  | { type: "DELETE_NOTES"; ids: NoteId[] }
  | { type: "ARCHIVE_NOTES"; ids: NoteId[]; now: string }
  | { type: "RESTORE_NOTE"; id: NoteId; now: string }
  | { type: "PURGE_LOGBOOK"; ids: NoteId[] }
  | { type: "MERGE_NOTES"; ids: NoteId[]; body: string; now: string }
  | { type: "MOVE_NOTES"; ids: NoteId[]; sectionId: SectionId | null; now: string }
  | { type: "REORDER_NOTES"; orderedIds: NoteId[] }
  | { type: "TOGGLE_EXPAND"; ids: NoteId[] }
  | { type: "ATTACH"; id: NoteId; attachment: Attachment; now: string }
  | { type: "DETACH"; id: NoteId; attachmentId: string; now: string }
  | { type: "ADD_SKETCH"; note: Note }
  | { type: "UPDATE_SKETCH"; id: NoteId; sketch: SketchDocument; preview: string; now: string }
  | { type: "UPSERT_SECTION"; section: Section; fresh: boolean; now: string }
  | { type: "RENAME_SECTION"; id: SectionId; name: string }
  | { type: "DELETE_SECTION"; id: SectionId; keepNotes: boolean; now: string }
  | { type: "REORDER_SECTIONS"; orderedIds: SectionId[] }
  | { type: "TOGGLE_SECTION_COLLAPSE"; id: SectionId }
  | { type: "SET_VIEW"; view: ActiveView }
  | { type: "CLEAR_DONE"; scope: "view" | "section"; sectionId?: SectionId; now: string }
  | { type: "PATCH_SETTINGS"; patch: Partial<Settings> }
  | { type: "SET_WINDOW"; frame: WindowFrame };
