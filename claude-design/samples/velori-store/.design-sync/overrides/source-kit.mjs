// MIT-owned adapter: delegate discovery unchanged; add the sample's runtime assets before native hashes.
import {resolvePackage as resolveNativePackage} from '../../.ds-sync/lib/source-kit.mjs';
import {copyRuntimeAssets} from '../package-assets.mjs';

export async function resolvePackage(ctx) {
 const nativeResult=await resolveNativePackage(ctx);
 copyRuntimeAssets({sourceRoot:ctx.PKG_DIR,out:ctx.OUT});
 return nativeResult;
}
