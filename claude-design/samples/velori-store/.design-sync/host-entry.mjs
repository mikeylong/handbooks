// Host adapter for the Claude Design bundle (design-sync cfg.entry). src/library.jsx is unchanged.
// The library builds photo URLs as new URL(import.meta.env.BASE_URL + 'assets/velori/<file>', document.baseURI).
// The converter compiles import.meta.env to a shared object with BASE_URL "/", which points at the host's origin
// root, not the project. Classic <script src=".../_ds_bundle.js"> loads (preview cards) expose that script's URL as
// document.currentScript.src, so the base becomes the folder _ds_bundle.js was served from: the project root, where
// assets/velori/ is uploaded. assetUrl reads BASE_URL at call time, so setting it here, after the library module
// has evaluated, applies to every image load. With no currentScript (inline or module load) the "/" default stays.
export * from '../src/library.jsx';
const script = typeof document !== 'undefined' ? document.currentScript : null;
if (script && script.src) import.meta.env.BASE_URL = new URL('./', script.src).href;
