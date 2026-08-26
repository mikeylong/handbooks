#!/usr/bin/env node

/**
 * Dependency-free handbook generator.
 *
 * The canonical content remains ../AI_ENGINEERING_FIELD_GUIDE.md. This script
 * converts that complete source into a semantic, offline-readable book page.
 */

import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CITATION_GROUPS,
  SECTION_SOURCES,
  citationByLabel,
  citationByUrl,
  citationEntries,
} from "./book-data.mjs";
import { INDEX_ENTRIES } from "./index-data.mjs";
import { renderFallbackFlowDiagram } from "./fallback-flow-diagram.mjs";
import { renderRagFlowDiagram } from "./rag-flow-diagram.mjs";
import {
  buildReleaseSchedule,
  releaseReviewLabel,
  releaseTimeZoneLabel,
} from "./release-schedule.mjs";
import { renderSystemFlowDiagram } from "./system-flow-diagram.mjs";
import { renderValidationFlowDiagram } from "./validation-flow-diagram.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = resolve(HERE, "../AI_ENGINEERING_FIELD_GUIDE.md");
const OUTPUT_PATH = resolve(HERE, "index.html");
const PAGE_MAP_PATH = resolve(HERE, "page-map.json");
const STYLE_PATH = resolve(HERE, "styles.css");
const APP_PATH = resolve(HERE, "app.js");
const CHANGELOG_PATH = resolve(HERE, "changelog.json");
const AUTOMATION_PATH = process.env.HANDBOOK_AUTOMATION_PATH
  ? resolve(process.env.HANDBOOK_AUTOMATION_PATH)
  : resolve(HERE, "../automation/automation.toml");
const RELEASE_POLICY_PATH = process.env.HANDBOOK_RELEASE_POLICY_PATH
  ? resolve(process.env.HANDBOOK_RELEASE_POLICY_PATH)
  : resolve(HERE, "../automation/release-policy.json");
const RELEASE_SCHEDULE_PATH = resolve(HERE, "release-schedule.json");

const BOOK_TITLE = "Production AI Engineering";
const BOOK_SUBTITLE = "A Handbook for Building Reliable LLM Systems";
const AUTHOR = "Michael Long";
const AUTHOR_SITE = "https://surfaces.systems";
const AUTHOR_CREDIT_HTML = `${AUTHOR}, <a href="${AUTHOR_SITE}">surfaces.systems</a>`;
const PUBLICATION_DATE = "August 24, 2026";
const formatCandidateDate = (isoDate) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new Error("HANDBOOK_CANDIDATE_DATE must use YYYY-MM-DD");
  }
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new Error("HANDBOOK_CANDIDATE_DATE must be a valid calendar date");
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};
const COVER_DATE = process.env.HANDBOOK_CANDIDATE_DATE
  ? formatCandidateDate(process.env.HANDBOOK_CANDIDATE_DATE)
  : PUBLICATION_DATE;
const formatBibliographyDate = (displayDate) => {
  const match = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(displayDate);
  if (!match) throw new Error(`Invalid bibliography access date: ${displayDate}`);
  return `${match[2]} ${match[1]} ${match[3]}`;
};
const BIBLIOGRAPHY_ACCESS_DATE = formatBibliographyDate(COVER_DATE);
const PDF_HREF = "../output/pdf/production-ai-engineering.pdf";
const PDF_PAGE_COUNT = 79;
const BOOK_VERSION = process.env.HANDBOOK_VERSION
  ?? `Version 1.1${process.env.HANDBOOK_VERSION_SUFFIX ?? ""}`;
const UNCHANGED_CHANGELOG_SUMMARY = "The handbook's reader-facing content is unchanged.";

const HANDBOOK_CHAPTERS = [
  {
    title: "Build the System Around the Model",
    sourceSections: [1, 2],
    deck: "A production AI system succeeds when the full workflow delivers the right outcome, follows policy, and stays inside its latency and cost targets.",
  },
  {
    title: "Treat Context as a Budget",
    sourceSections: [3, 4],
    deck: "Context is finite. Choose the smallest set of instructions, state, evidence, and tools the model needs for the current step.",
  },
  {
    title: "Prefill and Decode Are Different Jobs",
    sourceSections: [5, 6, 7],
    deck: "Prefill and decode use the hardware differently. The serving plan has to account for both.",
  },
  {
    title: "Choose the Optimization That Fits",
    sourceSections: [8, 9],
    deck: "Speculative decoding, quantization, and distillation solve different problems. Pick the one that matches the bottleneck and verify the quality tradeoff.",
  },
  {
    title: "Turn Model Output into a Contract",
    sourceSections: [10, 11],
    deck: "Schemas make output parseable. Authorization, validation, idempotency, and effect checks make it safe to use.",
  },
  {
    title: "Put Clear Limits on Agents",
    sourceSections: [12, 13],
    deck: "Agents need limits you can enforce: budgets, stop conditions, compatible fallbacks, and explicit terminal states.",
  },
  {
    title: "Keep Retrieval Grounded",
    sourceSections: [14, 15],
    deck: "Retrieval is useful only when the evidence is authorized, current, attributable, and relevant to the claim.",
  },
  {
    title: "Make Evals the Release Gate",
    sourceSections: [16],
    deck: "Golden sets, adversarial tests, calibrated judges, and human review determine whether a release can ship.",
  },
  {
    title: "Trace the Whole User Journey",
    sourceSections: [17, 18],
    deck: "A complete trace should explain what happened, what it cost, where it slowed down, and whether the user got the intended result.",
  },
  {
    title: "Build Safety into the Architecture",
    sourceSections: [19, 20],
    deck: "Prompt injection and tenant isolation are system problems. Permissions and data boundaries must hold even when the model is wrong.",
  },
  {
    title: "Choose What to Change",
    sourceSections: [21, 22],
    deck: "Measure the constraint first. Change the part of the system that causes it, then verify what happened to quality, latency, cost, and reliability.",
  },
  {
    title: "Design for Production Failure",
    sourceSections: [23, 24, 25],
    deck: "Production systems fail in predictable ways. The final chapter turns those patterns into checks, operating decisions, and a practical learning order.",
  },
];

