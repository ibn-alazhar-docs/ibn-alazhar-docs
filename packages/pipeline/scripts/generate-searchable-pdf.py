#!/usr/bin/env python3
"""
generate-searchable-pdf.py
Takes an image and a JSON file containing OCR text lines and bounding boxes.
Outputs a searchable PDF using PyMuPDF (fitz).
Invisible text is placed over the corresponding regions of the image to enable
searching, copying, and text selection.
"""

import sys
import json
import fitz  # PyMuPDF

def main():
    if len(sys.argv) < 4:
        print("Usage: python generate-searchable-pdf.py <input_image> <input_json> <output_pdf>")
        sys.exit(1)
        
    img_path = sys.argv[1]
    json_path = sys.argv[2]
    out_path = sys.argv[3]
    
    try:
        # 1. Create a new PDF and insert the image
        doc = fitz.open()
        
        # Open the image to get dimensions
        img_doc = fitz.open(img_path)
        rect = img_doc[0].rect
        pdf_bytes = img_doc.convert_to_pdf()
        img_doc.close()
        
        # Open the PDF bytes we just created
        img_pdf = fitz.open("pdf", pdf_bytes)
        page = img_pdf[0]
        
        # 2. Read the layout data
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        lines = data.get("lines", [])
        
        # 3. Add an invisible text layer
        # PyMuPDF uses insert_text or TextWriter
        # We need an Arabic font, or a default fallback if we just want it to be searchable/selectable.
        # But wait, insert_text supports invisible text if we set render_mode=3 (invisible text).
        
        # For simplicity, we can use standard font. It may not align perfectly with complex Arabic shaping
        # without a proper font, but it's enough for searchability/copy-paste in most standard PDF readers.
        
        tw = fitz.TextWriter(page.rect)
        
        for line in lines:
            text = line.get("text", "")
            bbox = line.get("bbox") # [x0, y0, x1, y1]
            if not text or not bbox or len(bbox) != 4:
                continue
                
            x0, y0, x1, y1 = bbox
            width = x1 - x0
            height = y1 - y0
            if width <= 0 or height <= 0:
                continue
                
            # Estimate font size based on bounding box height
            # Typically font_size is slightly less than bbox height
            font_size = height * 0.8
            
            # Create a rectangle for the text
            text_rect = fitz.Rect(x0, y0, x1, y1)
            
            # Write text in invisible mode
            # render_mode=3 means invisible (searchable/selectable)
            page.insert_textbox(
                text_rect,
                text,
                fontsize=font_size,
                fontname="helv",  # Base-14 font, PyMuPDF uses this fallback
                render_mode=3,
                align=1 # Center alignment in box
            )
            
        # Insert the page into the output document
        doc.insert_pdf(img_pdf)
        img_pdf.close()
        
        # 4. Save the PDF
        doc.save(out_path)
        doc.close()
        
    except Exception as e:
        print(f"Error generating PDF: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
