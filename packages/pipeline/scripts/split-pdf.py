#!/usr/bin/env python3
"""Split a PDF into page images using pypdfium2, with optional pre-processing
for low-quality / complex scans (grayscale, upscale, deskew, binarize).

Pre-processing is controlled by environment variables so the Node side does not
need to change its call signature:
  OCR_PREPROCESS : "1"/"true"/"auto"  enable pre-processing
                   ("auto" = only upscale genuinely low-res pages)
  OCR_UPSCALE    : float factor applied to every page when pre-processing (default 1.0)
  OCR_DESKEW     : "0" disables deskew (default enabled when OpenCV available)
  OCR_BINARIZE   : "1"/"true" enables adaptive thresholding (off by default)
  OCR_MAX_PAGES  : overrides the maximum page-count guard

On failure the script prints {"error": "<code>: <message>"} to stdout and exits
non-zero, so the calling process can surface a precise, actionable error.
"""

import json
import os
import sys
import tempfile
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image

# ---------------------------------------------------------------------------
# Pre-processing helpers (guarded so a missing OpenCV never crashes the split)
# ---------------------------------------------------------------------------
try:
    import cv2
    import numpy as np

    _HAS_CV2 = True
except Exception:  # pragma: no cover - optional dependency
    _HAS_CV2 = False


def _preprocess(image, upscale, deskew, binarize, auto_upscale):
    """Apply low-quality pre-processing to a PIL image. Returns a PIL image."""
    if not (_HAS_CV2):
        # Without OpenCV we can still upscale via PIL (helps low-res scans).
        if (upscale and upscale != 1.0) or auto_upscale:
            w, h = image.size
            if auto_upscale:
                min_side = float(min(w, h))
                factor = max(1.0, 1400.0 / min_side) if min_side > 0 else 1.0
                factor = min(factor, 4.0)
            else:
                factor = upscale
            if factor != 1.0:
                image = image.resize((int(w * factor), int(h * factor)), Image.LANCZOS)
        return image

    arr = np.array(image.convert("L"))  # grayscale
    gray = arr

    # Deskew (rotation correction) — clamped to avoid over-rotation.
    if deskew:
        coords = np.column_stack(np.where(gray < 128))
        if len(coords) > 50:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = 90 + angle
            else:
                angle = -angle
            angle = max(-10.0, min(10.0, angle))
            if abs(angle) > 0.25:
                h, w = gray.shape
                center = (w // 2, h // 2)
                m = cv2.getRotationMatrix2D(center, angle, 1.0)
                gray = cv2.warpAffine(
                    gray,
                    m,
                    (w, h),
                    flags=cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_REPLICATE,
                )

    # Upscale low-resolution scans so OCR engines see enough pixels.
    if auto_upscale:
        h, w = gray.shape
        min_side = float(min(w, h))
        factor = max(1.0, 1400.0 / min_side) if min_side > 0 else 1.0
        factor = min(factor, 4.0)
        if factor > 1.0:
            gray = cv2.resize(
                gray, None, fx=factor, fy=factor, interpolation=cv2.INTER_CUBIC
            )
    elif upscale and upscale != 1.0:
        h, w = gray.shape
        gray = cv2.resize(
            gray, None, fx=upscale, fy=upscale, interpolation=cv2.INTER_CUBIC
        )

    # Optional adaptive binarization for faded / noisy text (helps Tesseract).
    if binarize:
        gray = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 10
        )

    return Image.fromarray(gray)


def split_pdf(pdf_path, output_dir, dpi=300, max_pages=None, preprocess=False):
    """Split PDF into PNG images, one per page.

    If `max_pages` is set, the document is rejected up-front when it exceeds the
    limit (bounding temporary disk usage without rendering first).
    """
    try:
        pdf = pdfium.PdfDocument(pdf_path)
    except Exception as e:  # encrypted / corrupt / unreadable PDF
        msg = str(e).lower()
        if "password" in msg or "encrypted" in msg:
            raise ValueError("PDF_ENCRYPTED: document is password-protected")
        raise ValueError(f"PDF_INVALID: could not open document ({e})")
        msg = str(e).lower()
        if "password" in msg or "encrypted" in msg:
            raise ValueError("PDF_ENCRYPTED: document is password-protected")
        raise ValueError(f"PDF_INVALID: could not open document ({e})")

    page_count = len(pdf)
    if max_pages is not None and page_count > max_pages:
        pdf.close()
        raise ValueError(f"PDF_EXCEEDS_MAX_PAGES: {page_count} > {max_pages}")

    scale = dpi / 72.0
    pages = []

    # Defensive: ensure the output directory exists even if the caller did not
    # pre-create it (avoids opaque "No such file or directory" failures).
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    upscale = float(os.environ.get("OCR_UPSCALE", "1.0") or "1.0")
    deskew = os.environ.get("OCR_DESKEW", "1") != "0"
    binarize = os.environ.get("OCR_BINARIZE", "0") in ("1", "true")
    auto_upscale = preprocess == "auto"

    for i in range(page_count):
        page = pdf[i]
        try:
            bitmap = page.render(scale=scale)
        except Exception as e:
            pdf.close()
            raise ValueError(f"PDF_RENDER_FAILED: page {i + 1} ({e})")
        pil_image = bitmap.to_pil()

        if preprocess:
            pil_image = _preprocess(pil_image, upscale, deskew, binarize, auto_upscale)

        page_path = str(Path(output_dir) / f"page_{i + 1}.png")
        pil_image.save(page_path, "PNG")
        pages.append(
            {
                "number": i + 1,
                "path": page_path,
                "width": pil_image.width,
                "height": pil_image.height,
            }
        )

    pdf.close()
    return {"pages": pages, "pageCount": len(pages)}


def main():
    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    max_pages = int(sys.argv[4]) if len(sys.argv) > 4 else None
    # Allow OCR_MAX_PAGES override (defense-in-depth on top of the Node guard).
    env_max = os.environ.get("OCR_MAX_PAGES")
    if env_max:
        env_max_i = int(env_max)
        max_pages = env_max_i if max_pages is None else min(max_pages, env_max_i)

    # Default to "auto": pre-processing is applied for low-quality / complex
    # scans (upscale genuinely low-res pages, deskew rotated scans, grayscale)
    # while leaving already-clean pages effectively unchanged. Operators can set
    # OCR_PREPROCESS=0 to disable or =1 for unconditional upscaling.
    preprocess = os.environ.get("OCR_PREPROCESS", "auto")
    if preprocess in ("1", "true"):
        preprocess_mode = True
    elif preprocess == "auto":
        preprocess_mode = "auto"
    else:
        preprocess_mode = False

    try:
        result = split_pdf(pdf_path, output_dir, dpi, max_pages, preprocess_mode)
        print(json.dumps(result))
    except ValueError as e:
        # Structured error so the caller can surface a precise message.
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"PDF_SPLIT_FAILED: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
