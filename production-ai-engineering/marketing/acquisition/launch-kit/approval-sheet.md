# Acquisition launch approval sheet

Status: all external actions start as `PENDING` or `HELD`  
Allowed decisions: `APPROVE ONCE`, `REVISE`, `HOLD`

An approval applies only to the exact copy, asset, destination, audience or community, account, date/time, and tracking values recorded with it. Editing any of those inputs requires a new approval.

## Launch-level decisions

| Decision | Current value | Status | Approver / time / evidence |
| --- | --- | --- | --- |
| Public publisher name | `Surfaces` | **PROVISIONAL / HOLD** | `{REQUIRED}` |
| Production site origin | `https://surfaces.systems` | **PROVISIONAL / HOLD** | `{REQUIRED}` |
| Support and reply-to | `hello@surfaces.systems` | **PROVISIONAL / HOLD** | `{REQUIRED}` |
| Public sample URL | `{PUBLIC_SAMPLE_URL}` | **HOLD** | `{REQUIRED}` |
| Offer URL | `{OFFER_URL}` | **HOLD** | `{REQUIRED}` |
| `$5/month` terms versus live Checkout | See approved-offer summary | **HOLD until tested** | `{REQUIRED}` |
| Complete-PDF privacy | No public bypass | **HOLD until tested** | `{REQUIRED}` |
| Consent/privacy/email footer | Qualified review and runtime proof | **HOLD** | `{REQUIRED}` |
| Six-week dates | 2026-08-17 through 2026-09-27 | **PENDING** | `{REQUIRED}` |
| Organic-first paid gate | Three verified organic activations, 100% access, first Tuesday note succeeds | **PENDING** | `{REQUIRED}` |

## Artifact decisions

| ID | Artifact | Intended use | Default status | Final decision record |
| --- | --- | --- | --- | --- |
| `LI-DM-01` | Founding LinkedIn invitation | Up to five approved existing relationships per wave | `PENDING` | `{recipient set + exact copy + approver + expiry}` |
| `LI-POST-01` | System-around-the-model post | LinkedIn organic | `PENDING` | `{exact copy + URL + time + approver}` |
| `LI-POST-02` | Seven release questions | LinkedIn organic | `PENDING` | `{exact copy + URL + time + approver}` |
| `LI-POST-03` | Maintenance process | LinkedIn organic later slot | `HELD` | `{experiment assignment + exact approval}` |
| `LI-POST-04` | Workflow cost | LinkedIn organic later slot | `HELD` | `{buyer-fit evidence + exact approval}` |
| `LI-DOC-01` | Three-page public teaser | LinkedIn native document | `PENDING` | `{file digest + copy + URL + approver}` |
| `OWN-ARTICLE-01` | Whole-system owned article | Public site | `PENDING` | `{source review + deployment approval}` |
| `COMM-MLOPS-01` | Incident-evidence contribution prompt | `r/mlops`, link-free | `HELD` | `{same-day rules + Mike-authored text}` |
| `COMM-PROMO-01` | Promotion-thread prompt | Exact permitted Reddit thread only | `HELD` | `{same-day rules + exact thread/text/link}` |
| `COMM-DTC-01` | DataTalks.Club participation | Exact approved channel | `HELD` | `{same-day rules + exact text/link}` |
| `COMM-MLOPSCOMM-01` | MLOps Community prompt | Practitioner discussion | `HELD` | `{same-day rules + exact action}` |
| `HN-SUBMISSION-01` | Show HN sample submission | Hacker News | `HELD` | `{eligibility + Mike-authored title/comments + time}` |
| `EMAIL-01` | One-to-one founding email | Approved existing relationship | `PENDING` | `{recipient + exact text/link + approver}` |
| `EMAIL-CONSENT-01` | Free-update verification | Explicit opt-in request only | `HELD` | `{consent flow + exact sender/footer approval}` |
| `EMAIL-02` | Free release-question excerpt | Verified free-update audience | `HELD` | `{frozen audience + copy/link + send approval}` |
| `EMAIL-03` | Non-incentivized sample referral | Eligible active subscribers | `HELD` | `{audience/classification/privacy + send approval}` |

## Artifact review questions

For each artifact, answer all applicable questions:

- [ ] Does it help the intended reader without requiring purchase?
- [ ] Does every factual claim match the current handbook or a current primary source?
- [ ] Does it avoid fabricated people, experience, incidents, results, metrics, quotes, and testimonials?
- [ ] Is the complete PDF still private?
- [ ] Is the public sample ungated and working?
- [ ] Is `$5/month` accurate everywhere the paid offer appears?
- [ ] Does the copy explain recurring value without implying a new PDF every week?
- [ ] Does it avoid a fixed page count and unsupported “always current,” “complete,” or readiness claims?
- [ ] Are the final identity, sender, destination, and support values confirmed rather than provisional?
- [ ] Does the exact tracked link contain no personal or provider data?
- [ ] Does the channel's same-day rule check pass?
- [ ] Is the external action itself authorized, with an expiry and one-time scope?

## One-time approval record

```text
Artifact ID:
Artifact digest:
Asset digest if applicable:
Final public destination:
Audience / community / exact thread:
Account:
Scheduled date and time:
Tracking link ID:
Rules check record:
Operational gate evidence:
Decision: APPROVE ONCE / REVISE / HOLD
Approver:
Approved at:
Approval expires at:
Result receipt location:
```

No unchecked box or blank field should be interpreted as approval.

