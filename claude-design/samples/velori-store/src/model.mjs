export const STORAGE_KEY = 'claude-design.velori-store.configuration.v1';
export const DEFAULTS = Object.freeze({shell:'chalk',face:'friendly',color:'white',accessory:'dock'});
export const CHOICES = Object.freeze({shell:['chalk','pebble','graphite'],face:['friendly','simple'],color:['white','mint','blue','amber'],accessory:['dock','bag','none']});
export const LABELS = {chalk:'Chalk',pebble:'Pebble',graphite:'Graphite',friendly:'Friendly',simple:'Simple',white:'White',mint:'Mint',blue:'Blue',amber:'Amber',dock:'Dock',bag:'Carry bag',none:'None'};
export const COLORS = {white:'#f4f6f2',mint:'#78ebc8',blue:'#80c8ff',amber:'#ffcc70',chalk:'#e6e8e5',pebble:'#a7aaa9',graphite:'#434b50'};
export const DESCRIPTIONS = {dock:'A charging dock gives your robot a place to rest.',bag:'A padded carry bag keeps Velori protected on the move.',none:'Just Velori, ready to make itself at home.'};
export function normalize(value){return Object.fromEntries(Object.entries(CHOICES).map(([key,values])=>[key,values.includes(value?.[key])?value[key]:DEFAULTS[key]]));}
export function caption(c){return `${LABELS[c.shell]} shell · ${LABELS[c.face]} face · ${LABELS[c.color]} · ${LABELS[c.accessory]}`;}
export function readConfiguration(storage){try{return {configuration:normalize(JSON.parse(storage.getItem(STORAGE_KEY))),error:false};}catch{return {configuration:{...DEFAULTS},error:true};}}
export function saveConfiguration(storage,configuration){try{storage.setItem(STORAGE_KEY,JSON.stringify(normalize(configuration)));return true;}catch{return false;}}
export function resetConfiguration(storage){try{storage.removeItem(STORAGE_KEY);return true;}catch{return false;}}
export function productAssets(c){const bag=c.accessory==='bag';const file=bag&&c.shell!=='chalk'?`${c.shell}-bag-shell-v2.png`:`${c.shell}-${c.accessory}.png`;return {photo:`assets/velori/${bag?'chalk-bag.png':file}`,shell:bag&&c.shell!=='chalk'?`assets/velori/${file}`:null,robotMask:bag&&c.shell!=='chalk'?'assets/velori/bag-robot-mask.svg':null,faceMask:`assets/velori/face-${c.face}.png`};}
export function allConfigurations(){return CHOICES.shell.flatMap(shell=>CHOICES.face.flatMap(face=>CHOICES.color.flatMap(color=>CHOICES.accessory.map(accessory=>({shell,face,color,accessory})))));}
export const FIXTURES = Object.freeze({purpleContinue:'purple-continue',tightAccessories:'accessory-gap-8'});
