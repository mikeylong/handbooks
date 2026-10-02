# Context-starved reader review after revision

Reviewed only `/Users/mike/handbooks/ai-consulting/candidate-2026-10-01/qa/manuscript.txt`, all 5,044 lines, on October 1, 2026. The file's modification timestamp and byte size were unchanged at the beginning and end of review. No source files, other project context, websites, or PDF metadata were inspected. This is a manuscript-content review, not external factual verification or a visual/layout approval.

The revised manuscript resolves the earlier substantive capstone defects. It now teaches a defensible repair decision rather than expansion despite failed gates. No High finding remains in this manuscript-only review. Three Medium and four Low findings remain below.

## Remaining findings

### Medium — Make the general capacity formula agree with the worked model

- Location: Chapter 11, p. 83, lines 3158–3159; Appendix D, p. 122, lines 4631–4632.
- Wording: “eligible units x observed net minutes saved / 60.”
- Problem: The capstone correctly uses available requests × use rate × mean net minutes ÷ 60 (p. 107), but these reusable formulas omit both mean and use-rate treatment. A reader using 912 available requests and the 3-minute assisted/comparison mean gap would obtain 45.6 hours instead of the worked model's 32.832 hours. The formula is valid only if “net minutes” is an average across all eligible units including non-use, or if the unit count is restricted to used units. Neither is stated.
- Repair: Use “available eligible units × planning use rate × mean net minutes per assisted unit ÷ 60,” with an alternative for an observed per-eligible-unit mean that already includes non-use. Say when the result is an association rather than a causal saving. Keep the prohibition on aggregating differences of medians.

### Medium — Label monthly scenario values as monthly

- Location: Capstone §9, p. 107, line 4044 and scenario rows.
- Wording: column heading “FIRST-YEAR NET VALUE,” with expected entry “-$201.51.”
- Problem: The inputs and all entries are monthly values during the first year, not annual net values. The surrounding prose and answer key explain the monthly basis, but the table can be copied or cited independently and then interpreted as an annual total.
- Repair: Rename the heading “MONTHLY NET CAPACITY VALUE IN YEAR 1,” or show annual values and explicitly multiply monthly values by twelve. Keep “capacity value” visible to prevent interpretation as realized cash savings.

### Medium — Give vendor deletion evidence one unambiguous gate deadline

- Location: Answer key §5, p. 113, line 4262; handoff plan, p. 114, line 4316.
- Wording: next-gate step “Complete vendor deletion evidence and provider-change rehearsal”; Vendor row due “Before final acceptance.”
- Problem: The next-gate checklist makes deletion evidence a prerequisite for the repair boundary, while the handoff table permits delivery at final acceptance, after repair exposure and final review. The manuscript should not leave readers deciding whether this open control permits live repair exposure.
- Repair: Make deletion evidence due before repair exposure in both places. If it is deliberately permitted to remain open during repair, state the specific residual-risk owner, interim restriction, and acceptance decision, then separate that deadline from final handoff acceptance.

### Low — Preserve the caution when summarizing adoption recovery

- Location: Capstone incident table, p. 105, lines 3974–3976; answer key evidence summary, p. 111, lines 4186–4188.
- Wording: the incident table correctly warns “different periods and denominators prevent treating this as a controlled effect of the fix”; the answer key says “use recovered after latency, source visibility, and communication improved.”
- Problem: The summary is temporally phrased, but it omits the explicit comparability limit the revised packet carefully establishes. The incident table's label “User trust” also presents usage as a trust measure without a separate trust observation.
- Repair: Label the table row “Eligible use,” and summarize “Later-candidate use was higher; differing periods and denominators prevent attributing that change to the repairs alone.” Add trust evidence if the manuscript intends to make a trust claim.

### Low — Identify the confidence level and meaning of the rule of three, or omit it

- Location: Declared gates, p. 104, lines 3944–3948.
- Wording: “A rule-of-three approximation would be about 3/74 = 4.1% only under independent, representative trials; those assumptions do not hold here.”
- Problem: The caveat is good, but “rule of three” is unexplained and the confidence level and upper-bound interpretation are absent. It introduces a quantitative method into a guide for readers without statistical expertise while also saying it does not apply to these cases.
- Repair: Either remove this sentence and retain the clear zero-count limitation, or explain that this is an approximate 95% upper confidence bound under stated assumptions, not an observed failure rate or a bound justified by this selected challenge set.

