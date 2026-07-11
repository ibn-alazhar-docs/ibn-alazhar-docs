#!/usr/bin/env python3
"""
benchmark-ocr.py
Measures Character Error Rate (CER) and Word Error Rate (WER) using jiwer.
Usage:
  python benchmark-ocr.py <ground_truth_file> <prediction_file>
Outputs a JSON string with the metrics.
"""

import sys
import json
import jiwer
import os

def normalize_text(text):
    # Remove excessive whitespace but keep basic tokens
    return " ".join(text.split())

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: benchmark-ocr.py <ground_truth_file> <prediction_file>"}))
        sys.exit(1)
        
    gt_file = sys.argv[1]
    pred_file = sys.argv[2]
    
    try:
        with open(gt_file, 'r', encoding='utf-8') as f:
            gt_text = normalize_text(f.read())
            
        with open(pred_file, 'r', encoding='utf-8') as f:
            pred_text = normalize_text(f.read())
            
        if not gt_text:
            print(json.dumps({"error": "Ground truth text is empty."}))
            sys.exit(1)
            
        if not pred_text:
            print(json.dumps({"wer": 1.0, "cer": 1.0, "error": "Prediction text is empty."}))
            sys.exit(0)

        # compute WER and CER
        wer = jiwer.wer(gt_text, pred_text)
        cer = jiwer.cer(gt_text, pred_text)
        
        print(json.dumps({
            "wer": wer,
            "cer": cer
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
