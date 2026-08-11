import { get } from "@vercel/blob";

import type { ProductionConfig } from "@/lib/config";

import type { PrivateAssetStore } from "./types";

export class VercelBlobPrivateAssetStore implements PrivateAssetStore {
  constructor(private readonly config: ProductionConfig) {}

  async getHandbook() {
    const result = await get(this.config.HANDBOOK_BLOB_URL, {
      access: "private",
      token: this.config.BLOB_READ_WRITE_TOKEN,
    });
    if (!result || result.statusCode !== 200) {
      throw new Error("The private handbook object could not be read.");
    }

    return {
      body: result.stream,
      contentType: result.blob.contentType || "application/pdf",
      contentLength: result.blob.size,
      etag: result.blob.etag,
      filename: "production-ai-engineering.pdf",
    };
  }
}
