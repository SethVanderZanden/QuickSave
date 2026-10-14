export function nativeSelectedText(target: EventTarget | null = document.activeElement): string {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (end > start) return target.value.slice(start, end);
    return "";
  }
  if (typeof document === "undefined") return "";
  return document.getSelection()?.toString() ?? "";
}