const CHAPTER_IMAGE_WIDTH = 1536;
const CHAPTER_IMAGE_HEIGHTS = [1364, 1364, 1364, 1364, 1368, 1368, 1368, 1368, 1364, 1364, 1364, 1364];

const CODE_LANGUAGES = new Set([
  "bash",
  "c",
  "cpp",
  "csharp",
  "css",
  "go",
  "html",
  "java",
  "javascript",
  "json",
  "jsx",
  "python",
  "rust",
  "shell",
  "sql",
  "toml",
  "tsx",
  "typescript",
  "xml",
  "yaml",
]);

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function highlightJson(source) {
  JSON.parse(source);
  const tokenPattern = /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false)\b|\bnull\b|[{}\[\],:]/g;
  let html = "";
  let cursor = 0;

  for (const match of source.matchAll(tokenPattern)) {
    const token = match[0];
    html += escapeHtml(source.slice(cursor, match.index));
    let className = "syntax-punctuation";
    if (match[1]) className = "syntax-key";
    else if (match[2]) className = "syntax-string";
    else if (/^(?:true|false)$/.test(token)) className = "syntax-boolean";
    else if (token === "null") className = "syntax-null";
    else if (/^-?\d/.test(token)) className = "syntax-number";
    html += `<span class="${className}">${escapeHtml(token)}</span>`;
    cursor = match.index + token.length;
  }

  return html + escapeHtml(source.slice(cursor));
}

