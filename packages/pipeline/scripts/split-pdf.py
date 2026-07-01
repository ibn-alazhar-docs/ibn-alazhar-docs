#!/usr/bin/env python3
"""Split PDF into page images using pypdfium2."""

import json
import sys
import tempfile
from pathlib import Path
import pypdfium2 as pdfium


def split_pdf(pdf_path: str, output_dir: str, dpi: int = 300) -> dict:
    """Split PDF into PNG images, one per page."""
    pdf = pdfium.PdfDocument(pdf_path)
    scale = dpi / 72
    pages = []

    for i in range(len(pdf)):
        page = pdf[i]
        bitmap = page.render(scale=scale)
        pil_image = bitmap.to_pil()
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


if __name__ == "__main__":
    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 300
    result = split_pdf(pdf_path, output_dir, dpi)
    print(json.dumps(result))
