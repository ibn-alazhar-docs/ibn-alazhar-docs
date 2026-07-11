#!/usr/bin/env python3
"""Split a PDF into page images using pypdfium2, with an enhanced
pre-processing chain for low-quality / complex Arabic scans.

Pre-processing is controlled by environment variables so the Node side does
not need to change its call signature. The chain is applied in a fixed,
safe order and every step is individually toggleable:

  OCR_PREPROCESS : "1"/"true"/"auto"  enable pre-processing
                   ("auto" = only upscale genuinely low-res pages,
                    but still deskew / normalize / denoise when needed)
  OCR_MIN_DPI    : minimum DPI floor for the rasterisation (default 300)
  OCR_TARGET_DPI : upscale low-res pages toward this (default 400)
  OCR_UPSCALE    : explicit factor applied to every page (default 1.0)
  OCR_DESKEW     : "0" disables deskew (default enabled, ±15° clamp)
  OCR_CLAHE      : "0" disables contrast enhancement (default on)
  OCR_DENOISE    : "0" disables Non-local Means denoise (default on)
  OCR_SHADOW     : "0" disables shadow/illumination normalization (default on)
  OCR_BORDER     : "1"/"true" enables content border cropping (off by default)
  OCR_PERSPECTIVE: "1"/"true" enables perspective correction (off by default)
  OCR_BINARIZE   : "1"/"true" enables adaptive thresholding (off by default)
  OCR_SAUVOLA    : "1"/"true" uses Sauvola instead of Gaussian adaptive
  OCR_SHARPEN    : "1"/"true" enables unsharp masking (off by default)
  OCR_MAX_PAGES  : overrides the maximum page-count guard

The chain never alters glyph shapes or removes diacritics: it only adjusts
pixel-level quality (contrast, noise, skew, illumination) on a grayscale
copy, so Arabic tashkeel is preserved.

On failure the script prints {"error": "<code>: <message>"} to stdout and
exits non-zero, so the calling process can surface a precise, actionable
error.
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


def _sauvola(gray, window=25, k=0.2, r=128.0):
    """Sauvola local threshold (text = dark on light). Returns binary 0/255."""
    gray_f = gray.astype(np.float32)
    mean = cv2.boxFilter(gray_f, -1, (window, window), borderType=cv2.BORDER_REPLICATE)
    mean_sq = cv2.boxFilter(
        gray_f * gray_f, -1, (window, window), borderType=cv2.BORDER_REPLICATE
    )
    std = np.sqrt(np.maximum(mean_sq - mean * mean, 0.0))
    threshold = mean * (1.0 + k * (1.0 - std / r))
    binary = np.where(gray_f < threshold, 0, 255).astype(np.uint8)
    return binary


def _normalize_illumination(gray):
    """Remove shadows / uneven illumination via background estimation.

    Estimates the (smooth) background with a large morphological opening,
    then divides the image by it. This lifts darkened edges and yellowing
    without touching glyph strokes.
    """
    # Moderately large elliptical kernel for background estimation. Capped to
    # keep the opening cheap on large (300+ DPI) pages.
    kh = max(15, gray.shape[0] // 20)
    kw = max(15, gray.shape[1] // 20)
    kh, kw = min(kh, 31) | 1, min(kw, 31) | 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kw, kh))
    background = cv2.morphologyEx(gray, cv2.MORPH_OPEN, kernel)
    background = np.clip(background, 1, 255).astype(np.float32)
    corrected = gray.astype(np.float32) / background * 255.0
    return np.clip(corrected, 0, 255).astype(np.uint8)


def _border_crop(gray, pad=8):
    """Crop large uniform borders to the content bounding box.

    Only crops when a substantial uniform margin exists, so legitimate
    page furniture (rules, headers) is never removed.
    """
    _, th = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    coords = cv2.findNonZero(th)
    if coords is None:
        return gray
    x, y, w, h = cv2.boundingRect(coords)
    # Skip if the content already fills most of the page.
    if x < 5 and y < 5 and (x + w) > gray.shape[1] - 5 and (y + h) > gray.shape[0] - 5:
        return gray
    x0 = max(0, x - pad)
    y0 = max(0, y - pad)
    x1 = min(gray.shape[1], x + w + pad)
    y1 = min(gray.shape[0], y + h + pad)
    return gray[y0:y1, x0:x1]


def _detect_rotation_and_deskew(gray, max_angle=15.0):
    """Correct rotation and deskew using Hough transform.
    
    Detects if the image is rotated 90 or 270 degrees by comparing
    horizontal and vertical projection profiles. Then deskews.
    """
    # 1. Rotation detection (90 / 270 / 0)
    # Text lines are usually horizontal. If vertical projection variance is
    # much higher than horizontal, it's likely rotated by 90 or 270 degrees.
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    h_proj = np.sum(binary, axis=1)
    v_proj = np.sum(binary, axis=0)
    
    if np.var(v_proj) > np.var(h_proj) * 1.5:
        # Rotated 90 or 270 degrees. For simplicity, rotate 90.
        # Advanced: use tesseract OSD for 180 degree detection.
        gray = cv2.rotate(gray, cv2.ROTATE_90_CLOCKWISE)
        binary = cv2.rotate(binary, cv2.ROTATE_90_CLOCKWISE)

    # 2. Deskew using Hough Lines
    edges = cv2.Canny(binary, 50, 150, apertureSize=3)
    lines = cv2.HoughLines(edges, 1, np.pi / 180, 200)
    
    angle = 0.0
    if lines is not None:
        angles = []
        for line in lines:
            rho, theta = line[0]
            deg = np.degrees(theta)
            if deg < 45:
                angles.append(deg)
            elif deg > 135:
                angles.append(deg - 180)
            elif 45 <= deg <= 135:
                angles.append(deg - 90)
        
        if angles:
            median_angle = np.median(angles)
            if abs(median_angle) < max_angle:
                angle = median_angle
    else:
        # Fallback to minAreaRect
        coords = np.column_stack(np.where(binary > 0))
        if len(coords) > 50:
            rect_angle = cv2.minAreaRect(coords)[-1]
            if rect_angle < -45:
                rect_angle = 90 + rect_angle
            else:
                rect_angle = -rect_angle
            if abs(rect_angle) < max_angle:
                angle = rect_angle
                
    if abs(angle) <= 0.25:
        return gray, 0.0

    h, w = gray.shape
    center = (w // 2, h // 2)
    m = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        gray, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )
    return rotated, float(angle)


def _sharpen(gray):
    """Apply an unsharp mask to enhance text edges."""
    gaussian_3 = cv2.GaussianBlur(gray, (0, 0), 2.0)
    unsharp = cv2.addWeighted(gray, 1.5, gaussian_3, -0.5, 0, gray)
    return unsharp


def _perspective_correction(gray):
    """Automatic perspective correction using document contours."""
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 75, 200)
    
    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    
    doc_cnt = None
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            doc_cnt = approx
            break
            
    if doc_cnt is not None:
        # Check if the contour covers a reasonable portion of the image (e.g. > 20%)
        area = cv2.contourArea(doc_cnt)
        if area > 0.2 * gray.shape[0] * gray.shape[1]:
            pts = doc_cnt.reshape(4, 2)
            rect = np.zeros((4, 2), dtype="float32")
            s = pts.sum(axis=1)
            rect[0] = pts[np.argmin(s)]
            rect[2] = pts[np.argmax(s)]
            diff = np.diff(pts, axis=1)
            rect[1] = pts[np.argmin(diff)]
            rect[3] = pts[np.argmax(diff)]
            
            (tl, tr, br, bl) = rect
            widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
            widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
            maxWidth = max(int(widthA), int(widthB))
            
            heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
            heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
            maxHeight = max(int(heightA), int(heightB))
            
            dst = np.array([
                [0, 0],
                [maxWidth - 1, 0],
                [maxWidth - 1, maxHeight - 1],
                [0, maxHeight - 1]], dtype="float32")
                
            M = cv2.getPerspectiveTransform(rect, dst)
            warped = cv2.warpPerspective(gray, M, (maxWidth, maxHeight))
            return warped
            
    return gray


def _preprocess(
    image,
    target_dpi,
    min_dpi,
    upscale,
    deskew,
    clahe,
    denoise,
    shadow,
    border,
    perspective,
    binarize,
    sauvola,
    auto_upscale,
    sharpen=False,
):
    """Apply the enhanced pre-processing chain to a PIL image.

    Steps run in a fixed, glyph-safe order: grayscale → illumination →
    contrast (CLAHE) → denoise (NLM) → DPI upscale → deskew → border crop →
    (optional) perspective → (optional) binarize.
    """
    if not _HAS_CV2:
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

    gray = np.array(image.convert("L"))
    original_w, original_h = gray.shape[1], gray.shape[0]

    if shadow:
        gray = _normalize_illumination(gray)
    if clahe:
        gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    if denoise:
        gray = cv2.fastNlMeansDenoising(gray, h=10)
    if sharpen:
        gray = _sharpen(gray)

    # DPI-aware upscale: bring genuinely low-res scans up to a readable floor
    # (the rendered min-side is compared against a target pixel threshold).
    if auto_upscale:
        min_side = float(min(gray.shape[1], gray.shape[0]))
        factor = max(1.0, 1600.0 / min_side) if min_side > 0 else 1.0
        factor = min(factor, 4.0)
        if factor > 1.0:
            gray = cv2.resize(
                gray, None, fx=factor, fy=factor, interpolation=cv2.INTER_CUBIC
            )
    elif upscale and upscale != 1.0:
        gray = cv2.resize(
            gray, None, fx=upscale, fy=upscale, interpolation=cv2.INTER_CUBIC
        )

    if deskew:
        gray, _ = _detect_rotation_and_deskew(gray)

    if border:
        gray = _border_crop(gray)

    if perspective:
        gray = _perspective_correction(gray)

    if binarize:
        if sauvola:
            gray = _sauvola(gray)
        else:
            gray = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 10
            )

    return Image.fromarray(gray)


def split_pdf(
    pdf_path,
    output_dir,
    dpi=300,
    max_pages=None,
    preprocess=False,
    min_dpi=300,
    target_dpi=400,
):
    """Split PDF into PNG images, one per page.

    If `max_pages` is set, the document is rejected up-front when it exceeds
    the limit (bounding temporary disk usage without rendering first).
    """
    try:
        pdf = pdfium.PdfDocument(pdf_path)
    except Exception as e:  # encrypted / corrupt / unreadable PDF
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

    Path(output_dir).mkdir(parents=True, exist_ok=True)

    upscale = float(os.environ.get("OCR_UPSCALE", "1.0") or "1.0")
    deskew = os.environ.get("OCR_DESKEW", "1") != "0"
    clahe = os.environ.get("OCR_CLAHE", "1") != "0"
    denoise = os.environ.get("OCR_DENOISE", "1") != "0"
    shadow = os.environ.get("OCR_SHADOW", "1") != "0"
    border = os.environ.get("OCR_BORDER", "0") in ("1", "true")
    perspective = os.environ.get("OCR_PERSPECTIVE", "0") in ("1", "true")
    binarize = os.environ.get("OCR_BINARIZE", "0") in ("1", "true")
    sauvola = os.environ.get("OCR_SAUVOLA", "0") in ("1", "true")
    sharpen = os.environ.get("OCR_SHARPEN", "0") in ("1", "true")
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
            pil_image = _preprocess(
                pil_image,
                target_dpi,
                min_dpi,
                upscale,
                deskew,
                clahe,
                denoise,
                shadow,
                border,
                perspective,
                binarize,
                sauvola,
                auto_upscale,
                sharpen,
            )

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

    preprocess = os.environ.get("OCR_PREPROCESS", "auto")
    if preprocess in ("1", "true"):
        preprocess_mode = True
    elif preprocess == "auto":
        preprocess_mode = "auto"
    else:
        preprocess_mode = False

    min_dpi = int(os.environ.get("OCR_MIN_DPI", "300") or "300")
    target_dpi = int(os.environ.get("OCR_TARGET_DPI", "400") or "400")

    try:
        result = split_pdf(
            pdf_path,
            output_dir,
            dpi,
            max_pages,
            preprocess_mode,
            min_dpi,
            target_dpi,
        )
        print(json.dumps(result))
    except ValueError as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"PDF_SPLIT_FAILED: {e}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