### Low — Make the recurring-cost row's title describe its contents

- Location: Frozen results, p. 103, lines 3902–3905.
- Wording: row label “Full recurring cost”; result “$8.10-$13.60 platform cost per 100 available eligible units”; limitation says to add ownership, cleanup, and enterprise tier below.
- Problem: The row label still calls a partial platform figure full recurring cost. The worked model repairs the larger problem, but a reader copying this row alone would preserve the wrong category.
- Repair: Rename the row “Platform cost” or “Platform cost component.” Keep the worked-model reference.

### Low — Give companion handbooks a retrieval location

- Location: Chapter 8, p. 58, lines 2317–2328.
- Wording: “Michael Long's AI Evaluation Field Guide (Version 1.0.0)” and “His Production AI Engineering (Version 1.4.0).”
- Problem: Author and editions are now supplied and the chapter includes a minimum independent procedure, so the earlier dependence is substantially repaired. No URL, publisher/catalog location, or further-reading entry tells a reader where to retrieve the books.
- Repair: Add a stable catalog or document URL, or identify the location where these editions will be published. Do not imply an unpublished companion is already obtainable.

## Disposition of the earlier findings

| Earlier finding | Manuscript-only result |
| --- | --- |
| Unreproducible 72% eligible use | Resolved. P. 102 defines 442 available requests, 318 used, 124 fallback, and 170 without access; p. 103 gives 318/442 and final-period 168/200. |
| Frozen candidate mixed with incident/fix exposure | Resolved. P. 102 separates HSP-0.7 weeks 1–3 from frozen HSP-0.8 weeks 4–6 and lists frozen components. |
| Audit excluded all incident-exposed drafts and mislabeled field accuracy | Resolved. P. 103 audits every HSP-0.8 draft and labels draft-level correctness; p. 105 separately reports all 29 incident-exposed HSP-0.7 drafts. |
| Expansion despite missing thresholds and protected outcomes | Resolved. P. 104 supplies declared floors, flags the failed contract floor and incomplete outcomes, and holds expansion; answer key recommends revise or a bounded alternative. |
| Economics irreproducible and median extrapolation | Substantially resolved. Pp. 106–107 supply group means, assumed labor/support/cleanup/platform inputs, use rates, scenarios, and limits. General formulas and table labels need the repairs above. |
| Precise legal assertions unsupported inside the text | Editorially repaired. P. 32 attributes the timeline to C8 and requires counsel to check current legal text. Pp. 127–128 disclose unavailable legal bodies and give retrieval URLs. External accuracy of dates, C7's identity, and links remains unverified by this review. |
| Next gate omitted date and duration | Resolved. P. 112 gives a ten-working-day decision, four-week frozen repair period, weekly review, and next-working-day decision afterward. |
| Missing model handoff answer | Resolved. P. 114 gives owners, artifacts, demonstrations, due points, cadence, and conditions keeping handoff open. Vendor deletion timing still needs clarification above. |
| Opportunity labels lacked definitions and evidence rationale | Resolved for this qualitative screen. Pp. 17–18 define High/Medium/Low/Unknown, prohibit summing them, and give a worked rating rationale and conventional alternative. |
| Evidence ledger and risk records lacked usable worked structure | Resolved. P. 49 links stable IDs and supplies E-14, E-41, and R-07 worked records connecting evidence, limits, controls, ownership, and decisions. |
| Unspecified companions carried minimum instruction | Substantially resolved. P. 58 identifies authors/editions and includes the minimum evaluation procedure. Retrieval location remains Low. |
| Sources only said “View source” | Resolved in manuscript content. Pp. 128–130 show source URLs. Actual PDF hyperlink destinations and external accessibility were not tested. |
| Missing technical definitions | Resolved. P. 124 defines slice, grader, ground truth, lineage, idempotency, reconciliation, and source-to-sink policy, with concrete examples where useful. |
| “ONE PAGE” worksheet occupied two pages | Resolved. Pp. 108–109 call it a decision worksheet. |
| “Participation is not a veto theater” | Resolved. P. 65 says “State which decisions people can influence.” |

## Arithmetic and cohort checks

