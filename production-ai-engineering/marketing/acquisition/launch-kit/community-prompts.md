# Reddit and practitioner-community participation prompts

Status: preparation prompts, not paste-ready posts  
Rule: Mike writes the final community text from direct knowledge after the same-day checklist passes

## Why these are prompts

Community participation should sound like the person who is actually participating and should reflect real experience. These prompts do not invent a customer, employer, project, incident, result, account history, or community relationship. A bracketed field such as `{REAL_EXAMPLE}` must be replaced with something true and appropriate to share, or the sentence must be removed.

Some current communities explicitly reject generated content. In those places, do not paste or lightly rewrite this material. Use the factual questions to help Mike write a fresh response himself.

## Universal contribution prompt — no product link

Use only when an existing discussion asks a question Mike can answer directly.

1. Restate the specific production problem in one sentence.
2. Name the failure boundary: authorization, context, retrieval, tool execution, termination, recovery, evaluation, observability, cost, or incident evidence.
3. Share one real constraint or example Mike is permitted to discuss: `{REAL_EXAMPLE_OR_NONE}`.
4. Give a complete, native checklist or diagnostic sequence.
5. State what the checklist does not prove.
6. Ask one concrete technical question that helps the original poster move forward.
7. Do not mention or link the handbook unless the thread and current rules clearly permit it and the disclosure is approved.

Useful closing question choices:

- “Which dependency can fail without stopping the whole workflow?”
- “What event would let you reconstruct the tool call after an incident?”
- “Which eval result actually blocks the release today?”
- “Does the authorization check happen when the plan is created or again when the tool executes?”
- “What does the user see when retrieval or the model is unavailable?”

Do not stack several questions. Choose the one that fits the discussion.

## `COMM-MLOPS-01` — `r/mlops` contribution

