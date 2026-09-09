import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = mkdtempSync(resolve(tmpdir(), "handbook-download-test-"));
const env = { ...process.env, HANDBOOK_CANDIDATE_DATE: "2026-09-07" };
delete env.HANDBOOK_PDF_PAGE_COUNT;
const pdfPath = resolve(fixture, "output/pdf/production-ai-engineering-v1.3.0-2026-09-08.pdf");
const htmlPath = resolve(fixture, "handbook/index.html");

// Real PDF page trees exercise Poppler rather than stubbing the page count.
function pdfWithPages(pages) {
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "",
    ...Array.from({ length: pages }, () => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> >>")];
  objects[1] = `<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, i) => `${i + 3} 0 R`).join(" ")}] >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  return pdf + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}
function run(script, extraEnv = {}) {
  return spawnSync(process.execPath, [resolve(fixture, "handbook", script)], {
    encoding: "utf8", env: { ...env, ...extraEnv },
  });
}
function passes(script, extraEnv) {
  const result = run(script, extraEnv);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
function fails(script, pattern, extraEnv) {
  const result = run(script, extraEnv);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr + result.stdout, pattern);
}
try {
  for (const path of ["handbook", "automation", "AI_ENGINEERING_FIELD_GUIDE.md"]) {
    cpSync(resolve(root, path), resolve(fixture, path), { recursive: true });
  }
  mkdirSync(dirname(pdfPath), { recursive: true });
  for (const pages of [1, 12, 1001]) {
    writeFileSync(pdfPath, pdfWithPages(pages));
    // A candidate map may be larger or smaller than the downloadable PDF.
    writeFileSync(resolve(fixture, "handbook/page-map.json"), JSON.stringify({ stale: pages === 1 ? 2000 : 2 }));
    passes("build-handbook.mjs");
    passes("validate-handbook.mjs");
    assert.equal(readFileSync(htmlPath, "utf8").split(`${pages} pages`).length - 1, 5);
    passes("validate-handbook.mjs", { HANDBOOK_PDF_PAGE_COUNT: String(pages) });
  }
  for (const value of ["76", "1001junk", "0", "-1", "1.5", ""]) {
    fails("build-handbook.mjs", /must match the linked PDF/, { HANDBOOK_PDF_PAGE_COUNT: value });
    fails("validate-handbook.mjs", /must match the linked PDF/, { HANDBOOK_PDF_PAGE_COUNT: value });
  }
  const validHtml = readFileSync(htmlPath, "utf8");
  writeFileSync(htmlPath, validHtml.replaceAll("1001 pages", "76 pages"));
  fails("validate-handbook.mjs", /pdfDownloadPageCountExact/);
  writeFileSync(htmlPath, validHtml.replaceAll('href="../output/pdf/', 'href="../wrong/pdf/'));
  fails("validate-handbook.mjs", /pdfDownloadLinks/);
  writeFileSync(htmlPath, validHtml);
  for (const content of ["not a PDF", pdfWithPages(0)]) {
    writeFileSync(pdfPath, content);
    fails("build-handbook.mjs", /Cannot inspect|no valid positive page count/);
    fails("validate-handbook.mjs", /Cannot inspect|no valid positive page count/);
  }
  rmSync(pdfPath);
  fails("build-handbook.mjs", /Cannot inspect the linked PDF/);
  fails("validate-handbook.mjs", /Cannot inspect the linked PDF/);
  cpSync(resolve(root, "output/pdf", pdfPath.split("/").at(-1)), pdfPath);
  passes("build-handbook.mjs");
  passes("validate-handbook.mjs");
  execFileSync(process.execPath, [resolve(root, "handbook/validate-handbook.mjs")], { stdio: "pipe" });
  console.log("Download count tests passed: real PDFs of 1, 12, and 1001 pages; stale maps; strict count assertions; incorrect labels and links; invalid, empty, and missing PDFs; published PDF.");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