- 318 assisted + 294 current-workflow = 612; 318 used + 124 fallback = 442 available; 124 fallback + 170 without access = 294 current-workflow. Self-selection is explicitly disclosed.
- 242/318 = 76.1%; 185/294 = 62.9%; 298/318 = 93.7%; 57/318 = 17.9%; 318/442 = 71.9%; 168/200 = 84%.
- Citation numerators 89 + 392 + 65 = 546; denominators 100 + 400 + 65 = 565; 546/565 = 96.6%. Clustering within drafts is disclosed.
- Rework 76/318 and 109/294 reconciles with the corresponding first-review counts.
- Scenario capacity and cost arithmetic is correct: low -$1,334.40/month; expected -$201.51/month after rounding; high $1,834.60/month. The added-queue capacity value is $2,216.16/month; 56 ownership/support hours × $45 = $2,520/month.
- The rule-of-three arithmetic 3/74 ≈ 4.1% is correct, but its interpretation needs the Low repair above.

The manuscript clearly separates invented Harborline numbers and author-created sequence/templates from external sources, and labels unavailable source bodies. Those distinctions improve reader trust without establishing external factual correctness. A separate source and PDF review remains necessary for publication approval.

## Final focused recheck — October 1, 2026

Re-read the seven revised passages, the Chapter 11 decision snapshot, the full capstone cohort/results/gates/incident/ownership/economics packet, and the answer-key recommendation and handoff. This focused disposition supersedes the seven open findings above; their earlier wording is retained as review history.

| Finding | Final disposition and manuscript evidence |
| --- | --- |
| General capacity formula | Resolved. Chapter 11 p. 83, lines 3157–3161, and Appendix D p. 122, lines 4631–4635, now use available eligible units × use rate × mean net minutes ÷ 60. Both say to omit the use-rate multiplier when volume already counts uses; median gaps are explicitly excluded. Chapter 11 states that observational differences do not prove causal savings. |
| Monthly scenario label | Resolved. Capstone p. 107, line 4044, labels the net column “NET/MONTH, YEAR 1.” The surrounding formula and answer key retain the capacity-value and cash-savings distinction. |
| Vendor deletion deadline | Resolved. Next gate p. 113, line 4262, requires deletion evidence and provider-change rehearsal; the Vendor handoff row p. 114, lines 4316–4317, is now due “Before repair exposure.” |
| Adoption attribution and trust label | Resolved. Incident table p. 105, lines 3974–3976, uses “Eligible use” and retains the denominator/period limitation. Chapter 11 p. 84 and answer key p. 111, lines 4186–4188, explicitly limit attribution of higher later-candidate use. |
| Rule-of-three detour | Resolved by removal. P. 104 retains the important statement that selected safety challenges do not estimate production prevalence and that the zero count must remain with its selection limits. |
| Partial cost mislabeled full cost | Resolved. Frozen results p. 103, lines 3904–3906, now label the figure “Platform cost” and refer readers to the additional costs in the worked model. |
| Companion retrieval locations | Resolved in text. Chapter 8 p. 58, lines 2315–2328, prints handbooks.mikelong.ai/ai-evaluation/ and handbooks.mikelong.ai/production-ai-engineering/, retains author/edition information, and supplies the minimum independent procedure. The destinations were not opened or verified. |

The cohort arithmetic remains coherent: 318 assisted + 294 current-workflow = 612; 318 used + 124 fallback = 442 available; 124 fallback + 170 without access = 294 current-workflow. The final 200 available requests are identified as a subset. HSP-0.7 incident exposure remains separate from the frozen HSP-0.8 cohort. Audits, citation slice sums, use percentages, and rework counts still reconcile.

The worked economics remain correct on a monthly basis: low -$1,334.40, expected -$201.51 after rounding, high $1,834.60. The added-queue capacity value remains $2,216.16/month against $2,520/month in ownership/support cost before other costs. Observed group means are distinguished from planning assumptions and from the median gap; no causal saving or realized cash saving is claimed.

Chapter 11 and the answer key consistently recommend bounded repair within the current two queues, conditional on funding and owner authorization. The failed contract floor, incomplete protected outcomes, negative expected capacity-value case, and open controls keep expansion on hold. The dated gate, stop authority, four-week frozen repair period, and demonstrated handoff requirements remain consistent with that recommendation.

**Final reader disposition:** No remaining actionable High, Medium, or Low contradiction was found in this focused recheck. All seven requested repairs are resolved in manuscript content. This disposition does not establish external factual accuracy, URL availability, PDF hyperlink behavior, layout quality, or publication approval.