Current planning source: [`r/mlops` reopening note](https://www.reddit.com/r/mlops/comments/1t6e6he/rmlops_has_been_reopened/)  
Launch posture: participate first; no product link

Topic prompt: `What we need to preserve to reconstruct a tool-using LLM incident`

Mike's writing notes:

- Open with the exact failure described in the thread, not a general AI claim.
- Separate model input/output evidence from identity, policy decision, retrieval set, tool arguments, tool result, retry, termination, and final user-visible result.
- Add `{REAL_INCIDENT_OR_IMPLEMENTATION_DETAIL}` only if Mike can share it accurately and without exposing private information.
- Explain that an event log is useful only when identifiers and timestamps can connect the steps without storing raw secrets or unrestricted prompt content.
- End with one question about the original system's missing evidence.
- No handbook mention, CTA, or DM invitation.

Boundary: the current moderator post rejects AI-generated posts. Mike must write the final contribution himself.

## `COMM-MLOPS-02` — `r/mlops` architecture discussion

Topic prompt: `Where agent permission should be checked`

Mike's writing notes:

- Distinguish permission to request an action from permission to execute it.
- Ask whether identity, tenant, tool, resource, and argument constraints are evaluated at execution time.
- Include one real system pattern only if Mike has direct evidence he can share.
- Name termination and recovery behavior when permission fails midway through a workflow.
- Keep the response complete without an external link.

Boundary: do not state that a specific architecture is safe without threat-model and runtime evidence.

## `COMM-DEVOPS-01` — `r/devops` technical reply

Topic prompt: `Degraded behavior for AI dependencies`

Mike's writing notes:

- Start from the service behavior the user still needs when retrieval, a tool, or the model fails.
- Separate retryable provider failure from a permanent policy denial or invalid request.
- Suggest one clear degraded state, one operator signal, and one recovery path.
- Ask which failure the team's current SLO excludes or hides.
- Do not add the handbook link in a normal technical thread.

## `COMM-PROMO-01` — permitted self-promotion thread

Use only in the then-current designated promotion thread after the exact rules pass the same-day review. The current research pass found such threads in `r/devops` and `r/MachineLearning`, but that does not grant future permission. [`r/devops` example](https://www.reddit.com/r/devops/comments/1ve5h6c/weekly_self_promotion_thread/) · [`r/MachineLearning` example](https://www.reddit.com/r/MachineLearning/comments/1sa4rlx/d_selfpromotion_thread/)

Required facts for Mike's fresh comment:

- Creator disclosure: Mike wrote Production AI Engineering.
- Product: a maintained field guide for the system around the model.
- Useful free artifact: Sections 1–3, ungated.
- Paid terms: complete current PDF, material new editions while active, Tuesday field note, and archive for `$5/month`.
- Direct tracked sample URL: `{COMMUNITY_SAMPLE_URL}`. No shortener and no auto-subscribe link.
- One sentence naming why the material fits that specific community.
- One sentence inviting technical criticism, not votes, follows, DMs, or positive reviews.

Do not reuse identical wording across communities. If the community requires human-authored text, Mike writes it from a blank page using only these facts.

## `COMM-DTC-01` — DataTalks.Club technical conversation

Current planning source: [DataTalks.Club Slack guide](https://datatalks.club/docs/general/slack/)

Technical-channel prompt:

- Find an active question in the correct engineering, MLOps, or book-related channel.
- Answer the question completely inside Slack.
- Share one production review question or diagram only when it directly helps.
- Keep the product link out of technical channels unless a moderator or the current channel guidance explicitly permits it.

Promotion-channel prompt, only in the current designated channel:

- disclose that Mike wrote the guide;
- name the free sample before the paid offer;
- state `$5/month` plainly;
- use `{DTC_SAMPLE_URL}`;
- ask for criticism of one specific framework, not general promotion.

## `COMM-MLOPSCOMM-01` — MLOps Community participation

Current planning source: [MLOps Community 2.0](https://mlops.community/blog/mlops-community-2-0)  
Launch posture: practitioner conversation, no launch drop

Conversation starters Mike can use in an appropriate existing discussion:

- “Which eval result can stop a release in your current process?”
- “What does your team preserve so it can reconstruct an agent incident?”
- “Where do you separate model cost from end-to-end workflow cost?”
- “Which tool failure has a defined degraded path today?”

After someone answers, respond to their system. Do not pivot immediately to the handbook. Offer the sample only when someone asks for the framework or a moderator confirms that sharing it is appropriate.

## `COMM-DTC-AMA-01` — Book of the Week inquiry notes

Current planning source: [DataTalks.Club Book of the Week](https://datatalks.club/docs/activities/book-of-the-week/)

Mike's inquiry should cover:

- working title and one-sentence description;
- why production AI release questions fit the community;
- a proposed asynchronous discussion around identity, tool permissions, recovery, eval gates, and operating evidence;
- confirmation that Mike can answer throughout the scheduled period;
- willingness to follow the program's current copy/access expectations if accepted;
- one link to the ungated sample, only if the inquiry form permits it.

Do not claim the program is currently scheduling books. The official guide says it is not hosted regularly at present.

## Response prompts after criticism

Use these as thinking prompts, not stock replies:

- Identify the exact claim being challenged.
- Check the current handbook and primary source before responding.
- State whether the criticism changes the public sample, the paid guide, or only the explanation.
- Acknowledge a real limitation plainly.
- If evidence is missing, say the claim is not established and stop there.
- Do not defend the subscription when the useful response is to fix the artifact.

## Community no-go conditions

- No current rule or moderator evidence permits the planned action.
- The account exists mainly to promote the product or lacks the history the community expects.
- Mike cannot write the final text himself where human-authored content is required.
- The contribution depends on an invented persona, customer, incident, metric, or testimonial.
- The same content was removed, locked, or warned elsewhere.
- The destination gates the sample, hides the price, redirects unexpectedly, or exposes private content.
- The plan relies on unsolicited DMs, coordinated voting, engagement pods, or copied cross-posts.

