import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PrivateAssetStore } from "./types";

export class LocalPrivateAssetStore implements PrivateAssetStore {
  constructor(private readonly filePath: string) {}

  async getHandbook() {
    const bytes = await readFile(
      path.join(process.cwd(), "private", path.basename(this.filePath)),
    );
    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return {
      body,
      contentType: "application/pdf",
      contentLength: bytes.byteLength,
      etag: null,
      filename: "production-ai-engineering.pdf",
    };
  }
}
