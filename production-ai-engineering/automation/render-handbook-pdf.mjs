#!/usr/bin/env node

import { lstat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    browser: { type: "string" },
    html: { type: "string" },
    output: { type: "string" },
    "playwright-module": { type: "string" },
  },
  strict: true,
});

for (const key of ["browser", "html", "output", "playwright-module"]) {
  if (!values[key]) throw new Error(`Missing --${key}`);
}

const browserPath = resolve(values.browser);
const htmlPath = resolve(values.html);
const outputPath = resolve(values.output);
const playwrightModule = resolve(values["playwright-module"], "index.mjs");

for (const [path, name] of [
  [browserPath, "browser"],
  [htmlPath, "handbook HTML"],
  [playwrightModule, "Playwright module"],
]) {
  const metadata = await lstat(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${name} must be a regular file`);
  }
}

const { chromium } = await import(pathToFileURL(playwrightModule).href);
let browser;

try {
  browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: [
      "--single-process",
      "--no-zygote",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-gpu",
      "--disable-sync",
      "--metrics-recording-only",
      "--no-first-run",
    ],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60_000);
  await page.emulateMedia({ media: "print" });
  await page.goto(pathToFileURL(htmlPath).href, {
    timeout: 120_000,
    waitUntil: "load",
  });
  await page.evaluate(async () => {
    const images = [...document.images];
    for (const image of images) image.loading = "eager";
    await Promise.all(
      images.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolveImage) => {
          image.addEventListener("load", resolveImage, { once: true });
          image.addEventListener("error", resolveImage, { once: true });
        });
      }),
    );
    await document.fonts.ready;
  });

  await page.pdf({
    path: outputPath,
    displayHeaderFooter: false,
    outline: true,
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
  });
} finally {
  await browser?.close();
}

const outputMetadata = await lstat(outputPath);
if (!outputMetadata.isFile() || outputMetadata.isSymbolicLink() || outputMetadata.size < 10_000) {
  throw new Error("Playwright did not produce a valid raw PDF");
}

console.log(JSON.stringify({ output: outputPath, size: outputMetadata.size }));
