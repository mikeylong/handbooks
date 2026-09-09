import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// Download labels describe the linked artifact, independently of the HTML's
// page map or candidate pagination. Poppler is also used by the PDF toolchain.
export function pdfDownloadPageCount(handbookDirectory, href) {
  const pdfPath = resolve(handbookDirectory, href);
  let info;
  try {
    info = execFileSync(process.env.HANDBOOK_PDFINFO_BIN || "pdfinfo", [pdfPath], {
      encoding: "utf8",
      env: { ...process.env, LC_ALL: "C" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new Error(`Cannot inspect the linked PDF: ${pdfPath}`, { cause: error });
  }
  const pages = Number(info.match(/^Pages:\s+(\d+)\s*$/m)?.[1]);
  if (!Number.isSafeInteger(pages) || pages < 1) {
    throw new Error(`The linked PDF has no valid positive page count: ${pdfPath}`);
  }

  // Retain the old setting only as an assertion; it cannot override the file.
  const configured = process.env.HANDBOOK_PDF_PAGE_COUNT;
  if (configured !== undefined && (
    !/^[1-9]\d*$/.test(configured) || Number(configured) !== pages
  )) {
    throw new Error(`HANDBOOK_PDF_PAGE_COUNT must match the linked PDF (${pages} pages)`);
  }
  return pages;
}
