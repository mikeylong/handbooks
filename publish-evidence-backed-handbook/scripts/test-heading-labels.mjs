import assert from 'node:assert/strict';
import {validateHtmlHeadingLabels,validateMarkdownHeadingLabels} from './heading-labels.mjs';
assert.deepEqual(validateHtmlHeadingLabels('<h2>Chapter 01</h2><h3 data-source-section="1.1">The full system</h3><p>1.5 seconds; version 1.2.3</p>'),['Chapter 01','The full system']);
for(const html of ['<h3>1.1 The full system</h3>','<h3><span>1.1&nbsp;</span><span>The full system</span></h3>','<h4>12.3.4 Nested section</h4>'])assert.throws(()=>validateHtmlHeadingLabels(html),/decimal/);
validateMarkdownHeadingLabels('# Chapter 01\n## The full system\n1. Follow the steps\n```md\n### 1.1 literal code\n```\n1.5 seconds');
assert.throws(()=>validateMarkdownHeadingLabels('## 1.1 The full system'),/decimal/);
console.log('PASS mandatory HTML/Markdown heading labels: markup splits, nested decimals, code, data and chapter markers');
