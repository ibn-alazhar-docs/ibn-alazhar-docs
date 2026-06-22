import sys
import pytesseract

def main():
    if len(sys.argv) < 3:
        sys.exit(1)
    img_path = sys.argv[1]
    out_path = sys.argv[2]
    # Generate PDF string with Arabic language support
    pdf_bytes = pytesseract.image_to_pdf_or_hocr(img_path, extension='pdf', lang='ara')
    with open(out_path, 'wb') as f:
        f.write(pdf_bytes)

if __name__ == "__main__":
    main()
