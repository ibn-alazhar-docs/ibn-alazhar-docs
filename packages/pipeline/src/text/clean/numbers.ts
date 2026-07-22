export function normalizeDigits(text: string): string {
  text = text.replace(/[\u0660-\u0669]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x0660 + 0x0030),
  );
  text = text.replace(/[\u06F0-\u06F9]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x06f0 + 0x0030),
  );
  return text;
}
