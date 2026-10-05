import fs from 'node:fs';
import assert from 'node:assert/strict';
import {allConfigurations,productAssets} from '../src/model.mjs';
const assets=new Set(allConfigurations().flatMap(c=>Object.values(productAssets(c))).filter(Boolean));
for(const path of assets){assert.ok(fs.statSync(new URL(`../public/${path}`,import.meta.url)).size>0,`Missing ${path}`);}
console.log(`${assets.size} assets present for all 72 configurations.`);