const slugify = (value) => value
  .toLowerCase()
  .replace(/[’']/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || "section";

function referenceId(label) {
  return `ref-${label.toLowerCase()}`;
}

function inlineMarkdown(value, { citations = true } = {}) {
  const tokens = [];
  const tokenized = value.replace(/`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, code, label, href) => {
    let token;
    if (code !== undefined) {
      token = `<code>${escapeHtml(code)}</code>`;
    } else {
      const entry = citationByUrl.get(href);
      const marker = citations && entry
        ? `<sup class="citation-marker"><a href="#${referenceId(entry.label)}" aria-label="Citation ${escapeHtml(entry.label)}">[${escapeHtml(entry.label)}]</a></sup>`
        : "";
      token = `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>${marker}`;
    }
    tokens.push(token);
    return `\u0000${tokens.length - 1}\u0000`;
  });

  let html = escapeHtml(tokenized)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  html = html.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
  return html;
}

function isTableDivider(line) {
  return /^\|(?:\s*:?-{3,}:?\s*\|)+$/.test(line.trim());
}

function splitTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function renderKeyValueExample(lines) {
  const rows = lines.filter((line) => line.trim()).map((line) => {
    const [term, ...definitionParts] = line.trim().split(/\s{2,}/);
    if (!term || !definitionParts.length) {
      throw new Error(`Key-value example row needs two columns: ${line}`);
    }
    return `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(definitionParts.join(" "))}</dd></div>`;
  });
  if (!rows.length) throw new Error("Key-value example cannot be empty");
  return `<dl class="editorial-example key-value-example" aria-label="Practical context budget">${rows.join("")}</dl>`;
}

function renderCacheKeyComposition(lines) {
  const groups = lines.filter((line) => line.trim()).map((line) => {
    const separator = line.indexOf("|");
    if (separator < 1) {
      throw new Error(`Cache-key group needs a label and terms: ${line}`);
    }
    const label = line.slice(0, separator).trim();
    const terms = line.slice(separator + 1).split("+").map((term) => term.trim()).filter(Boolean);
    if (!label || !terms.length) {
      throw new Error(`Cache-key group needs a label and terms: ${line}`);
    }
    const termHtml = terms
      .map((term) => `<span class="cache-key-term">${escapeHtml(term)}</span>`)
      .join("");
    return `<div><dt>${escapeHtml(label)}</dt><dd>${termHtml}</dd></div>`;
  });
  if (!groups.length) throw new Error("Cache-key composition cannot be empty");
  return `<dl class="editorial-example cache-key-composition" aria-label="Application cache-key composition">${groups.join("")}</dl>`;
}

function renderLatencyBudget(lines) {
  const content = lines.filter((line) => line.trim());
  const total = content.shift()?.trim();
  if (!total || !content.length) throw new Error("Latency budget needs a total and stage groups");
  const groups = content.map((line) => {
    const separator = line.indexOf("|");
    if (separator < 1) throw new Error(`Latency group needs a label and stages: ${line}`);
    const label = line.slice(0, separator).trim();
    const stages = line.slice(separator + 1).split("+").map((stage) => stage.trim()).filter(Boolean);
    if (!label || !stages.length) throw new Error(`Latency group needs a label and stages: ${line}`);
    const stageHtml = stages
      .map((stage) => `<span class="latency-stage">${escapeHtml(stage)}</span>`)
      .join("");
    return `<div class="latency-band"><p>${escapeHtml(label)}</p><div>${stageHtml}</div></div>`;
  });
  return `<figure class="editorial-example latency-budget" aria-label="${escapeHtml(total)} composition"><div class="latency-total"><strong>${escapeHtml(total)}</strong><span>= sum of</span></div>${groups.join("")}</figure>`;
}

function renderKvFootprint(lines) {
  const content = lines.filter((line) => line.trim());
  const total = content.shift()?.trim();
  if (!total || !content.length) throw new Error("KV footprint needs a total and factors");
  const factors = content.map((line) => {
    const [value, note] = line.split("|").map((part) => part.trim());
    if (!value) throw new Error(`KV factor cannot be empty: ${line}`);
    return `<span class="kv-factor"><strong>${escapeHtml(value)}</strong>${note ? `<small>${escapeHtml(note)}</small>` : ""}</span>`;
  });
  if (factors.length !== 6) throw new Error("KV footprint needs exactly six factors");
  return `<figure class="editorial-example kv-footprint" aria-label="${escapeHtml(total)} approximation"><div class="kv-total"><strong>${escapeHtml(total)}</strong><span>approximately the product of</span></div><div class="kv-factors">${factors.join("")}</div></figure>`;
}

function renderGoldenRecord(lines) {
  const rows = lines.filter((line) => line.trim()).map((line) => {
    const separator = line.indexOf("|");
    if (separator < 1) throw new Error(`Golden-record row needs a label and fields: ${line}`);
    const label = line.slice(0, separator).trim();
    const fields = line.slice(separator + 1).split("+").map((field) => field.trim()).filter(Boolean);
    if (!label || !fields.length) throw new Error(`Golden-record row needs a label and fields: ${line}`);
    const fieldHtml = fields.map((field) => `<span>${escapeHtml(field)}</span>`).join("");
    return `<div><dt>${escapeHtml(label)}</dt><dd>${fieldHtml}</dd></div>`;
  });
  if (rows.length !== 4) throw new Error("Golden record needs exactly four field groups");
  return `<dl class="editorial-example golden-record" aria-label="Golden evaluation record fields">${rows.join("")}</dl>`;
}

function renderTraceTree(lines) {
  const roots = [];
  const stack = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    const node = { label: line.trim(), children: [] };
    while (stack.length && indent <= stack.at(-1).indent) stack.pop();
    if (stack.length) stack.at(-1).node.children.push(node);
    else roots.push(node);
    stack.push({ indent, node });
  }
  if (roots.length !== 1) throw new Error("Trace tree needs exactly one root span");
  const renderNodes = (nodes) => `<ul>${nodes.map((node) => `<li><span>${escapeHtml(node.label)}</span>${node.children.length ? renderNodes(node.children) : ""}</li>`).join("")}</ul>`;
  return `<figure class="editorial-example trace-tree" aria-label="Recommended trace span hierarchy">${renderNodes(roots)}</figure>`;
}

function renderCostModel(lines) {
  const content = lines.filter((line) => line.trim());
  const total = content.shift()?.trim();
  if (!total || !content.length) throw new Error("Cost model needs a total and components");
  let note = "";
  const groups = [];
  for (const line of content) {
    const separator = line.indexOf("|");
    if (separator < 1) throw new Error(`Cost-model row needs a label and value: ${line}`);
    const label = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!label || !value) throw new Error(`Cost-model row needs a label and value: ${line}`);
    if (label.toLowerCase() === "note") {
      note = value;
      continue;
    }
    const terms = value.split("+").map((term) => term.trim()).filter(Boolean);
    const termHtml = terms.map((term) => {
      const alternatives = term.split(/\s+OR\s+/i).map((part) => part.trim()).filter(Boolean);
      if (alternatives.length === 1) return `<span>${escapeHtml(term)}</span>`;
      if (alternatives.length !== 2) throw new Error(`Cost alternative needs exactly two choices: ${term}`);
      return `<span class="cost-alternative"><span>${escapeHtml(alternatives[0])}</span><em>or</em><span>${escapeHtml(alternatives[1])}</span></span>`;
    }).join("");
    groups.push(`<div><dt>${escapeHtml(label)}</dt><dd>${termHtml}</dd></div>`);
  }
  if (groups.length !== 4 || !note) throw new Error("Cost model needs four component groups and a note");
  return `<figure class="editorial-example cost-model" aria-label="${escapeHtml(total)} composition"><div class="cost-total"><strong>${escapeHtml(total)}</strong><span>= sum of</span></div><dl>${groups.join("")}</dl><p>${escapeHtml(note)}</p></figure>`;
}

function renderNestedOrderedOutline(lines, startIndex) {
  const itemPattern = /^(\s*)\d+\.\s+(.+)$/;
  const indentWidth = (value) => value.replaceAll("\t", "    ").length;

  const parseLevel = (cursor, indent) => {
    const items = [];

    while (cursor < lines.length) {
      const match = lines[cursor].match(itemPattern);
      if (!match) break;

      const currentIndent = indentWidth(match[1]);
      if (currentIndent < indent) break;
      if (currentIndent > indent) {
        if (!items.length) throw new Error("Nested outline item has no parent");
        const nested = parseLevel(cursor, currentIndent);
        items.at(-1).children.push(nested.items);
        cursor = nested.index;
        continue;
      }

      items.push({ text: match[2], children: [] });
      cursor += 1;
    }

    return { items, index: cursor };
  };

  const first = lines[startIndex].match(itemPattern);
  if (!first) throw new Error("Nested outline must begin with an ordered item");
  const parsed = parseLevel(startIndex, indentWidth(first[1]));
  if (!parsed.items.every((item) => item.children.length === 1)) {
    throw new Error("Each top-level outline item must contain one numbered sublist");
  }

  const renderItems = (items, isRoot = false) => `<ol${isRoot ? ' class="outline-list"' : ""}>${items.map((item) => `<li><span class="outline-entry">${inlineMarkdown(item.text)}</span>${item.children.map((children) => renderItems(children)).join("")}</li>`).join("")}</ol>`;
  return { html: renderItems(parsed.items, true), index: parsed.index };
}

function isBlockStart(lines, index) {
  const line = lines[index] ?? "";
  const next = lines[index + 1] ?? "";
  return line.trim() === ""
    || /^```/.test(line)
    || /^#{3,6}\s/.test(line)
    || /^>\s?/.test(line)
    || /^[-*]\s+/.test(line)
    || /^\d+\.\s+/.test(line)
    || (/^\|.*\|$/.test(line.trim()) && isTableDivider(next));
}

let tableSequence = 0;

function renderBlocks(lines, chapterSlug = "front-matter", headingOffset = 0, sectionTitle = "Handbook") {
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```([^\s]*)\s*$/);
    if (fence) {
      const language = (fence[1] || "text").toLowerCase();
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      if (language === "mermaid") {
        const source = code.join("\n");
        if (/^flowchart\s+LR\s*$/m.test(source)) {
          output.push(renderSystemFlowDiagram(source));
          continue;
        }
        if (/^flowchart\s+TD\s*$/m.test(source)) {
          output.push(renderValidationFlowDiagram(source));
          continue;
        }
        throw new Error("Unsupported Mermaid diagram direction");
      }
      if (language === "key-value") {
        output.push(renderKeyValueExample(code));
        continue;
      }
      if (language === "cache-key") {
        output.push(renderCacheKeyComposition(code));
        continue;
      }
      if (language === "latency-budget") {
        output.push(renderLatencyBudget(code));
        continue;
      }
      if (language === "kv-footprint") {
        output.push(renderKvFootprint(code));
        continue;
      }
      if (language === "fallback-flow") {
        output.push(renderFallbackFlowDiagram(code));
        continue;
      }
      if (language === "rag-flow") {
        output.push(renderRagFlowDiagram(code));
        continue;
      }
      if (language === "golden-record") {
        output.push(renderGoldenRecord(code));
        continue;
      }
      if (language === "trace-tree") {
        output.push(renderTraceTree(code));
        continue;
      }
      if (language === "cost-model") {
        output.push(renderCostModel(code));
        continue;
      }
      if (!CODE_LANGUAGES.has(language)) {
        throw new Error(`Unsupported fenced block language: ${language}`);
      }
      const source = code.join("\n");
      const renderedSource = language === "json" ? highlightJson(source) : escapeHtml(source);
      output.push(`<div class="code-frame"><pre tabindex="0"><code class="language-${escapeHtml(language)}">${renderedSource}</code></pre></div>`);
      continue;
    }

    if (/^\|.*\|$/.test(line.trim()) && isTableDivider(lines[index + 1] ?? "")) {
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && /^\|.*\|$/.test(lines[index].trim())) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      const headerHtml = headers.map((cell) => `<th scope="col">${inlineMarkdown(cell)}</th>`).join("");
      const bodyHtml = rows.map((row) => `<tr>${row.map((cell, cellIndex) => `<td data-label="${escapeHtml(headers[cellIndex] ?? "")}">${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("");
      const tableNumber = ++tableSequence;
      const scrollHintId = `table-scroll-hint-${tableNumber}`;
      const tableLabelId = `table-label-${tableNumber}`;
      const tableLabel = `${sectionTitle}: ${headers[0] ?? "comparison"} table`;
      output.push(`<div class="table-scroll" role="region" aria-label="${escapeHtml(tableLabel)}" aria-describedby="${scrollHintId}" tabindex="0"><p class="table-scroll-hint" id="${scrollHintId}">Scroll table horizontally <span aria-hidden="true">→</span></p><table><caption class="sr-only" id="${tableLabelId}">${escapeHtml(tableLabel)}</caption><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      output.push(`<blockquote><p>${inlineMarkdown(quote.join(" "))}</p></blockquote>`);
      continue;
    }

    const heading = line.match(/^(#{3,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(6, heading[1].length + headingOffset);
      const title = heading[2];
      output.push(`<h${level} id="${chapterSlug}-${slugify(title)}">${inlineMarkdown(title)}</h${level}>`);
      index += 1;
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      if (ordered && /^\s+\d+\.\s+/.test(lines[index + 1] ?? "")) {
        const outline = renderNestedOrderedOutline(lines, index);
        output.push(outline.html);
        index = outline.index;
        continue;
      }
      const isOrdered = Boolean(ordered);
      const matcher = isOrdered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;
      const items = [];
      let checklist = false;
      while (index < lines.length) {
        const match = lines[index].match(matcher);
        if (!match) break;
        let item = match[1];
        const check = item.match(/^\[([ xX])\]\s+(.+)$/);
        if (check) {
          checklist = true;
          item = `<span class="checklist-box" aria-hidden="true"${check[1].toLowerCase() === "x" ? ' data-checked="true"' : ""}></span><span>${inlineMarkdown(check[2])}</span>`;
        } else {
          item = inlineMarkdown(item);
        }
        items.push(`<li>${item}</li>`);
        index += 1;
      }
      const tag = isOrdered ? "ol" : "ul";
      output.push(`<${tag}${checklist ? ' class="checklist"' : ""}>${items.join("")}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    output.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return output.join("\n");
}

const [
  source,
  styleSource,
  appSource,
  automationSource,
  releasePolicySource,
  changelogSource,
] = await Promise.all([
  readFile(SOURCE_PATH, "utf8"),
  readFile(STYLE_PATH, "utf8"),
  readFile(APP_PATH, "utf8"),
  readFile(AUTOMATION_PATH, "utf8"),
  readFile(RELEASE_POLICY_PATH, "utf8"),
  readFile(CHANGELOG_PATH, "utf8"),
]);
const changelog = JSON.parse(changelogSource);
const changelogRequired = changelog.summary?.trim() !== UNCHANGED_CHANGELOG_SUMMARY;
if (
  changelog.schemaVersion !== 1
  || typeof changelog.entryDate !== "string"
  || typeof changelog.previousVersion !== "string"
  || typeof changelog.previousPublicationDate !== "string"
  || !/^[a-f0-9]{64}$/.test(changelog.previousPdfSha256 ?? "")
  || !/^[a-f0-9]{64}$/.test(changelog.currentSourceSha256 ?? "")
  || typeof changelog.summary !== "string"
  || !Array.isArray(changelog.items)
  || changelog.items.length > 8
  || (changelogRequired && changelog.items.length < 1)
  || (!changelogRequired && changelog.items.length !== 0)
  || changelog.items.some(({ category, text }) => (
    typeof category !== "string"
    || !category.trim()
    || typeof text !== "string"
    || !text.trim()
  ))
) {
  throw new Error("handbook/changelog.json does not match the required schema");
}
let pageMap = {};
try {
  pageMap = JSON.parse(await readFile(PAGE_MAP_PATH, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const sourceHash = createHash("sha256").update(source).digest("hex");
if (changelog.currentSourceSha256 !== sourceHash) {
  throw new Error("handbook/changelog.json does not match the current handbook source");
}
const assetVersion = createHash("sha256").update(styleSource).update(appSource).digest("hex").slice(0, 12);
const buildNow = process.env.HANDBOOK_BUILD_NOW
  ? new Date(process.env.HANDBOOK_BUILD_NOW)
  : new Date();
const releaseSchedule = buildReleaseSchedule(automationSource, releasePolicySource, buildNow);
const nextReviewAt = new Date(releaseSchedule.nextReviewAt);
const nextReviewLabel = releaseReviewLabel(nextReviewAt, releaseSchedule.timeZone);
const releaseZoneLabel = releaseTimeZoneLabel(releaseSchedule.timeZone);
const lines = source.replaceAll("\r\n", "\n").split("\n");
const sourceTitle = lines.find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, "") ?? "Production AI Engineering Field Guide";
const evidenceDate = source.match(/Last evidence review:\s*\*\*([^*]+)\*\*/)?.[1] ?? "Unspecified";

const chapterStarts = lines
  .map((line, index) => ({ line, index }))
  .filter(({ line }) => /^##\s+/.test(line));

const firstChapterLine = chapterStarts[0]?.index ?? lines.length;
const frontMatterLines = lines.slice(1, firstChapterLine).filter((line) => !/^Last evidence review:/.test(line));
const sourceSections = chapterStarts.map(({ line, index }, chapterIndex) => {
  const nextIndex = chapterStarts[chapterIndex + 1]?.index ?? lines.length;
  const exactTitle = line.replace(/^##\s+/, "");
  const match = exactTitle.match(/^(\d+)\.\s+(.+)$/);
  const number = match?.[1] ?? String(chapterIndex + 1);
  const title = match?.[2] ?? exactTitle;
  return {
    number,
    title,
    exactTitle,
    slug: `section-${String(number).padStart(2, "0")}-${slugify(title)}`,
    lines: lines.slice(index + 1, nextIndex),
  };
});

const chapters = HANDBOOK_CHAPTERS.map((chapter, chapterIndex) => ({
  number: String(chapterIndex + 1),
  title: chapter.title,
  deck: chapter.deck,
  slug: `chapter-${String(chapterIndex + 1).padStart(2, "0")}-${slugify(chapter.title)}`,
  sections: chapter.sourceSections.map((sourceNumber, sectionIndex) => {
    const section = sourceSections.find(({ number }) => Number(number) === sourceNumber);
    if (!section) throw new Error(`Missing source section ${sourceNumber}`);
    return {
      ...section,
      displayNumber: `${chapterIndex + 1}.${sectionIndex + 1}`,
    };
  }),
}));

const mappedSectionNumbers = chapters.flatMap((chapter) => chapter.sections.map(({ number }) => Number(number)));
const appendixSectionNumber = 26;
const coveredSectionNumbers = [...mappedSectionNumbers, appendixSectionNumber];
if (coveredSectionNumbers.length !== sourceSections.length || new Set(coveredSectionNumbers).size !== sourceSections.length) {
  throw new Error("Handbook chapters and appendix must cover each source section exactly once");
}

const tocLinks = chapters.map((chapter) => `
  <li>
    <a href="#${chapter.slug}">
      <span class="toc-number">${String(chapter.number).padStart(2, "0")}</span>
      <span class="toc-title">${escapeHtml(chapter.title)}</span>
      <span class="toc-page" aria-label="Page ${escapeHtml(pageMap[chapter.slug] ?? "000")}">${escapeHtml(pageMap[chapter.slug] ?? "000")}</span>
    </a>
  </li>`).join("");

const changelogTocLink = changelogRequired
  ? `
  <li class="pdf-only">
    <a href="#changelog">
      <span class="toc-number">C</span>
      <span class="toc-title">Changelog</span>
      <span class="toc-page" aria-label="Page ${escapeHtml(pageMap.changelog ?? "000")}">${escapeHtml(pageMap.changelog ?? "000")}</span>
    </a>
  </li>`
  : "";

const backMatterTocLinks = `
  <li>
    <a href="#appendix-citations">
      <span class="toc-number">A</span>
      <span class="toc-title">Notes and Sources</span>
      <span class="toc-page" aria-label="Page ${escapeHtml(pageMap["appendix-citations"] ?? "000")}">${escapeHtml(pageMap["appendix-citations"] ?? "000")}</span>
    </a>
  </li>
  <li>
    <a href="#term-index">
      <span class="toc-number">I</span>
      <span class="toc-title">Index of Terms</span>
      <span class="toc-page" aria-label="Page ${escapeHtml(pageMap["term-index"] ?? "000")}">${escapeHtml(pageMap["term-index"] ?? "000")}</span>
    </a>
  </li>${changelogTocLink}`;

function sectionSourcesHtml(sectionNumber) {
  const source = SECTION_SOURCES[Number(sectionNumber)];
  if (!source) throw new Error(`Missing source map for section ${sectionNumber}`);
  const links = source.labels.map((label) => {
    if (!citationByLabel.has(label)) throw new Error(`Unknown citation label ${label}`);
    return `<a href="#${referenceId(label)}">[${escapeHtml(label)}]</a>`;
  }).join(" ");
  const note = source.note ? `<span>${escapeHtml(source.note)}</span>` : "";
  return `<p class="section-sources"><strong>Sources</strong> ${links}${note}</p>`;
}

const chapterHtml = chapters.map((chapter, chapterIndex) => {
  const previous = chapters[chapterIndex - 1];
  const next = chapters[chapterIndex + 1];
  const chapterLabel = `Chapter ${String(chapter.number).padStart(2, "0")}`;
  const body = chapter.sections.map((section) => `
      <section class="source-section" id="${section.slug}">
        <h3><span class="section-number">${escapeHtml(section.displayNumber)}&nbsp;</span><span class="section-title">${escapeHtml(section.title)}</span></h3>
        ${renderBlocks(section.lines, section.slug, 1, section.title)}
        ${sectionSourcesHtml(section.number)}
      </section>`).join("\n");
  const navigation = `
    <nav class="chapter-navigation" aria-label="Chapter navigation">
      ${previous ? `<a class="chapter-previous" href="#${previous.slug}"><span>Previous</span>${escapeHtml(previous.title)}</a>` : `<a class="chapter-previous" href="#contents"><span>Previous</span>Contents</a>`}
      ${next ? `<a class="chapter-next" href="#${next.slug}"><span>Next</span>${escapeHtml(next.title)}</a>` : `<a class="chapter-next" href="#book-top"><span>Return</span>Back to top</a>`}
    </nav>`;

  return `
  <section class="chapter" data-chapter="${escapeHtml(chapter.number)}">
    <header class="chapter-header" id="${chapter.slug}">
      <p class="chapter-kicker">${chapterLabel}</p>
      <h2>${escapeHtml(chapter.title)}</h2>
      <p class="chapter-deck">${escapeHtml(chapter.deck)}</p>
      <figure class="chapter-figure">
        <picture>
          <source
            media="(max-width: 42rem)"
            srcset="assets/chapters/chapter-${String(chapter.number).padStart(2, "0")}-768.webp 768w, assets/chapters/chapter-${String(chapter.number).padStart(2, "0")}.webp 1536w"
            sizes="calc(100vw - 2.25rem)"
          >
          <img
            class="chapter-art"
            src="assets/chapters/chapter-${String(chapter.number).padStart(2, "0")}.webp"
            alt=""
            width="${CHAPTER_IMAGE_WIDTH}"
            height="${CHAPTER_IMAGE_HEIGHTS[chapterIndex]}"
            loading="lazy"
            decoding="async"
          >
        </picture>
      </figure>
    </header>
    <div class="chapter-body">
      ${body}
    </div>
    ${navigation}
  </section>`;
}).join("\n");

const sectionByNumber = new Map(
  chapters.flatMap((chapter) => chapter.sections.map((section) => [Number(section.number), section])),
);

function displayUrl(value) {
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, "");
  const path = `${url.pathname.replace(/\/$/, "")}${url.hash}`;
  const full = `${host}${path}`;
  return full.length > 72 ? `${full.slice(0, 69)}...` : full;
}

function sectionsUsingCitation(label) {
  return Object.entries(SECTION_SOURCES)
    .filter(([, source]) => source.labels.includes(label))
    .map(([sectionNumber]) => Number(sectionNumber));
}

const sourceMapHtml = [...sectionByNumber.values()]
  .map((section) => {
    const source = SECTION_SOURCES[Number(section.number)];
    const references = source.labels
      .map((label) => `<a href="#${referenceId(label)}">[${escapeHtml(label)}]</a>`)
      .join(" ");
    const note = source.note ? `<span>${escapeHtml(source.note)}</span>` : "";
    return `
      <li>
        <a class="source-map-section" href="#${section.slug}"><strong>§${escapeHtml(section.displayNumber)}</strong> ${escapeHtml(section.title)}</a>
        <span class="source-map-references">${references}</span>
        ${note}
      </li>`;
  }).join("");

const bibliographyHtml = CITATION_GROUPS.map((group) => `
  <section class="reference-group" aria-labelledby="references-${slugify(group.title)}">
    <h3 id="references-${slugify(group.title)}">${escapeHtml(group.title)}</h3>
    <ol class="reference-list">
      ${group.entries.map((entry) => {
        const usedIn = sectionsUsingCitation(entry.label)
          .map((sectionNumber) => {
            const section = sectionByNumber.get(sectionNumber);
            return `<a href="#${section.slug}">§${escapeHtml(section.displayNumber)}</a>`;
          })
          .join(", ");
        const accessed = entry.accessed ? ` Accessed ${BIBLIOGRAPHY_ACCESS_DATE}.` : "";
        return `
        <li id="${referenceId(entry.label)}">
          <span class="reference-label">[${escapeHtml(entry.label)}]</span>
          <div>
            <p>${escapeHtml(entry.citation)}${accessed}</p>
            <p class="reference-meta"><a href="${escapeHtml(entry.url)}">${escapeHtml(displayUrl(entry.url))}</a><span>Cited in ${usedIn}</span></p>
          </div>
        </li>`;
      }).join("")}
    </ol>
  </section>`).join("");

const appendixHtml = `
  <section class="back-matter citations-appendix" id="appendix-citations" aria-labelledby="appendix-citations-title">
    <header class="back-matter-header">
      <p class="section-label">Appendix A</p>
      <h2 id="appendix-citations-title">Notes and Sources</h2>
      <p>This handbook grew out of my <cite>${escapeHtml(sourceTitle)}</cite>, which provides the structure. The research papers, standards, security guidance, and product documentation below support the technical claims.</p>
      <p>Notes marked <em>author synthesis</em> show where I combined sources or made a practical recommendation. Citation labels in the chapters link to the full entries here.</p>
    </header>
    <section class="source-map" aria-labelledby="source-map-title">
      <h3 id="source-map-title">Section source map</h3>
      <ol>${sourceMapHtml}</ol>
    </section>
    <div class="bibliography">${bibliographyHtml}</div>
  </section>`;

const indexIds = new Set(INDEX_ENTRIES.map(({ id }) => id));
if (indexIds.size !== INDEX_ENTRIES.length) throw new Error("Index entry IDs must be unique");
for (const entry of INDEX_ENTRIES) {
  const linkedIds = [...(entry.seeAlso ?? []), ...(entry.see ? [entry.see] : [])];
  for (const id of linkedIds) {
    if (!indexIds.has(id)) throw new Error(`Index entry ${entry.id} links to missing entry ${id}`);
  }
  for (const sectionNumber of entry.sections ?? []) {
    if (!sectionByNumber.has(sectionNumber) || sectionNumber >= appendixSectionNumber) {
      throw new Error(`Index entry ${entry.id} links to missing section ${sectionNumber}`);
    }
  }
}

function indexEntryHtml(entry) {
  if (entry.see) {
    const target = INDEX_ENTRIES.find(({ id }) => id === entry.see);
    return `<li id="index-${entry.id}"><span class="index-term">${escapeHtml(entry.label)}</span><span class="index-see">See <a href="#index-${target.id}">${escapeHtml(target.label)}</a></span></li>`;
  }

  const seenPages = new Set();
  const pages = (entry.sections ?? []).map((sectionNumber) => {
    const section = sectionByNumber.get(sectionNumber);
    const page = String(pageMap[section.slug] ?? "000");
    if (seenPages.has(page) && page !== "000") return "";
    seenPages.add(page);
    return `<a href="#${section.slug}" aria-label="${escapeHtml(entry.label)}, section ${escapeHtml(section.displayNumber)}, page ${escapeHtml(page)}">${escapeHtml(page)}</a>`;
  }).filter(Boolean).join(", ");
  const seeAlso = entry.seeAlso?.length
    ? `<span class="index-see">See also ${entry.seeAlso.map((id) => {
      const target = INDEX_ENTRIES.find((candidate) => candidate.id === id);
      return `<a href="#index-${target.id}">${escapeHtml(target.label)}</a>`;
    }).join("; ")}</span>`
    : "";
  return `<li id="index-${entry.id}"><span class="index-term">${escapeHtml(entry.label)}</span><span class="index-pages">${pages}</span>${seeAlso}</li>`;
}

const indexGroups = new Map();
for (const entry of INDEX_ENTRIES) {
  const letter = entry.label[0].toUpperCase();
  if (!indexGroups.has(letter)) indexGroups.set(letter, []);
  indexGroups.get(letter).push(entry);
}

const indexHtml = `
  <section class="back-matter term-index" id="term-index" aria-labelledby="term-index-title">
    <header class="back-matter-header">
      <p class="section-label">Index</p>
      <h2 id="term-index-title">Index of Terms</h2>
      <p>Each page reference points to the first page of the most relevant section. Cross-references connect related terms.</p>
    </header>
    <div class="index-columns">
      ${[...indexGroups.entries()].map(([letter, entries]) => `
        <section class="index-group" aria-labelledby="index-letter-${letter.toLowerCase()}">
          <h3 id="index-letter-${letter.toLowerCase()}">${letter}</h3>
          <ul>${entries.map(indexEntryHtml).join("")}</ul>
        </section>`).join("")}
    </div>
  </section>`;

const changelogHtml = changelogRequired ? `
  <section class="back-matter changelog pdf-only" id="changelog" aria-labelledby="changelog-title">
    <header class="back-matter-header changelog-header">
      <p class="section-label">Version history</p>
      <h2 id="changelog-title">Changelog</h2>
      <p class="changelog-version">${escapeHtml(BOOK_VERSION)} - ${escapeHtml(changelog.entryDate)}</p>
      <p>Compared with ${escapeHtml(changelog.previousVersion)}, published ${escapeHtml(changelog.previousPublicationDate)}.</p>
      <p>${escapeHtml(changelog.summary)}</p>
    </header>
    <dl class="changelog-list">
      ${changelog.items.map(({ category, text }) => `
        <div>
          <dt>${escapeHtml(category)}</dt>
          <dd>${escapeHtml(text)}</dd>
        </div>`).join("")}
    </dl>
    <p class="changelog-baseline">Previous PDF SHA-256: <code>${escapeHtml(changelog.previousPdfSha256)}</code></p>
  </section>` : "";

const html = `<!doctype html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="A practical handbook for building reliable production AI systems.">
  <meta name="author" content="${AUTHOR}">
  <meta name="theme-color" content="#ffffff">
  <meta name="color-scheme" content="light">
  <title>${BOOK_TITLE} · ${AUTHOR}</title>
  <link rel="icon" type="image/png" href="assets/favicon.png">
  <link rel="stylesheet" href="styles.css?v=${assetVersion}">
  <script src="app.js?v=${assetVersion}" defer></script>
</head>
<body id="book-top" data-source-sha256="${sourceHash}">
  <a class="skip-link" href="#main-content">Skip to handbook</a>
  <div class="reading-progress" aria-hidden="true"><span></span></div>

  <header class="mobile-bar">
    <a class="mobile-title" href="#book-top">${BOOK_TITLE}</a>
    <div class="mobile-actions">
      <button class="text-button search-trigger js-only" type="button" data-open-search aria-haspopup="dialog" aria-controls="search-dialog" aria-keyshortcuts="/">Search</button>
      <button class="menu-button js-only" type="button" data-open-toc aria-haspopup="dialog" aria-controls="toc-dialog">
        <span aria-hidden="true"></span>
        Contents
      </button>
      <a class="menu-button no-js-only" href="#contents">
        <span aria-hidden="true"></span>
        Contents
      </a>
    </div>
  </header>

  <div class="book-shell">
    <aside class="sidebar" aria-label="Handbook navigation">
      <a class="sidebar-brand" href="#book-top">
        <span>A handbook for production AI engineering</span>
        <strong>${BOOK_TITLE}</strong>
      </a>
      <nav class="sidebar-nav" aria-label="Table of contents">
        <p class="nav-label">Contents</p>
        <ol>${tocLinks}${backMatterTocLinks}</ol>
      </nav>
      <div class="sidebar-meta">
        <div class="sidebar-publication">
          <p class="sidebar-author">${AUTHOR_CREDIT_HTML}</p>
          <p class="sidebar-edition">${COVER_DATE} · ${BOOK_VERSION}</p>
        </div>
        <div class="sidebar-actions">
          <button class="text-button search-trigger js-only" type="button" data-open-search aria-haspopup="dialog" aria-controls="search-dialog" aria-keyshortcuts="/">Search</button>
          <a class="text-link" href="${PDF_HREF}" download aria-label="Download ${BOOK_TITLE} as a PDF, ${PDF_PAGE_COUNT} pages">PDF</a>
        </div>
      </div>
    </aside>

    <main id="main-content" tabindex="-1">
      <section class="cover" aria-labelledby="cover-title">
        <div class="cover-rule" aria-hidden="true"></div>
        <h1 id="cover-title">${BOOK_TITLE}</h1>
        <p class="cover-subtitle">${BOOK_SUBTITLE}</p>
        <p class="cover-credit">${AUTHOR_CREDIT_HTML}</p>
        <p class="cover-date">${COVER_DATE} · ${BOOK_VERSION}</p>
        <section class="release-window site-only" aria-labelledby="release-window-title" aria-describedby="release-window-schedule release-window-policy" data-release-window data-release-at="${releaseSchedule.nextReviewAt}" data-release-time-zone="${releaseSchedule.timeZone}" data-release-rrule="${releaseSchedule.rrule}">
          <div class="release-window-heading">
            <p class="release-window-label" id="release-window-title" data-release-status>Next version review</p>
            <p class="release-window-products">Site + PDF</p>
          </div>
          <div class="release-countdown js-only" data-release-countdown aria-hidden="true">
            <span><strong data-countdown-days>00</strong><small>Days</small></span>
            <span><strong data-countdown-hours>00</strong><small>Hours</small></span>
            <span><strong data-countdown-minutes>00</strong><small>Minutes</small></span>
            <span><strong data-countdown-seconds>00</strong><small>Seconds</small></span>
          </div>
          <p class="release-window-schedule" id="release-window-schedule">Scheduled for <time datetime="${releaseSchedule.nextReviewAt}" data-release-time>${nextReviewLabel} ${releaseZoneLabel}</time>.</p>
          <p class="release-window-policy" id="release-window-policy">Site and PDF updates publish together after manual review.</p>
        </section>
        <nav class="cover-actions site-only" aria-label="Handbook actions">
          <a class="action-link action-link-primary" href="#contents">Explore the handbook</a>
          <a class="action-link" href="${PDF_HREF}" download aria-label="Download ${BOOK_TITLE} as a PDF, ${PDF_PAGE_COUNT} pages">Download PDF <span>${PDF_PAGE_COUNT} pages</span></a>
        </nav>
      </section>

      <section class="foreword" aria-labelledby="foreword-title">
        <h2 id="foreword-title">Engineering the whole system</h2>
        ${renderBlocks(frontMatterLines)}
      </section>

      <section class="contents-page" id="contents" aria-labelledby="contents-title">
        <p class="section-label">Navigation</p>
        <h2 id="contents-title">Contents</h2>
        <ol>${tocLinks}${backMatterTocLinks}</ol>
      </section>

      ${chapterHtml}

      ${appendixHtml}

      ${indexHtml}

${changelogHtml}

      <footer class="book-footer">
        <p>${BOOK_TITLE}</p>
        <p>${AUTHOR_CREDIT_HTML}</p>
      </footer>
    </main>
  </div>

  <dialog class="toc-dialog" id="toc-dialog" aria-labelledby="dialog-title">
    <div class="dialog-header">
      <h2 id="dialog-title">Contents</h2>
      <button class="dialog-close" type="button" data-close-toc aria-label="Close contents">Close</button>
    </div>
    <nav aria-label="Mobile table of contents">
      <ol>${tocLinks}${backMatterTocLinks}</ol>
    </nav>
    <div class="dialog-footer">
      <a class="action-link" href="${PDF_HREF}" download aria-label="Download ${BOOK_TITLE} as a PDF, ${PDF_PAGE_COUNT} pages">Download PDF <span>${PDF_PAGE_COUNT} pages</span></a>
    </div>
  </dialog>

  <dialog class="search-dialog" id="search-dialog" aria-labelledby="search-dialog-title">
    <div class="dialog-header">
      <div>
        <p class="section-label">Companion search</p>
        <h2 id="search-dialog-title">Find a section</h2>
      </div>
      <button class="dialog-close" type="button" data-close-search aria-label="Close search">Close</button>
    </div>
    <div class="search-panel">
      <label class="sr-only" for="handbook-search">Search the handbook</label>
      <div class="search-field">
        <input id="handbook-search" type="search" inputmode="search" autocomplete="off" spellcheck="false" placeholder="Try “latency”, “retrieval”, or “agents”" aria-describedby="search-guidance search-status">
        <kbd aria-hidden="true">/</kbd>
      </div>
      <p class="search-guidance" id="search-guidance">Searches all ${mappedSectionNumbers.length} handbook sections. Choose a result to jump directly to it.</p>
      <p class="search-status" id="search-status" aria-live="polite">Search all ${mappedSectionNumbers.length} sections.</p>
      <ol class="search-results" data-search-results></ol>
    </div>
  </dialog>
</body>
</html>
`;

const requiredAssets = [
  resolve(HERE, "assets/favicon.png"),
  resolve(HERE, "assets/fonts/source-serif-4-latin-variable.woff2"),
  resolve(HERE, "assets/fonts/source-serif-4-latin-variable-italic.woff2"),
  ...chapters.map((chapter) => resolve(HERE, `assets/chapters/chapter-${String(chapter.number).padStart(2, "0")}.webp`)),
  ...chapters.map((chapter) => resolve(HERE, `assets/chapters/chapter-${String(chapter.number).padStart(2, "0")}-768.webp`)),
];
await Promise.all(requiredAssets.map((asset) => access(asset)));
await Promise.all([
  writeFile(OUTPUT_PATH, html, "utf8"),
  writeFile(RELEASE_SCHEDULE_PATH, `${JSON.stringify(releaseSchedule, null, 2)}\n`, "utf8"),
]);
console.log(`Built ${OUTPUT_PATH}`);
console.log(`Source SHA-256: ${sourceHash}`);
console.log(`Chapters: ${chapters.length}`);
console.log(`Verified chapter images: ${chapters.length}`);
console.log(`Changelog: ${changelogRequired ? "included" : "omitted; reader-facing content unchanged"}`);
console.log(`Next version review: ${nextReviewAt.toISOString()}`);
