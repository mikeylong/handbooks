import { readRuntimeConfig } from "@/lib/config";

import { VercelBlobPrivateAssetStore } from "./blob";
import { LocalPrivateAssetStore } from "./local";
import type { PrivateAssetStore } from "./types";

let store: PrivateAssetStore | undefined;

export function getPrivateAssetStore(): PrivateAssetStore {
  if (store) return store;
  const config = readRuntimeConfig();
  store =
    config.APP_MODE === "production"
      ? new VercelBlobPrivateAssetStore(config)
      : new LocalPrivateAssetStore(config.LOCAL_HANDBOOK_PATH);
  return store;
}

export type { PrivateAsset, PrivateAssetStore } from "./types";
