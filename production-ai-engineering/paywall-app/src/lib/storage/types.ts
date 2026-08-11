export type PrivateAsset = {
  body: ArrayBuffer | ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | null;
  etag: string | null;
  filename: string;
};

export interface PrivateAssetStore {
  getHandbook(): Promise<PrivateAsset>;
}
