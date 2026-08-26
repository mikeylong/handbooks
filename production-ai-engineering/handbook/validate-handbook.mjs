#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { citationByUrl, citationEntries } from "./book-data.mjs";
import { INDEX_ENTRIES } from "./index-data.mjs";
import { buildReleaseSchedule, releaseTimeZoneLabel } from "./release-schedule.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const automationPath = process.env.HANDBOOK_AUTOMATION_PATH
  ? resolve(process.env.HANDBOOK_AUTOMATION_PATH)
  : resolve(here, "../automation/automation.toml");
const releasePolicyPath = process.env.HANDBOOK_RELEASE_POLICY_PATH
  ? resolve(process.env.HANDBOOK_RELEASE_POLICY_PATH)
  : resolve(here, "../automation/release-policy.json");
const source = await readFile(resolve(here, "../AI_ENGINEERING_FIELD_GUIDE.md"), "utf8");
const html = await readFile(resolve(here, "index.html"), "utf8");
const css = await readFile(resolve(here, "styles.css"), "utf8");
const app = await readFile(resolve(here, "app.js"), "utf8");
const changelog = JSON.parse(await readFile(resolve(here, "changelog.json"), "utf8"));
const releaseSchedule = JSON.parse(await readFile(resolve(here, "release-schedule.json"), "utf8"));
const automationSource = await readFile(automationPath, "utf8");
const releasePolicySource = await readFile(releasePolicyPath, "utf8");
const expectedReleaseSchedule = buildReleaseSchedule(
  automationSource,
  releasePolicySource,
  new Date(releaseSchedule.generatedAt),
);
const expectedBookVersion = process.env.HANDBOOK_VERSION
  ?? `Version 1.1${process.env.HANDBOOK_VERSION_SUFFIX ?? ""}`;
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
const expectedCoverDate = process.env.HANDBOOK_CANDIDATE_DATE
  ? formatCandidateDate(process.env.HANDBOOK_CANDIDATE_DATE)
  : PUBLICATION_DATE;
const formatBibliographyDate = (displayDate) => {
  const match = /^([A-Z][a-z]+) (\d{1,2}), (\d{4})$/.exec(displayDate);
  if (!match) throw new Error(`Invalid bibliography access date: ${displayDate}`);
  return `${match[2]} ${match[1]} ${match[3]}`;
};
const expectedBibliographyAccessDate = formatBibliographyDate(expectedCoverDate);
const UNCHANGED_CHANGELOG_SUMMARY = "The handbook's reader-facing content is unchanged.";
const changelogRequired = changelog.summary?.trim() !== UNCHANGED_CHANGELOG_SUMMARY;

const count = (pattern, value) => value.match(pattern)?.length ?? 0;
const decodeHtml = (value) => value
  .replaceAll("&quot;", '"')
  .replaceAll("&#039;", "'")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&amp;", "&");
