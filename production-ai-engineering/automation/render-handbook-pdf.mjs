#!/usr/bin/env node
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const toolkit=process.env.HANDBOOK_PUBLISHING_TOOLKIT || resolve(import.meta.dirname,'../../publish-evidence-backed-handbook');
await import(pathToFileURL(resolve(toolkit,'scripts/render-chromium-pdf.mjs')));
