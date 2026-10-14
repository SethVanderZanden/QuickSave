import {
  DEFAULT_SETTINGS,
  DEFAULT_WINDOW,
  WORKSPACE_VERSION,
  emptyWorkspace,
  type ActiveView,
  type Attachment,
  type Note,
  type Section,
  type Settings,
  type SketchDocument,
  type ThemeName,
  type Workspace,
} from "./models";

export function hydrateWorkspace(raw: unknown): Workspace {
  if (!raw || typeof raw !== "object") {
    return emptyWorkspace();
  }
  const data = raw as Record<string, unknown>;
  const workspace = emptyWorkspace();
  workspace.notes = asArray(data.notes).map(hydrateNote).filter((note): note is Note => note !== null);
  workspace.sections = asArray(data.sections)
    .map(hydrateSection)
    .filter((section): section is Section => section !== null);
  workspace.logbook = asArray(data.logbook)
    .map(hydrateNote)
    .filter((note): note is Note => note !== null);
  workspace.activeView = hydrateView(data.activeView);
  workspace.settings = hydrateSettings(data.settings);
  workspace.window = hydrateWindow(data.window);
  workspace.version = WORKSPACE_VERSION;
  return workspace;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function hydrateNote(raw: unknown): Note | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== "string" || typeof data.body !== "string") return null;
  return {
    id: data.id,
    body: data.body,
    done: Boolean(data.done),
    sectionId: typeof data.sectionId === "string" ? data.sectionId : null,
    kind: data.kind === "sketch" ? "sketch" : "text",
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt),
    expanded: Boolean(data.expanded),
    attachments: asArray(data.attachments)
      .map(hydrateAttachment)
      .filter((file): file is Attachment => file !== null),
    sketch: hydrateSketch(data.sketch),
  };
}

function hydrateAttachment(raw: unknown): Attachment | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== "string" || typeof data.name !== "string") return null;
  return {
    id: data.id,
    name: sanitizeFileName(data.name),
    mimeType: typeof data.mimeType === "string" ? data.mimeType : "application/octet-stream",
    size: typeof data.size === "number" && data.size >= 0 ? data.size : 0,
    relativePath: typeof data.relativePath === "string" ? data.relativePath : undefined,
    dataUrl: typeof data.dataUrl === "string" ? data.dataUrl : undefined,
  };
}

function hydrateSketch(raw: unknown): SketchDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.strokes)) return null;
  return {
    width: num(data.width, 1200),
    height: num(data.height, 800),
    background: typeof data.background === "string" ? data.background : "transparent",
    strokes: data.strokes.flatMap((stroke) => {
      if (!stroke || typeof stroke !== "object") return [];
      const s = stroke as Record<string, unknown>;
      if (typeof s.id !== "string") return [];
      const tool = s.tool;
      if (
        tool !== "pen" &&
        tool !== "rect" &&
        tool !== "ellipse" &&
        tool !== "line" &&
        tool !== "arrow" &&
        tool !== "text"
      ) {
        return [];
      }
      return [
        {
          id: s.id,
          tool,
          color: typeof s.color === "string" ? s.color : "#e8c39e",
          width: num(s.width, 2),
          points: Array.isArray(s.points)
            ? s.points.flatMap((point) => {
                if (!point || typeof point !== "object") return [];
                const p = point as Record<string, unknown>;
                return [{ x: num(p.x, 0), y: num(p.y, 0) }];
              })
            : [],
          text: typeof s.text === "string" ? s.text : undefined,
        },
      ];
    }),
  };
}

function hydrateSection(raw: unknown): Section | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== "string" || typeof data.name !== "string") return null;
  return {
    id: data.id,
    name: data.name,
    order: num(data.order, 0),
    collapsed: Boolean(data.collapsed),
  };
}

function hydrateView(raw: unknown): ActiveView {
  if (!raw || typeof raw !== "object") return { type: "all" };
  const data = raw as Record<string, unknown>;
  if (data.type === "logbook") return { type: "logbook" };
  if (data.type === "section" && typeof data.id === "string") {
    return { type: "section", id: data.id };
  }
  return { type: "all" };
}

function hydrateSettings(raw: unknown): Settings {
  const settings = { ...DEFAULT_SETTINGS };
  if (!raw || typeof raw !== "object") return settings;
  const data = raw as Record<string, unknown>;
  if (isTheme(data.theme)) settings.theme = data.theme;
  if (typeof data.markDoneOnCopy === "boolean") settings.markDoneOnCopy = data.markDoneOnCopy;
  if (typeof data.keepOnTop === "boolean") settings.keepOnTop = data.keepOnTop;
  if (typeof data.launchAtStartup === "boolean") settings.launchAtStartup = data.launchAtStartup;
  if (typeof data.restoreClipboardAfterCapture === "boolean") {
    settings.restoreClipboardAfterCapture = data.restoreClipboardAfterCapture;
  }
  if (typeof data.enableDoubleShift === "boolean") settings.enableDoubleShift = data.enableDoubleShift;
  if (typeof data.showTray === "boolean") settings.showTray = data.showTray;
  return settings;
}

function hydrateWindow(raw: unknown): Workspace["window"] {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_WINDOW };
  const data = raw as Record<string, unknown>;
  return {
    x: num(data.x, DEFAULT_WINDOW.x),
    y: num(data.y, DEFAULT_WINDOW.y),
    width: Math.max(320, num(data.width, DEFAULT_WINDOW.width)),
    height: Math.max(400, num(data.height, DEFAULT_WINDOW.height)),
  };
}

function isTheme(value: unknown): value is ThemeName {
  return value === "system" || value === "light" || value === "dark" || value === "glass";
}

function asIso(value: unknown): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : new Date(0).toISOString();
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function sanitizeFileName(name: string): string {
  const base = name
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\.\./g, "_")
    .replace(/^\.+/, "_")
    .trim();
  const clipped = base.slice(0, 120);
  return clipped.length > 0 ? clipped : "file";
}
