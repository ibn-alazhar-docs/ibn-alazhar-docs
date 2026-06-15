// Polyfill ImageData for Node.js 22+ (canvas v3.x + pdfjs-dist v4 need global ImageData)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const canvasModule: unknown = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("canvas");
  } catch {
    return null;
  }
})();

if (typeof globalThis.ImageData === "undefined" && canvasModule) {
  const mod = canvasModule as { ImageData?: typeof globalThis.ImageData };
  if (mod.ImageData) {
    globalThis.ImageData = mod.ImageData;
  }
}
