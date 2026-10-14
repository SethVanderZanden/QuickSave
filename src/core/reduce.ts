import type { WorkspaceAction } from "./actions";
import type { Note, Section, Workspace } from "./models";

export function reduce(state: Workspace, action: WorkspaceAction): Workspace {
  switch (action.type) {
    case "REPLACE":
      return action.workspace;
    case "ADD_NOTE":
      return { ...state, notes: [action.note, ...state.notes] };
    case "UPDATE_NOTE":
      return mapNotes(state, (note) =>
        note.id === action.id ? { ...note, body: action.body, updatedAt: action.now } : note,
      );
    case "TOGGLE_DONE":
      return mapNotes(state, (note) =>
        action.ids.includes(note.id)
          ? { ...note, done: !note.done, updatedAt: action.now }
          : note,
      );
    case "SET_DONE":
      return mapNotes(state, (note) =>
        action.ids.includes(note.id)
          ? { ...note, done: action.done, updatedAt: action.now }
          : note,
      );
    case "DELETE_NOTES":
      return { ...state, notes: state.notes.filter((note) => !action.ids.includes(note.id)) };
    case "ARCHIVE_NOTES": {
      const moving = state.notes.filter((note) => action.ids.includes(note.id));
      return {
        ...state,
        notes: state.notes.filter((note) => !action.ids.includes(note.id)),
        logbook: [
          ...moving.map((note) => ({ ...note, updatedAt: action.now })),
          ...state.logbook,
        ],
      };
    }
    case "RESTORE_NOTE": {
      const note = state.logbook.find((item) => item.id === action.id);
      if (!note) return state;
      const sectionStillExists =
        note.sectionId === null || state.sections.some((section) => section.id === note.sectionId);
      const restored = {
        ...note,
        sectionId: sectionStillExists ? note.sectionId : null,
        updatedAt: action.now,
      };
      return {
        ...state,
        logbook: state.logbook.filter((item) => item.id !== action.id),
        notes: [restored, ...state.notes],
      };
    }
    case "PURGE_LOGBOOK":
      return {
        ...state,
        logbook: state.logbook.filter((note) => !action.ids.includes(note.id)),
      };
    case "MERGE_NOTES": {
      const [first, ...rest] = action.ids;
      if (!first) return state;
      const keep = state.notes.find((note) => note.id === first);
      if (!keep) return state;
      const mergedAttachments = [keep, ...rest.map((id) => state.notes.find((n) => n.id === id))]
        .filter((note): note is Note => Boolean(note))
        .flatMap((note) => note.attachments);
      return {
        ...state,
        notes: state.notes
          .filter((note) => note.id === first || !action.ids.includes(note.id))
          .map((note) =>
            note.id === first
              ? {
                  ...note,
                  body: action.body,
                  attachments: mergedAttachments,
                  updatedAt: action.now,
                }
              : note,
          ),
      };
    }
    case "MOVE_NOTES":
      return mapNotes(state, (note) =>
        action.ids.includes(note.id)
          ? { ...note, sectionId: action.sectionId, updatedAt: action.now }
          : note,
      );
    case "REORDER_NOTES": {
      const position = new Map(action.orderedIds.map((id, index) => [id, index]));
      const ordered = [...state.notes].sort((a, b) => {
        const ai = position.get(a.id);
        const bi = position.get(b.id);
        if (ai === undefined && bi === undefined) return 0;
        if (ai === undefined) return 1;
        if (bi === undefined) return -1;
        return ai - bi;
      });
      return { ...state, notes: ordered };
    }
    case "TOGGLE_EXPAND":
      return mapNotes(state, (note) =>
        action.ids.includes(note.id) ? { ...note, expanded: !note.expanded } : note,
      );
    case "ATTACH":
      return mapNotes(state, (note) =>
        note.id === action.id
          ? {
              ...note,
              attachments: [...note.attachments, action.attachment],
              updatedAt: action.now,
            }
          : note,
      );
    case "DETACH":
      return mapNotes(state, (note) =>
        note.id === action.id
          ? {
              ...note,
              attachments: note.attachments.filter((file) => file.id !== action.attachmentId),
              updatedAt: action.now,
            }
          : note,
      );
    case "ADD_SKETCH":
      return { ...state, notes: [action.note, ...state.notes] };
    case "UPDATE_SKETCH":
      return mapNotes(state, (note) =>
        note.id === action.id
          ? { ...note, sketch: action.sketch, body: action.preview, updatedAt: action.now }
          : note,
      );
    case "UPSERT_SECTION": {
      const existing = state.sections.find(
        (section) => section.name.toLowerCase() === action.section.name.toLowerCase(),
      );
      const sections = existing
        ? state.sections.map((section) =>
            section.id === existing.id
              ? { ...section, collapsed: false }
              : action.fresh
                ? { ...section, collapsed: true }
                : section,
          )
        : [
            ...state.sections.map((section) =>
              action.fresh ? { ...section, collapsed: true } : section,
            ),
            action.section,
          ];
      const id = existing?.id ?? action.section.id;
      return {
        ...state,
        sections,
        activeView: { type: "section", id },
      };
    }
    case "RENAME_SECTION":
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === action.id ? { ...section, name: action.name } : section,
        ),
      };
    case "DELETE_SECTION": {
      const remaining = state.sections.filter((section) => section.id !== action.id);
      const notes = action.keepNotes
        ? state.notes.map((note) =>
            note.sectionId === action.id ? { ...note, sectionId: null, updatedAt: action.now } : note,
          )
        : state.notes.filter((note) => note.sectionId !== action.id);
      const archived = action.keepNotes
        ? []
        : state.notes
            .filter((note) => note.sectionId === action.id)
            .map((note) => ({ ...note, updatedAt: action.now }));
      const activeView =
        state.activeView.type === "section" && state.activeView.id === action.id
          ? ({ type: "all" } as const)
          : state.activeView;
      return {
        ...state,
        sections: remaining.map((section, index) => ({ ...section, order: index })),
        notes,
        logbook: [...archived, ...state.logbook],
        activeView,
      };
    }
    case "REORDER_SECTIONS": {
      const position = new Map(action.orderedIds.map((id, index) => [id, index]));
      const sections = [...state.sections]
        .sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0))
        .map((section, index) => ({ ...section, order: index }));
      return { ...state, sections };
    }
    case "TOGGLE_SECTION_COLLAPSE":
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === action.id ? { ...section, collapsed: !section.collapsed } : section,
        ),
      };
    case "SET_VIEW":
      return { ...state, activeView: action.view };
    case "CLEAR_DONE": {
      const shouldArchive = (note: Note) => {
        if (!note.done) return false;
        if (action.scope === "section") return note.sectionId === action.sectionId;
        if (state.activeView.type === "section") return note.sectionId === state.activeView.id;
        return true;
      };
      const moving = state.notes.filter(shouldArchive);
      return {
        ...state,
        notes: state.notes.filter((note) => !shouldArchive(note)),
        logbook: [
          ...moving.map((note) => ({ ...note, updatedAt: action.now })),
          ...state.logbook,
        ],
      };
    }
    case "PATCH_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "SET_WINDOW":
      return { ...state, window: action.frame };
    default: {
      const _never: never = action;
      return _never;
    }
  }
}

function mapNotes(state: Workspace, mapper: (note: Note) => Note): Workspace {
  return { ...state, notes: state.notes.map(mapper) };
}

export function nextSectionOrder(sections: Section[]): number {
  return sections.reduce((max, section) => Math.max(max, section.order), -1) + 1;
}
