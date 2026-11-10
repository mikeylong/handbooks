# CI fixture staging correction

PR41 run42758648098 failed in test-weekly-toolkit.py: the copied book included the new current download PDF but omitted the distinct configured previous-edition comparison PDF. The later PDF integration fixture had the reciprocal assumption: it copied only the comparison PDF while the reader builder now links the new current PDF.

Both fixture setups now copy their two authoritative inputs and verify the appropriate SHA-256. No assertion is removed or weakened. The six approved candidate PDFs, source content, reader/Markdown bytes and browser evidence remain unchanged.

Focused checks reproduce the missing distinct baseline, verify exact copies and preserved current PDF bytes, and validate changed/unchanged staged HTML without launching a browser. This is not a rerun or success claim for the failed full CI worker. A fresh owner decision is required before pushing this correction and starting a new CI attempt. Publication remains blocked until complete CI, native PDFKit and live release gates pass.
