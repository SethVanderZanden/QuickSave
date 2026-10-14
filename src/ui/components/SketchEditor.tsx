import type { Point, SketchDocument, SketchStroke, SketchTool } from "@/core/models";
import { ArrowUpRight, Circle, Minus, MousePointer2, Square, Type, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useApp } from "../hooks/use-app";
import { cn } from "../lib/utils";

const COLORS = ["#e8c39e", "#f4efe8", "#d08a4c", "#e07864", "#7dcea0", "#7eb6d9", "#1c1712"];

export function SketchEditor() {
  const { controller, workspace, ui } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<SketchTool>("pen");
  const [color, setColor] = useState(COLORS[0] ?? "#e8c39e");
  const [width, setWidth] = useState(2.5);
  const existing = workspace.notes.find((note) => note.id === ui.sketchNoteId)?.sketch;
  const [doc, setDoc] = useState<SketchDocument>(
    existing ?? { width: 960, height: 640, background: "transparent", strokes: [] },
  );
  const draft = useRef<Point[]>([]);
  const drawing = useRef(false);

  useEffect(() => {
    redraw(canvasRef.current, doc);
  }, [doc]);

  useEffect(() => {
    if (!ui.sketchOpen) return;
    const next = workspace.notes.find((note) => note.id === ui.sketchNoteId)?.sketch;
    setDoc(next ?? { width: 960, height: 640, background: "transparent", strokes: [] });
    // Intentionally not depending on workspace.notes — opening the editor snapshots the sketch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui.sketchOpen, ui.sketchNoteId]);

  if (!ui.sketchOpen) return null;

  const close = () => controller.patchUi({ sketchOpen: false, sketchNoteId: null });

  const pointer = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * doc.width,
      y: ((event.clientY - rect.top) / rect.height) * doc.height,
    };
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[var(--bg)] no-drag">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <p className="text-xs tracking-[0.16em] uppercase text-[var(--muted)]">Sketch</p>
        <div className="flex items-center gap-1">
          <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} label="Pen">
            <MousePointer2 className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton active={tool === "line"} onClick={() => setTool("line")} label="Line">
            <Minus className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton active={tool === "arrow"} onClick={() => setTool("arrow")} label="Arrow">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton active={tool === "rect"} onClick={() => setTool("rect")} label="Rect">
            <Square className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton active={tool === "ellipse"} onClick={() => setTool("ellipse")} label="Ellipse">
            <Circle className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton active={tool === "text"} onClick={() => setTool("text")} label="Text">
            <Type className="h-3.5 w-3.5" />
          </ToolButton>
        </div>
        <div className="flex items-center gap-1">
          {COLORS.map((value) => (
            <button
              key={value}
              type="button"
              aria-label={value}
              onClick={() => setColor(value)}
              className={cn(
                "h-4 w-4 rounded-full border",
                color === value ? "border-white" : "border-transparent",
              )}
              style={{ background: value }}
            />
          ))}
          <input
            type="range"
            min={1}
            max={12}
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
            className="w-16"
          />
          <button
            type="button"
            onClick={() => setDoc((current) => ({ ...current, strokes: current.strokes.slice(0, -1) }))}
            className="rounded-md p-1 hover:bg-[var(--fill)]"
            aria-label="Undo stroke"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={close} className="rounded-md p-1 hover:bg-[var(--fill)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="relative min-h-0 flex-1 bg-[linear-gradient(45deg,var(--fill)_25%,transparent_25%),linear-gradient(-45deg,var(--fill)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,var(--fill)_75%),linear-gradient(-45deg,transparent_75%,var(--fill)_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]">
        <canvas
          ref={canvasRef}
          data-testid="sketch-canvas"
          width={doc.width}
          height={doc.height}
          className="h-full w-full cursor-crosshair touch-none bg-[#14110f]"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            const point = pointer(event);
            if (tool === "text") {
              const text = window.prompt("Text");
              if (!text) return;
              setDoc((current) => ({
                ...current,
                strokes: [...current.strokes, stroke(tool, color, width, [point], text)],
              }));
              return;
            }
            drawing.current = true;
            draft.current = [point];
          }}
          onPointerMove={(event) => {
            if (!drawing.current) return;
            draft.current = [...draft.current, pointer(event)];
            const preview = {
              ...doc,
              strokes: [...doc.strokes, stroke(tool, color, width, draft.current)],
            };
            redraw(canvasRef.current, preview);
          }}
          onPointerUp={() => {
            if (!drawing.current) return;
            drawing.current = false;
            const points = draft.current;
            draft.current = [];
            if (points.length === 0) return;
            setDoc((current) => ({
              ...current,
              strokes: [...current.strokes, stroke(tool, color, width, points)],
            }));
          }}
        />
      </div>
      <footer className="flex justify-end gap-2 border-t border-[var(--line)] p-3">
        <button type="button" className="rounded-lg px-3 py-1.5 text-sm hover:bg-[var(--fill)]" onClick={close}>
          Discard
        </button>
        <button
          type="button"
          className="rounded-lg bg-[var(--color-copper)] px-3 py-1.5 text-sm text-[#1a120c]"
          onClick={() => {
            const png = rasterize(canvasRef.current);
            controller.saveSketch(doc, sketchPreview(doc), png);
          }}
        >
          Save to QuickSave
        </button>
      </footer>
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md",
        active ? "bg-[var(--fill)] text-[var(--color-copper-soft)]" : "text-[var(--muted)] hover:bg-[var(--fill)]",
      )}
    >
      {children}
    </button>
  );
}

function stroke(
  tool: SketchTool,
  color: string,
  width: number,
  points: Point[],
  text?: string,
): SketchStroke {
  return { id: crypto.randomUUID(), tool, color, width, points, text };
}

function redraw(canvas: HTMLCanvasElement | null, doc: SketchDocument): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, doc.width, doc.height);
  for (const item of doc.strokes) drawStroke(ctx, item);
}

function drawStroke(ctx: CanvasRenderingContext2D, item: SketchStroke): void {
  const start = item.points[0];
  const end = item.points[item.points.length - 1];
  if (!start) return;
  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = item.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (item.tool === "text" && item.text) {
    ctx.font = `${Math.max(16, item.width * 8)}px Segoe UI, sans-serif`;
    ctx.fillText(item.text, start.x, start.y);
    return;
  }
  if (item.tool === "rect" && end) {
    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    return;
  }
  if (item.tool === "ellipse" && end) {
    ctx.beginPath();
    ctx.ellipse(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2,
      Math.abs(end.x - start.x) / 2,
      Math.abs(end.y - start.y) / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  for (const point of item.points.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.stroke();
  if (item.tool === "arrow" && end && item.points.length > 1) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - 12 * Math.cos(angle - 0.4), end.y - 12 * Math.sin(angle - 0.4));
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - 12 * Math.cos(angle + 0.4), end.y - 12 * Math.sin(angle + 0.4));
    ctx.stroke();
  }
}

function sketchPreview(doc: SketchDocument): string {
  const text = doc.strokes
    .filter((item) => item.tool === "text" && item.text)
    .map((item) => item.text)
    .join(" · ");
  return text ? `Sketch · ${text}` : `Sketch · ${doc.strokes.length} stroke${doc.strokes.length === 1 ? "" : "s"}`;
}

function rasterize(canvas: HTMLCanvasElement | null) {
  if (!canvas) return undefined;
  const dataUrl = canvas.toDataURL("image/png");
  return {
    id: crypto.randomUUID(),
    name: "sketch.png",
    mimeType: "image/png",
    size: dataUrl.length,
    dataUrl,
  };
}