const sourceUrls = new Set([...source.matchAll(/https?:\/\/[^)\s]+/g)].map((match) => match[0]));
const sourceHash = createHash("sha256").update(source).digest("hex");
const htmlUrls = new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((match) => match[1]));
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
const internalTargets = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
const missingInternalTargets = [...new Set(internalTargets.filter((target) => !ids.includes(target)))];
const chapterArtRule = css.match(/\.chapter-art\s*\{([^}]*)\}/s)?.[1] ?? "";
const printCss = css.slice(css.indexOf("@media print"));
const chapterArtPrintRule = printCss.match(/\.chapter-art\s*\{([^}]*)\}/s)?.[1] ?? "";
const codeFrameRule = css.match(/\.code-frame\s*\{([^}]*)\}/s)?.[1] ?? "";
const codeFramePreRule = css.match(/\.code-frame pre\s*\{([^}]*)\}/s)?.[1] ?? "";
const systemFlowRule = css.match(/\.system-flow-diagram\s*\{([^}]*)\}/s)?.[1] ?? "";
const validationFlowRule = css.match(/\.validation-flow-diagram\s*\{([^}]*)\}/s)?.[1] ?? "";
const fallbackFlowRule = css.match(/\.fallback-flow-diagram\s*\{([^}]*)\}/s)?.[1] ?? "";
const ragFlowRule = css.match(/\.rag-flow-diagram\s*\{([^}]*)\}/s)?.[1] ?? "";
const jsonSource = source.match(/```json\n([\s\S]*?)\n```/)?.[1] ?? "";
const jsonHtml = html.match(/<code class="language-json">([\s\S]*?)<\/code>/)?.[1] ?? "";
const jsonRenderedText = decodeHtml(jsonHtml.replace(/<\/?span(?:\s+class="[^"]+")?>/g, ""));
const syntaxTokens = (className) => [...jsonHtml.matchAll(new RegExp(`<span class="${className}">([^<]+)<\\/span>`, "g"))]
  .map((match) => decodeHtml(match[1]));
const coverHtml = html.match(/<section class="cover"[\s\S]*?<\/section>/)?.[0] ?? "";
const sidebarHtml = html.match(/<aside class="sidebar"[\s\S]*?<\/aside>/)?.[0] ?? "";
const releaseWindowHtml = html.match(/<section class="release-window site-only"[\s\S]*?<\/section>/)?.[0] ?? "";
const forewordHtml = html.match(/<section class="foreword"[\s\S]*?<\/section>/)?.[0] ?? "";
const changelogHtml = html.match(/<section class="back-matter changelog pdf-only"[\s\S]*?<\/section>/)?.[0] ?? "";
const decodedChangelogHtml = decodeHtml(changelogHtml);
const figureHtml = (className) => html.match(new RegExp(`<figure class="${className}"[^>]*>[\\s\\S]*?<\\/figure>`))?.[0] ?? "";
const dataLabels = (value) => [...value.matchAll(/\sdata-label="([^"]+)"/g)].map((match) => decodeHtml(match[1]));
const dataTopology = (value) => [...value.matchAll(/<path\b[^>]*\sdata-from="([^"]+)"[^>]*\sdata-to="([^"]+)"/g)]
  .map((match) => `${match[1]}->${match[2]}`);
const sameMembers = (actual, expected) =>
  actual.length === expected.length
  && new Set(actual).size === actual.length
  && expected.every((item) => actual.includes(item));
const hasAccessibleSvg = (value, prefix) =>
  new RegExp(`<svg[^>]+role="img"[^>]+aria-labelledby="${prefix}-title ${prefix}-description"`).test(value)
  && value.includes(`<title id="${prefix}-title">`)
  && value.includes(`<desc id="${prefix}-description">`);
const hasNoPanelDecoration = (rule) => !/border\s*:/.test(rule) && !/background\s*:/.test(rule);
const systemHtml = figureHtml("system-flow-diagram");
const systemNodeLabels = dataLabels(systemHtml);
const systemTopology = dataTopology(systemHtml);
const validationHtml = figureHtml("validation-flow-diagram");
const validationNodeLabels = dataLabels(validationHtml);
const validationTopology = dataTopology(validationHtml);
const fallbackHtml = figureHtml("fallback-flow-diagram");
const fallbackNodeLabels = dataLabels(fallbackHtml);
const fallbackTopology = dataTopology(fallbackHtml);
const ragHtml = figureHtml("rag-flow-diagram");
const ragNodeLabels = dataLabels(ragHtml);
const ragTopology = dataTopology(ragHtml);
const ownershipOutlineHtml = html.match(/<p>A production harness needs to own:<\/p>([\s\S]*?)<p>Enforce any rule about safety/)?.[1] ?? "";
const toolContractListHtml = html.match(/<p>A strong tool contract includes:<\/p>([\s\S]*?)<p>The harness then enforces the contract:<\/p>/)?.[1] ?? "";
const tableLabelIds = [...html.matchAll(/<caption class="sr-only" id="(table-label-\d+)"/g)]
  .map((match) => match[1]);
const tableRegionLabels = [...html.matchAll(/class="table-scroll" role="region" aria-label="([^"]+)"/g)]
  .map((match) => decodeHtml(match[1]));
const expectedSectionDisplayNumbers = [
  "1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "3.3", "4.1", "4.2", "5.1",
  "5.2", "6.1", "6.2", "7.1", "7.2", "8.1", "9.1", "9.2", "10.1", "10.2",
  "11.1", "11.2", "12.1", "12.2", "12.3",
];
const renderedSectionDisplayNumbers = [
  ...html.matchAll(/<section class="source-section"[^>]*>[\s\S]*?<h3><span class="section-number">(\d+\.\d+)&nbsp;<\/span>/g),
].map((match) => match[1]);

const chapterImages = Array.from({ length: 12 }, (_, index) =>
  resolve(here, `assets/chapters/chapter-${String(index + 1).padStart(2, "0")}.webp`),
);
const responsiveChapterImages = Array.from({ length: 12 }, (_, index) =>
  resolve(here, `assets/chapters/chapter-${String(index + 1).padStart(2, "0")}-768.webp`),
);
await Promise.all([
  resolve(here, "assets/favicon.png"),
  resolve(here, "assets/fonts/source-serif-4-latin-variable.woff2"),
  resolve(here, "assets/fonts/source-serif-4-latin-variable-italic.woff2"),
  ...chapterImages,
  ...responsiveChapterImages,
].map((path) => access(path)));

const checks = {
  chapters: count(/<section class="chapter"/g, html),
  decks: count(/class="chapter-deck"/g, html),
  sourceSections: count(/<section class="source-section"/g, html),
  sectionHierarchyValid:
    JSON.stringify(renderedSectionDisplayNumbers) === JSON.stringify(expectedSectionDisplayNumbers),
  sectionNumberStylingValid:
    css.includes(".source-section > h3 .section-number")
    && /font-size:\s*0\.6em/.test(css)
    && /font-variant-numeric:\s*tabular-nums/.test(css),
  sectionNumberSeparatorValid:
    count(/&nbsp;<\/span><span class="section-title">/g, html) === 25,
  legacyGlobalSectionHeadingsRemoved:
    !/<section class="source-section"[^>]*>[\s\S]*?<h3>\d+\.\s/.test(html),
  sourceMapHierarchyValid:
    expectedSectionDisplayNumbers.every((number) => html.includes(`<strong>§${number}</strong>`))
    && !/<strong>§\d+<\/strong>/.test(html),
  bibliographySectionHierarchyValid:
    !/<a href="#section-[^"]+">§\d+<\/a>/.test(html),
  bibliographyAccessDateExact:
    count(new RegExp(`Accessed ${expectedBibliographyAccessDate}\\.`, "g"), html)
      === citationEntries.filter((entry) => entry.accessed).length
    && count(/Accessed \d{1,2} [A-Z][a-z]+ \d{4}\./g, html)
      === citationEntries.filter((entry) => entry.accessed).length,
  sectionSourceLines: count(/class="section-sources"/g, html),
  citationMarkers: count(/class="citation-marker"/g, html),
  bibliographyEntries: count(/class="reference-label"/g, html),
  indexEntries: count(/class="index-term"/g, html),
  chapterImages: count(/class="chapter-art"/g, html),
  chapterImageIntrinsicResolutionValid:
    count(/width="1536"/g, html) === 12
    && count(/height="1364"/g, html) === 8
    && count(/height="1368"/g, html) === 4,
  responsiveChapterImages: count(/<source\s+media="\(max-width: 42rem\)"[\s\S]*?-768\.webp 768w,[\s\S]*?1536w"[\s\S]*?>/g, html),
  chapterArtPrintScaleValid:
    /width:\s*104mm/.test(chapterArtPrintRule)
    && /max-width:\s*100%/.test(chapterArtPrintRule)
    && /height:\s*auto/.test(chapterArtPrintRule)
    && /#chapter-03-prefill-and-decode-are-different-jobs \.chapter-art\s*\{\s*width:\s*110mm;\s*\}/s.test(printCss)
    && /#chapter-09-trace-the-whole-user-journey \.chapter-art\s*\{\s*width:\s*116mm;\s*\}/s.test(printCss),
  pairedRowVerticalAlignmentValid:
    /\.key-value-example > div,\s*\.cache-key-composition > div,\s*\.latency-band,\s*\.golden-record > div,\s*\.cost-model dl > div\s*\{\s*align-items:\s*center;\s*\}/s.test(css),
  systemFlowDiagrams: count(/class="system-flow-diagram"/g, html),
  systemFlowNodes: count(/class="diagram-node /g, systemHtml),
  systemFlowTopologyValid: sameMembers(systemTopology, [
    "U->I", "I->R", "R->C", "C->M", "M->V", "V->X", "V->P", "P->C",
    "D->C", "K->C", "T->C", "O->R", "O->C", "O->M", "O->V", "O->P",
    "E->R", "E->C", "E->M", "E->V",
  ]),
  systemFlowNodeLabelsValid: JSON.stringify(systemNodeLabels) === JSON.stringify([
    "User request",
    "Identity and policy",
    "Router",
    "Context builder",
    "Model inference",
    "Parse and validate",
    "Response or degraded UX",
    "Authorize and execute",
    "Authorized data",
    "Caches and memory",
    "Tool contracts",
    "Observability",
    "Evaluation",
  ]),
  systemFlowAccessibilityValid: hasAccessibleSvg(systemHtml, "system-flow"),
  systemFlowVectorOnly: !/<(?:pre|code)\b/.test(systemHtml),
  systemFlowPanelDecorationRemoved: hasNoPanelDecoration(systemFlowRule),
  systemFlowWidthStandardized: systemHtml.includes('viewBox="0 0 760 590"'),
  validationFlowDiagrams: count(/class="validation-flow-diagram"/g, html),
  validationSteps: count(/class="validation-node validation-step"/g, validationHtml),
  validationLinks: count(/class="validation-spine-link"/g, validationHtml),
  validationArrowheadsRemoved:
    !validationHtml.includes("validation-flow-arrow")
    && !validationHtml.includes("validation-arrowhead")
    && !css.includes("validation-flow-arrow")
    && !css.includes("validation-arrowhead")
    && !css.includes("validation-spine-arrow"),
  validationTopologyValid: sameMembers(validationTopology, [
    "R->T", "T->P", "P->V", "V->N", "N->RV", "RV->A", "A->E", "E->C",
  ]),
  validationNodeLabelsValid: JSON.stringify(validationNodeLabels) === JSON.stringify([
    "Model response",
    "Inspect transport status, finish reason, refusal, and incomplete state",
    "Parse",
    "Validate raw structure and reject unknown fields",
    "Apply explicitly allowed normalization",
    "Revalidate normalized schema and domain invariants",
    "Authorize the exact subject, resource, and action",
    "Execute or publish",
    "Verify the postcondition",
  ]),
  validationAccessibilityValid: hasAccessibleSvg(validationHtml, "validation-flow"),
  validationVectorOnly: !/<(?:pre|code)\b/.test(validationHtml),
  validationUiChromeRemoved: !/<(?:rect|circle)\b/.test(validationHtml),
  validationPanelDecorationRemoved: hasNoPanelDecoration(validationFlowRule),
  validationVerticalRhythmValid:
    validationHtml.includes('viewBox="0 0 760 478"')
    && count(/class="validation-row-rule"[^>]*y1="28"/g, validationHtml) === 8,
  validationUsabilityGateExplicit:
    validationHtml.includes("continue only if usable")
    && validationHtml.includes("Refused or incomplete responses do not proceed to parsing"),
  codeFrames: count(/class="code-frame"/g, html),
  jsonCodeFrames: count(/class="language-json"/g, html),
  jsonSyntaxHighlighted: [
    "syntax-key",
    "syntax-string",
    "syntax-boolean",
    "syntax-null",
    "syntax-punctuation",
  ].every((className) => html.includes(`class="${className}"`)),
  jsonSourceFidelity: jsonRenderedText === jsonSource,
  jsonSyntaxClassificationValid:
    JSON.stringify(syntaxTokens("syntax-key")) === JSON.stringify([
      '"ok"',
      '"code"',
      '"retryable"',
      '"recovery"',
      '"data"',
      '"state_version"',
    ])
    && JSON.stringify(syntaxTokens("syntax-string")) === JSON.stringify([
      '"VERSION_CONFLICT"',
      '"REFRESH_STATE_AND_REPLAN"',
      '"42"',
    ])
    && JSON.stringify(syntaxTokens("syntax-boolean")) === JSON.stringify(["false", "false"])
    && JSON.stringify(syntaxTokens("syntax-null")) === JSON.stringify(["null"]),
  keyValueExamples: count(/class="editorial-example key-value-example"/g, html),
  cacheKeyCompositions: count(/class="editorial-example cache-key-composition"/g, html),
  latencyBudgets: count(/class="editorial-example latency-budget"/g, html),
  kvFootprints: count(/class="editorial-example kv-footprint"/g, html),
  fallbackFlowDiagrams: count(/class="fallback-flow-diagram"/g, html),
  fallbackPathNodes: count(/fallback-node fallback-path-node/g, fallbackHtml),
  fallbackTerminalNodes: count(/fallback-node fallback-terminal-node/g, fallbackHtml),
  fallbackArrows: count(/class="fallback-arrow(?:\s|")/g, fallbackHtml),
  fallbackBranchArrows: count(/fallback-branch-arrow/g, fallbackHtml),
  fallbackTopologyValid: sameMembers(fallbackTopology, ["P->S", "S->D", "D->R", "D->Q", "D->H"]),
  fallbackNodeLabelsValid: JSON.stringify(fallbackNodeLabels) === JSON.stringify([
    "Primary qualified model",
    "Compatible secondary provider/model",
    "Smaller read-only or lower-capability mode",
    "Deterministic result",
    "Queued work",
    "Human handoff",
  ]),
  fallbackAccessibilityValid: hasAccessibleSvg(fallbackHtml, "fallback-flow"),
  fallbackVectorOnly: !/<(?:pre|code)\b/.test(fallbackHtml),
  fallbackUiChromeRemoved: !/<rect\b/.test(fallbackHtml),
  fallbackEditorialEdgeNotes:
    fallbackHtml.includes("eligible failure; contract preserved")
    && fallbackHtml.includes("eligible failure; degraded mode disclosed")
    && !fallbackHtml.includes("eligible failure /"),
  legacyFallbackLadders: count(/fallback-ladder/g, html),
  rawFallbackSourceRemoved: !html.includes("Terminal options | Deterministic result"),
  fallbackPanelDecorationRemoved: hasNoPanelDecoration(fallbackFlowRule),
  ragFlowDiagrams: count(/class="rag-flow-diagram"/g, html),
  ragIngestionStages: count(/class="rag-stage rag-ingestion-stage"/g, ragHtml),
  ragDatastores: count(/class="rag-datastore-node"/g, ragHtml),
  ragQueryStages: count(/class="rag-stage rag-query-stage"/g, ragHtml),
  ragOutcomes: count(/class="rag-outcome /g, ragHtml),
  ragArrows: count(/class="rag-arrow(?:\s|")/g, ragHtml),
  ragBranches: count(/class="rag-branch"/g, ragHtml),
  ragTopologyValid: sameMembers(ragTopology, [
    "S->P",
    "P->C",
    "C->I",
    "I->R",
    "Q->F",
    "F->R",
    "R->U",
    "U->D",
    "D->A",
    "D->X",
  ]),
  ragNodeLabelsValid: JSON.stringify(ragNodeLabels) === JSON.stringify([
    "Sources",
    "Parse and preserve structure",
    "Authorize, version, and chunk",
    "Shared index: lexical and vector indexes",
    "Query + identity",
    "Tenant + document ACL filters",
    "lexical/dense candidates",
    "fusion and reranking",
    "deduplicate and context-pack",
    "Answer with claim-level citations",
    "Abstain",
  ]),
  ragAccessibilityValid: hasAccessibleSvg(ragHtml, "rag-flow"),
  ragVectorOnly: !/<(?:pre|code)\b/.test(ragHtml),
  ragUiChromeRemoved: !/<rect\b/.test(ragHtml),
  ragDataflowGrammarValid:
    count(/class="rag-datastore-rim"/g, ragHtml) === 1
    && count(/class="rag-junction"/g, ragHtml) === 1
    && count(/class="rag-outcome-marker"/g, ragHtml) === 2,
  ragCollisionClearancesValid:
    count(/rag-merge-input/g, ragHtml) === 2
    && count(/rag-terminal-link/g, ragHtml) === 2
    && !ragHtml.includes('d="M6 45')
    && css.includes(".rag-flow-diagram .rag-merge-input,\n.rag-flow-diagram .rag-terminal-link {\n  marker-end: none;\n}"),
  ragPrintScaleValid: count(/\.rag-flow-diagram svg\s*\{\s*max-height:\s*61mm;\s*\}/g, css) === 1,
  ragWidthStandardized: ragHtml.includes('viewBox="0 0 760 400"'),
  legacyRagFlows: count(/class="editorial-example rag-flow"/g, html),
  rawRagSourceRemoved: !html.includes("Ingestion | Sources"),
  ragPanelDecorationRemoved: hasNoPanelDecoration(ragFlowRule),
  goldenRecords: count(/class="editorial-example golden-record"/g, html),
  traceTrees: count(/class="editorial-example trace-tree"/g, html),
  costModels: count(/class="editorial-example cost-model"/g, html),
  ownershipOutlines: count(/class="outline-list"/g, html),
  ownershipOutlineHierarchyValid:
    count(/<ol(?: class="outline-list")?>/g, ownershipOutlineHtml) === 4
    && count(/<li>/g, ownershipOutlineHtml) === 12
    && [
      "Bind every run.",
      "Control execution.",
      "Bound and account for outcomes.",
    ].every((label) => ownershipOutlineHtml.includes(`<strong>${label}</strong>`)),
  ownershipOutlineNumberingValid: css.includes('content: counters(outline-item, ".") ".";'),
  toolContractListOrdered:
    /^\s*<ol>/.test(toolContractListHtml)
    && count(/<li>/g, toolContractListHtml) === 8
    && !/<ul>/.test(toolContractListHtml),
  textSchematics: count(/class="editorial-example text-schematic"/g, html),
  lazyImages: count(/loading="lazy"/g, html),
  eagerImages: count(/loading="eager"/g, html),
  pdfDownloadLinks: count(/href="\.\.\/output\/pdf\/production-ai-engineering\.pdf" download/g, html),
  releaseScheduleValid:
    JSON.stringify(releaseSchedule) === JSON.stringify(expectedReleaseSchedule)
    && Number.isFinite(Date.parse(releaseSchedule.generatedAt))
    && Number.isFinite(Date.parse(releaseSchedule.nextReviewAt))
    && Date.parse(releaseSchedule.nextReviewAt) > Date.parse(releaseSchedule.generatedAt),
  releaseCountdownValid:
    count(/class="release-window site-only"/g, html) === 1
    && releaseWindowHtml.includes(`data-release-at="${releaseSchedule.nextReviewAt}"`)
    && releaseWindowHtml.includes(`datetime="${releaseSchedule.nextReviewAt}"`)
    && releaseWindowHtml.includes("Next version review")
    && releaseWindowHtml.includes("Site + PDF")
    && releaseWindowHtml.includes(releaseTimeZoneLabel(releaseSchedule.timeZone))
    && releaseWindowHtml.includes("Site and PDF updates publish together after manual review.")
    && count(/data-countdown-(?:days|hours|minutes|seconds)/g, releaseWindowHtml) === 4
    && app.includes('document.querySelector("[data-release-window]")')
    && app.includes('releaseStatus.textContent = "Review window open"')
    && app.includes("window.setInterval(updateReleaseCountdown, 1000)")
    && app.includes('window.addEventListener("pageshow", startReleaseCountdown)')
    && app.includes('window.addEventListener("pagehide"'),
  releaseCountdownAccessible:
    releaseWindowHtml.includes('aria-describedby="release-window-schedule release-window-policy"')
    && releaseWindowHtml.includes('data-release-countdown aria-hidden="true"')
    && !releaseWindowHtml.includes("aria-live")
    && css.includes(".js .release-countdown")
    && /@media \(max-width: 22rem\)[\s\S]*?\.release-countdown\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/.test(css),
  searchCompanionValid:
    html.includes('id="search-dialog"')
    && html.includes('id="handbook-search"')
    && html.includes('data-search-results')
    && count(/data-open-search/g, html) === 2
    && app.includes('document.querySelectorAll(".source-section")')
    && app.includes('aria-current'),
  noJavaScriptNavigationFallback:
    html.includes('class="menu-button no-js-only" href="#contents"')
    && html.includes('class="menu-button js-only" type="button" data-open-toc')
    && css.includes('.no-js .js-only')
    && css.includes('.no-js .no-js-only'),
  activeNavigationValid:
    app.includes('section.querySelector(".chapter-header[id]")?.id')
    && app.includes('.sidebar-nav a, .toc-dialog nav a')
    && app.includes('.cover, .foreword, #contents, .chapter')
    && app.includes('targetId && link.getAttribute("href")'),
  scrollProgressAnnouncementsRemoved:
    !html.includes('id="progress-status"')
    && !app.includes("lastReportedProgress"),
  keyboardScrollableDiagrams:
    [systemHtml, validationHtml, fallbackHtml, ragHtml].every((figure) => (
      /^<figure[^>]+role="region"[^>]+aria-label="[^"]+"[^>]+tabindex="0">/.test(figure)
    )),
  tableScrollHintsMatch:
    count(/class="table-scroll-hint"/g, html) === count(/class="table-scroll"/g, html),
  tableRegionsUniquelyNamed:
    tableLabelIds.length === count(/class="table-scroll"/g, html)
    && new Set(tableLabelIds).size === tableLabelIds.length
    && tableRegionLabels.length === tableLabelIds.length
    && new Set(tableRegionLabels).size === tableRegionLabels.length,
  checklistsAreStatic:
    !/<input[^>]+type="checkbox"/.test(html)
    && count(/class="checklist-box"/g, html) === 31,
  accessibleColorTokens:
    css.includes("--faint: #6e6b63;")
    && css.includes("--line-strong: #77746b;"),
  siteCanvasWhite:
    css.includes("--paper: #ffffff;")
    && css.includes("--paper-raised: #ffffff;")
    && html.includes('<meta name="theme-color" content="#ffffff">')
    && /html\s*\{[^}]*background:\s*var\(--paper\);/.test(css)
    && /body\s*\{[^}]*background:\s*var\(--paper\);/.test(css)
    && /main\s*\{[^}]*background:\s*var\(--paper\);/.test(css),
  sidebarPublicationMetadataExact:
    sidebarHtml.includes('<p class="sidebar-author">Michael Long, <a href="https://surfaces.systems">surfaces.systems</a></p>')
    && sidebarHtml.includes(`<p class="sidebar-edition">${expectedCoverDate} · ${expectedBookVersion}</p>`)
    && /\.sidebar-meta\s*\{[^}]*display:\s*grid;/.test(css)
    && /\.sidebar-publication\s*\{[^}]*display:\s*grid;/.test(css),
  touchTargetsDefined:
    /\.text-button,\s*\.text-link,\s*\.menu-button,\s*\.dialog-close\s*\{[\s\S]*?min-height:\s*2\.75rem;/.test(css),
  tocDialogFooterLayoutScoped:
    css.includes(".toc-dialog nav a {")
    && !css.includes(".toc-dialog a {")
    && /\.dialog-footer \.action-link\s*\{[\s\S]*?width:\s*100%;/.test(css),
  companionChromeHiddenInPrint:
    /@media print[\s\S]*?\.search-dialog,[\s\S]*?\.site-only,[\s\S]*?\.table-scroll-hint\s*\{[\s\S]*?display:\s*none !important;/.test(css),
  changelogPage: count(/class="back-matter changelog pdf-only"/g, html),
  changelogContentValid:
    changelog.schemaVersion === 1
    && /^[a-f0-9]{64}$/.test(changelog.previousPdfSha256)
    && changelog.currentSourceSha256 === sourceHash
    && Array.isArray(changelog.items)
    && (
      changelogRequired
        ? (
          changelog.items.length >= 1
          && changelog.items.length <= 8
          && decodedChangelogHtml.includes(`<p class="changelog-version">${expectedBookVersion} - ${changelog.entryDate}</p>`)
          && decodedChangelogHtml.includes(`Compared with ${changelog.previousVersion}, published ${changelog.previousPublicationDate}.`)
          && decodedChangelogHtml.includes(changelog.summary)
          && changelog.items.every(({ category, text }) => (
            decodedChangelogHtml.includes(`<dt>${category}</dt>`)
            && decodedChangelogHtml.includes(`<dd>${text}</dd>`)
          ))
          && decodedChangelogHtml.includes(changelog.previousPdfSha256)
        )
        : changelog.items.length === 0 && changelogHtml === ""
    ),
  changelogIsFinalSection:
    changelogRequired
      ? (
        html.indexOf('id="changelog"') > html.indexOf('id="term-index"')
        && html.indexOf('id="changelog"') < html.indexOf('<footer class="book-footer">')
      )
      : !html.includes('id="changelog"'),
  changelogTocLink:
    count(/<li class="pdf-only">\s*<a href="#changelog">/g, html)
      === (changelogRequired ? 3 : 0),
  changelogPdfOnly:
    /\.pdf-only\s*\{\s*display:\s*none;\s*\}/s.test(css)
    && /@media print[\s\S]*?\.pdf-only\s*\{\s*display:\s*block;\s*\}/s.test(css)
    && /@media print[\s\S]*?\.changelog\s*\{[\s\S]*?break-inside:\s*avoid-page;/s.test(css),
  changelogStartsOnNewPrintPage:
    /@media print[\s\S]*?\.changelog\s*\{[\s\S]*?break-before:\s*page;/s.test(css),
  sourceUrls: sourceUrls.size,
  htmlUrls: htmlUrls.size,
  allSourceUrlsPreserved: [...sourceUrls].every((url) => htmlUrls.has(url)),
  allSourceUrlsCited: [...sourceUrls].every((url) => citationByUrl.has(url)),
  uniqueIds: new Set(ids).size === ids.length,
  missingInternalTargets,
  cssBracesBalanced: count(/{/g, css) === count(/}/g, css),
  fullAuthorName: html.includes("Michael Long"),
  coverCreditExact:
    html.includes('<p class="cover-credit">Michael Long, <a href="https://surfaces.systems">surfaces.systems</a></p>')
    && !html.includes("Bainbridge Island"),
  authorSiteLinked:
    count(/href="https:\/\/surfaces\.systems"/g, html) === 3,
  coverLabelsRemoved:
    !html.includes("Written by")
    && !html.includes("Evidence reviewed"),
  coverLegacyEditionLineRemoved:
    !coverHtml.includes("First edition")
    && !html.includes('class="cover-edition"'),
  coverPublicationMetadataExact:
    coverHtml.includes(`<p class="cover-date">${expectedCoverDate} · ${expectedBookVersion}</p>`),
  coverDedicationRemoved:
    !coverHtml.includes("Dedication")
    && !coverHtml.includes("For Corban, Luca, and Lela")
    && !html.includes('class="cover-dedication"'),
  forewordPremiseLabelRemoved: !forewordHtml.includes(">Premise<"),
  forewordSloDefined:
    forewordHtml.includes("successful, policy-compliant user outcome that meets service-level objectives (SLOs) for latency and cost")
    && !forewordHtml.includes("latency and cost SLO"),
  handbookSelfReference:
    html.includes("This handbook lays out an operating model")
    && !html.includes("The field guide lays out an operating model"),
  centralPremiseApproved:
    html.includes("A model can propose an answer or action. The surrounding system decides whether and how it should proceed, and remains responsible for the outcome.")
    && !html.includes("measure outcomes, and stop safely"),
  correctBookTitle: html.includes("Production AI Engineering"),
  stockBookTitleRemoved: !html.includes("Beyond the Prompt"),
  inaccurateCoverNoteRemoved: !html.includes("Adapted in full"),
  tocMetadataRemoved: !/<span class="toc-title">[^<]+<small>/.test(html),
  plateCaptionsRemoved: !html.includes("<figcaption>"),
  plateDecorationsRemoved:
    /border:\s*0/.test(chapterArtRule)
    && /background:\s*transparent/.test(chapterArtRule)
    && !/border-(?:block|top|bottom)/.test(chapterArtRule),
  rawMermaidRemoved:
    !html.includes("flowchart LR")
    && !html.includes("flowchart TD")
    && !html.includes("language-mermaid"),
  plainTextCodeExamplesRemoved:
    !html.includes("text code example")
    && !html.includes("language-text"),
  codeFrameDecorationRemoved:
    /border:\s*0/.test(codeFrameRule)
    && /background:\s*transparent/.test(codeFrameRule)
    && /padding:\s*0/.test(codeFramePreRule)
    && !html.includes("code-label"),
};

const expected = {
  chapters: 12,
  decks: 12,
  sourceSections: 25,
  sectionHierarchyValid: true,
  sectionNumberStylingValid: true,
  sectionNumberSeparatorValid: true,
  legacyGlobalSectionHeadingsRemoved: true,
  sourceMapHierarchyValid: true,
  bibliographySectionHierarchyValid: true,
  bibliographyAccessDateExact: true,
  sectionSourceLines: 25,
  bibliographyEntries: citationEntries.length,
  indexEntries: INDEX_ENTRIES.length,
  chapterImages: 12,
  chapterImageIntrinsicResolutionValid: true,
  responsiveChapterImages: 12,
  chapterArtPrintScaleValid: true,
  pairedRowVerticalAlignmentValid: true,
  systemFlowDiagrams: 1,
  systemFlowNodes: 8,
  systemFlowTopologyValid: true,
  systemFlowNodeLabelsValid: true,
  systemFlowAccessibilityValid: true,
  systemFlowVectorOnly: true,
  systemFlowPanelDecorationRemoved: true,
  systemFlowWidthStandardized: true,
  validationFlowDiagrams: 1,
  validationSteps: 8,
  validationLinks: 8,
  validationArrowheadsRemoved: true,
  validationTopologyValid: true,
  validationNodeLabelsValid: true,
  validationAccessibilityValid: true,
  validationVectorOnly: true,
  validationUiChromeRemoved: true,
  validationPanelDecorationRemoved: true,
  validationVerticalRhythmValid: true,
  validationUsabilityGateExplicit: true,
  codeFrames: 1,
  jsonCodeFrames: 1,
  jsonSyntaxHighlighted: true,
  jsonSourceFidelity: true,
  jsonSyntaxClassificationValid: true,
  keyValueExamples: 1,
  cacheKeyCompositions: 1,
  latencyBudgets: 1,
  kvFootprints: 1,
  fallbackFlowDiagrams: 1,
  fallbackPathNodes: 3,
  fallbackTerminalNodes: 3,
  fallbackArrows: 5,
  fallbackBranchArrows: 3,
  fallbackTopologyValid: true,
  fallbackNodeLabelsValid: true,
  fallbackAccessibilityValid: true,
  fallbackVectorOnly: true,
  fallbackUiChromeRemoved: true,
  fallbackEditorialEdgeNotes: true,
  legacyFallbackLadders: 0,
  rawFallbackSourceRemoved: true,
  fallbackPanelDecorationRemoved: true,
  ragFlowDiagrams: 1,
  ragIngestionStages: 3,
  ragDatastores: 1,
  ragQueryStages: 5,
  ragOutcomes: 2,
  ragArrows: 10,
  ragBranches: 1,
  ragTopologyValid: true,
  ragNodeLabelsValid: true,
  ragAccessibilityValid: true,
  ragVectorOnly: true,
  ragUiChromeRemoved: true,
  ragDataflowGrammarValid: true,
  ragCollisionClearancesValid: true,
  ragPrintScaleValid: true,
  ragWidthStandardized: true,
  legacyRagFlows: 0,
  rawRagSourceRemoved: true,
  ragPanelDecorationRemoved: true,
  goldenRecords: 1,
  traceTrees: 1,
  costModels: 1,
  ownershipOutlines: 1,
  ownershipOutlineHierarchyValid: true,
  ownershipOutlineNumberingValid: true,
  toolContractListOrdered: true,
  textSchematics: 0,
  codeFrameDecorationRemoved: true,
  lazyImages: 12,
  eagerImages: 0,
  pdfDownloadLinks: 3,
  releaseScheduleValid: true,
  releaseCountdownValid: true,
  releaseCountdownAccessible: true,
  searchCompanionValid: true,
  noJavaScriptNavigationFallback: true,
  activeNavigationValid: true,
  scrollProgressAnnouncementsRemoved: true,
  keyboardScrollableDiagrams: true,
  tableScrollHintsMatch: true,
  tableRegionsUniquelyNamed: true,
  checklistsAreStatic: true,
  accessibleColorTokens: true,
  siteCanvasWhite: true,
  sidebarPublicationMetadataExact: true,
  touchTargetsDefined: true,
  tocDialogFooterLayoutScoped: true,
  companionChromeHiddenInPrint: true,
  changelogPage: changelogRequired ? 1 : 0,
  changelogContentValid: true,
  changelogIsFinalSection: true,
  changelogTocLink: true,
  changelogPdfOnly: true,
};

const failures = Object.entries(expected)
  .filter(([key, value]) => checks[key] !== value)
  .map(([key, value]) => `${key}: expected ${value}, received ${checks[key]}`);

if (!checks.allSourceUrlsPreserved) failures.push("One or more source URLs are missing");
if (!checks.allSourceUrlsCited) failures.push("One or more source URLs have no bibliography entry");
if (!checks.uniqueIds) failures.push("HTML IDs are not unique");
if (checks.missingInternalTargets.length) failures.push("One or more internal links have no target");
if (!checks.cssBracesBalanced) failures.push("CSS braces are unbalanced");
if (checks.citationMarkers < 25) failures.push("Too few inline citation markers");
if (!checks.fullAuthorName) failures.push("Full author name is missing");
if (!checks.coverCreditExact) failures.push("Cover credit is not the approved linked author line");
if (!checks.authorSiteLinked) failures.push("Author site is not linked consistently on the cover, sidebar, and footer");
if (!checks.coverLabelsRemoved) failures.push("Removed cover-credit labels remain");
if (!checks.coverLegacyEditionLineRemoved) failures.push("Legacy edition line remains on the cover");
if (!checks.coverPublicationMetadataExact) failures.push("Cover publication date or version is missing or incorrect");
if (!checks.coverDedicationRemoved) failures.push("Removed cover dedication remains");
if (!checks.forewordPremiseLabelRemoved) failures.push("Premise label remains on the foreword");
if (!checks.forewordSloDefined) failures.push("SLO is not defined on first use in the foreword");
if (!checks.handbookSelfReference) failures.push("Foreword still refers to the publication as the field guide");
if (!checks.centralPremiseApproved) failures.push("Foreword central premise does not use the approved system-accountability language");
if (!checks.correctBookTitle) failures.push("Correct book title is missing");
if (!checks.stockBookTitleRemoved) failures.push("Stock book title remains");
if (!checks.inaccurateCoverNoteRemoved) failures.push("Inaccurate cover provenance note remains");
if (!checks.tocMetadataRemoved) failures.push("Production metadata remains in the table of contents");
if (!checks.plateCaptionsRemoved) failures.push("Production plate captions remain");
if (!checks.plateDecorationsRemoved) failures.push("Illustration border or background treatment remains");
if (!checks.rawMermaidRemoved) failures.push("Raw Mermaid source remains in the rendered handbook");
if (!checks.plainTextCodeExamplesRemoved) failures.push("Plain-text material is still rendered as code");

console.log(JSON.stringify(checks, null, 2));
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
