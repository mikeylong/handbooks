# Tracked-link map

Status: query strings ready for destination substitution; every resulting URL remains unapproved until tested  
Source register: [utm-register.csv](./utm-register.csv)

## Rules

- Replace `{PUBLIC_SAMPLE_URL}` only with the approved, ungated public sample URL.
- `https://surfaces.systems` is **PROVISIONAL** and is not inserted into these links automatically.
- Confirm the destination has no existing query string before using `?`; use `&` only when a reviewed public parameter must remain.
- Open each final link in a private browser session and confirm there is no redirect to login, email capture, Checkout, or a private file.
- Never add a name, email, LinkedIn identifier, Reddit username, Stripe ID, Clerk ID, or other personal/provider data to a UTM value.
- Never put UTMs on the authenticated account route, Stripe Checkout URL, private Blob URL, or signed download link.
- Use the direct owned URL. Do not shorten community links.
- Campaign values distinguish organic, paid, community, and one-to-one distribution; the canonical analytics `source.channel` remains the normalized value in the register.

## Link substitutions

### Founding outreach

`{LIDM_SAMPLE_URL}`

```text
{PUBLIC_SAMPLE_URL}?utm_source=linkedin&utm_medium=direct_message&utm_campaign=founding_cohort_2026_08&utm_content=founding_invite_a&utm_id=FOUNDER-01
```

`{EMAIL_FOUNDING_SAMPLE_URL}`

```text
{PUBLIC_SAMPLE_URL}?utm_source=email&utm_medium=one_to_one&utm_campaign=founding_cohort_2026_08&utm_content=founding_invite_a&utm_id=FOUNDER-01
```

### LinkedIn organic

`{LI01_SAMPLE_URL}`

```text
{PUBLIC_SAMPLE_URL}?utm_source=linkedin&utm_medium=organic_social&utm_campaign=whole_system_2026_08&utm_content=text_post_a&utm_id=LI-O-01
```

`{LI02_SAMPLE_URL}`

```text
{PUBLIC_SAMPLE_URL}?utm_source=linkedin&utm_medium=organic_social&utm_campaign=release_questions_2026_09&utm_content=text_post_a&utm_id=LI-O-02
```

`{LI03_SAMPLE_URL}` — held until `LI-O-04` is approved

```text
{PUBLIC_SAMPLE_URL}?utm_source=linkedin&utm_medium=organic_social&utm_campaign=maintenance_process_2026_09&utm_content=text_post_a&utm_id=LI-O-04
```

`{LI04_SAMPLE_URL}` — held until `LI-O-05` is approved

```text
{PUBLIC_SAMPLE_URL}?utm_source=linkedin&utm_medium=organic_social&utm_campaign=workflow_cost_2026_09&utm_content=text_post_a&utm_id=LI-O-05
```

`{LIDOC_SAMPLE_URL}`

```text
{PUBLIC_SAMPLE_URL}?utm_source=linkedin&utm_medium=organic_social&utm_campaign=release_questions_2026_09&utm_content=native_document_a&utm_id=LI-O-03
```

### Owned article

`{OWNED_ARTICLE_SAMPLE_URL}`

```text
{PUBLIC_SAMPLE_URL}?utm_source=owned&utm_medium=owned_content&utm_campaign=whole_system_2026_09&utm_content=article_a&utm_id=OWN-01
```

### Reddit and practitioner communities — held

`{COMMUNITY_SAMPLE_URL}` for the then-current approved `r/devops` thread:

```text
{PUBLIC_SAMPLE_URL}?utm_source=reddit&utm_medium=community&utm_campaign=release_questions_2026_09&utm_content=devops_promotion_thread_a&utm_id=RED-O-01
```

`{COMMUNITY_SAMPLE_URL}` for the then-current approved `r/MachineLearning` thread:

```text
{PUBLIC_SAMPLE_URL}?utm_source=reddit&utm_medium=community&utm_campaign=release_questions_2026_09&utm_content=machine_learning_promotion_thread_a&utm_id=RED-O-01
```

`{DTC_SAMPLE_URL}`:

```text
{PUBLIC_SAMPLE_URL}?utm_source=datatalks&utm_medium=community&utm_campaign=release_questions_2026_09&utm_content=approved_channel_a&utm_id=DTC-01
```

`{MLOPSCOMM_SAMPLE_URL}`:

```text
{PUBLIC_SAMPLE_URL}?utm_source=mlops_community&utm_medium=community&utm_campaign=release_questions_2026_09&utm_content=requested_sample_a&utm_id=COM-01
```

### Hacker News — held

`{HN_SAMPLE_URL}`

```text
{PUBLIC_SAMPLE_URL}?utm_source=hacker_news&utm_medium=community&utm_campaign=whole_system_2026_09&utm_content=show_hn_a&utm_id=HN-01
```

If the tracking query weakens trust or changes the artifact HN receives, use the clean canonical sample URL and classify the resulting source from the referrer host. A clean public artifact takes precedence over perfect attribution.

### Consented email and referral — held

`{EMAIL_EXCERPT_SAMPLE_URL}`

```text
{PUBLIC_SAMPLE_URL}?utm_source=email&utm_medium=email&utm_campaign=release_questions_2026_09&utm_content=free_excerpt_a&utm_id=EMAIL-01
```

`{REFERRAL_SAMPLE_URL}`

```text
{PUBLIC_SAMPLE_URL}?utm_source=referral&utm_medium=referral&utm_campaign=subscriber_sample_share_2026_09&utm_content=subscriber_note_a&utm_id=REF-01
```

## Final URL test record

```text
Link ID:
Final public destination:
Expected query values:
Private-window result:
Mobile result:
Redirect chain:
Sample ungated:
Offer visible and $5/month correct:
No private route or token exposed:
Canonical analytics source mapping:
Approved by:
Approved at:
```

