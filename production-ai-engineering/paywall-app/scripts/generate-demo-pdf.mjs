import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputPath = path.resolve(
  process.cwd(),
  process.env.LOCAL_HANDBOOK_PATH ?? "private/demo-handbook.pdf",
);

function createPdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    "<< /Length 121 >>\nstream\nBT\n/F1 18 Tf\n72 700 Td\n(Production AI Engineering) Tj\n0 -30 Td\n/F1 11 Tf\n(Local demo PDF - not the handbook) Tj\nET\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, "ascii");
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, createPdf());
console.log(`Local demo PDF ready: ${outputPath}`);
