# AI Product Design Curriculum Training Plan

Date: June 11, 2026

Source conversations:

- Rubric spine: https://chatgpt.com/s/t_6a2b0607676c8191a36353895570961b
- Cross-functional overlay: https://chatgpt.com/s/t_6a2b0638af288191969bf2cbb6fbddd8

## 1. Program Summary

This is an 8-week studio-based training plan for experienced product practitioners learning how to design, evaluate, and launch AI product capabilities.

The course is not a tool survey. The target is product-ready judgment: deciding whether AI should be used, designing around model uncertainty, testing usefulness and trust, managing risk, and making clear launch recommendations.

Default cohort: mixed teams of Designers, Engineers, and Product Managers.

Target outcome: each learner reaches Level 3, "product-ready," across most rubric dimensions, with optional Level 4 evidence in their strongest discipline.

## 2. Teaching Stance

The curriculum is built around transfer, not remediation. Learners already bring useful craft from product design, engineering, product management, industrial design, architecture, human factors, research, or operations. The job is to help them transfer that judgment into probabilistic, data-shaped, model-mediated product work.

The teaching model is studio-based:

- Learners work on one real or realistic workflow across all eight weeks.
- Every week produces a concrete artifact that feeds the capstone.
- Critique is cross-functional and evidence-based.
- Responsible AI is handled every week, not isolated in an ethics module.
- The shared language is common, but the proof of competence differs by role.

The curriculum should make one habit unavoidable: before designing the AI experience, learners must decide whether AI belongs in the workflow at all.

## 3. Cohort Model

Recommended format:

- Duration: 8 weeks
- Weekly live session: 2.5 to 3 hours
- Weekly async work: 2 to 4 hours
- Team structure: cross-functional pods of 3 to 5 people
- Capstone: one AI product capability for a real user workflow
- Final review: 12-minute presentation plus 18-minute critique

Recommended weekly rhythm:

1. Pre-work: short reading, precedent review, or critique prompt.
2. Studio opener: one framing lecture or worked example.
3. Method practice: apply the week method to a shared case.
4. Team work: apply the method to the capstone workflow.
5. Critique: role-specific feedback against the rubric.
6. Artifact delivery: submit a concrete artifact by the next session.

## 4. Learning Outcomes

By the end of the program, learners should be able to:

- Decide whether AI is appropriate for a product workflow.
- Compare AI and non-AI approaches against user value, feasibility, cost, and risk.
- Explain model, data, latency, cost, privacy, and evaluation constraints in product language.
- Design human-AI interactions that handle uncertainty, correction, feedback, fallback, override, and recovery.
- Prototype AI behavior beyond the happy path.
- Evaluate AI experiences for usefulness, task quality, trust calibration, overreliance, accessibility, reliability, and safety.
- Create a responsible AI risk register with mitigations, escalation paths, and launch guardrails.
- Make a clear ship, hold, revise, or kill recommendation.

## 5. Capstone Prompt

Design and validate an AI product capability for a real user workflow.

The final package must include:

- The user workflow and stakeholder context.
- The AI vs. non-AI decision.
- The proposed AI capability and interaction model.
- Model, data, and system assumptions.
- Prototype or test evidence appropriate to the learner's role.
- Evaluation plan and launch thresholds.
- Responsible AI risk register.
- Launch recommendation: ship, hold, revise, or kill.

The capstone should prove judgment, not just enthusiasm for AI.

## 6. Week-by-Week Training Plan

### Week 1: AI as Design Material

Primary output: AI capability and limitation map.

Purpose: help learners treat AI as a product material with grain, tolerances, failure modes, costs, and operating constraints.

Core topics:

- AI as probabilistic behavior, not deterministic UI logic.
- Common AI product patterns: suggest, classify, summarize, generate, recommend, assist, and act.
- Model limitations: hallucination, inconsistency, latency, cost, privacy, confidence, and drift.
- Transfer from prior disciplines: affordances, systems thinking, human factors, research, product strategy, and engineering constraints.

Studio activities:

- Deconstruct three AI product examples: one useful, one overfit to novelty, one risky.
- Map the "material properties" of AI for the chosen capstone workflow.
- Identify where uncertainty enters the user experience.

Role lenses:

- Designer: what uncertainty does to comprehension, trust, control, and recovery.
- Engineer: what uncertainty implies for architecture, data, latency, logging, and fallback.
- PM: what uncertainty does to value proposition, adoption, support, cost, and launch risk.

Artifact requirements:

- AI capability map: tasks AI might perform, required inputs, expected outputs, confidence needs, and failure modes.
- Limitation map: where AI should not act, where humans need control, and where a non-AI pattern may be better.
- First capstone workflow hypothesis.

Acceptance criteria:

- The map names concrete user tasks, not generic AI capabilities.
- At least three failure modes are tied to user consequences.
- The team can explain why AI may or may not belong in the workflow.

Suggested references:

- People + AI Guidebook: https://pair.withgoogle.com/
- Microsoft Guidelines for Human-AI Interaction: https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/

### Week 2: Opportunity Framing

Primary output: AI vs. non-AI decision record.

Purpose: build the discipline to kill weak AI ideas early.

Core topics:

- User needs vs. AI strengths.
- Workflow and stakeholder mapping.
- Automation vs. augmentation.
- Success criteria, reward functions, and launch assumptions.
- AI, rules, workflow change, human service, and conventional software alternatives.

Studio activities:

- Map the current activity system: actors, tasks, inputs, decisions, handoffs, exceptions, and support moments.
- Compare AI and non-AI interventions.
- Define what must be true for AI to be worth the added complexity.

Role lenses:

- Designer: where AI changes user mental models, control, and task flow.
- Engineer: whether the capability is technically plausible, supportable, observable, and cost-aware.
- PM: whether the opportunity connects to a real customer pain, business value, differentiation, and adoption path.

Artifact requirements:

- Opportunity brief.
- Workflow and stakeholder map.
- AI vs. non-AI decision record.
- Initial success and guardrail metrics.

Acceptance criteria:

- The decision record includes at least one credible non-AI alternative.
- The recommendation names trade-offs, not just benefits.
- The team identifies explicit kill criteria.

### Week 3: Model, Data, and System Fluency

Primary output: model/data assumptions canvas.

Purpose: make hidden dependencies visible before teams design around a fantasy system.

Core topics:

- Model behavior in plain language.
- Data availability, data rights, data freshness, data quality, and privacy.
- Evaluation basics: offline evals, user evals, regression checks, and launch thresholds.
- Latency, cost, integration, monitoring, and operational burden.
- System boundaries: what the AI can see, do, store, and explain.

Studio activities:

- Trace the data path from user input to AI output to user action.
- Identify what the model must know, infer, or retrieve.
- Turn model limitations into user-facing states and system requirements.

Role lenses:

- Designer: confidence states, constraints, explanations, and user-facing limits.
- Engineer: model selection, retrieval, APIs, permissions, logging, evals, and reliability.
- PM: build/buy/partner choice, cost model, dependency map, and launch criteria.

Artifact requirements:

- Model/data assumptions canvas.
- System boundary sketch.
- Open questions for engineering, data, legal, research, or policy partners.

Acceptance criteria:

- Assumptions are testable.
- Privacy and data rights are addressed.
- The artifact distinguishes known facts from guesses.

### Week 4: Human-AI Interaction Craft

Primary output: interaction flow with uncertainty, feedback, correction, and recovery.

Purpose: design the full experience, including the moments where AI is unsure, wrong, slow, unavailable, or inappropriate.

Core topics:

- Mental models and expectation setting.
- Onboarding and capability disclosure.
- Confidence, explanation, provenance, and uncertainty.
- User controls: accept, edit, dismiss, undo, retry, override, escalate, and report.
- Feedback loops and correction.
- Failure states, fallback paths, human review, and support experience.

Studio activities:

- Build the happy path, then break it.
- Identify every point where the user needs control or explanation.
- Review flows against trust calibration and overreliance risks.

Role lenses:

- Designer: interaction model, information architecture, state design, content, accessibility, and recovery.
- Engineer: streaming, retries, logging, feedback capture, provenance, permissions, and human review support.
- PM: experience fit, adoption, risk level, market expectation, and policy implications.

Artifact requirements:

- Human-AI interaction flow.
- Failure-mode screen set or state inventory.
- Feedback and correction model.

Acceptance criteria:

- The flow includes uncertainty, failure, and recovery states.
- The user can correct or reject AI behavior.
- The system's limitations are visible without overloading the user.

### Week 5: AI Prototyping and Experimentation

Primary output: role-appropriate prototype, spike, or concierge test.

Purpose: test the risky part before investing in the full product.

Core topics:

- Wizard-of-Oz prototypes.
- Prompt-based prototypes.
- Output simulation and variable responses.
- Thin-slice technical spikes.
- Concierge tests and workflow pilots.
- Testing latency, bad outputs, edge cases, and review loops.

Studio activities:

- Identify the riskiest assumption in the capstone.
- Choose the cheapest valid prototype for that risk.
- Run a structured critique of prototype fidelity: what it proves, what it fakes, and what it cannot tell us.

Role lenses:

- Designer: interactive prototype with variable outputs, failure states, and human review loops.
- Engineer: thin-slice technical prototype with representative model calls, latency, cost, logging, and reliability notes.
- PM: concierge test, workflow pilot, pricing/value test, internal dogfood plan, or customer discovery experiment.

Artifact requirements:

- Prototype or experiment plan.
- Evidence from at least one test, critique, or simulation.
- Revised assumptions based on what the prototype exposed.

Acceptance criteria:

- The prototype tests a named risk.
- The team states what evidence would change the decision.
- The prototype includes at least one non-happy-path scenario.

### Week 6: Research and Evaluation

Primary output: evaluation plan covering usefulness, reliability, trust, and risk.

Purpose: connect AI product quality to evidence.

Core topics:

- Research questions for AI products.
- Usability, task quality, comprehension, trust calibration, and overreliance.
- Model quality, error analysis, regression checks, and monitoring.
- Success metrics, guardrail metrics, launch thresholds, and post-launch learning.
- Accessibility and inclusivity in AI evaluation.

Studio activities:

- Convert the capstone assumptions into evaluation questions.
- Define metrics for user value, model behavior, risk, and business impact.
- Design a test plan that combines qualitative and quantitative evidence.

Role lenses:

- Designer: usability test, Wizard-of-Oz study, comprehension testing, trust and overreliance findings.
- Engineer: offline evals, test sets, regression checks, observability, and failure analysis.
- PM: success metrics, guardrails, experiment design, launch thresholds, and adoption hypotheses.

Artifact requirements:

- Evaluation plan.
- Test script or eval spec.
- Launch thresholds and guardrail metrics.

Acceptance criteria:

- The plan evaluates usefulness and harm, not only satisfaction.
- Metrics include both success and guardrail measures.
- The team can explain what result would trigger ship, hold, revise, or kill.

### Week 7: Responsible AI and Product Risk

Primary output: responsible AI risk register with mitigations and escalation paths.

Purpose: make safety and accountability concrete before launch.

Core topics:

- Stakeholder harm mapping.
- Bias, exclusion, privacy exposure, misinformation, unsafe reliance, manipulation, and automation surprise.
- Human oversight, appeal, consent, transparency, and data controls.
- Governance: policy alignment, monitoring, incident response, escalation, and decommissioning.
- NIST-style risk lifecycle thinking: govern, map, measure, and manage.

Studio activities:

- Map affected groups and misuse cases.
- Create a failure-mode and effects analysis for the capstone.
- Define mitigations, owners, monitoring, and escalation paths.

Role lenses:

- Designer: user-facing transparency, consent, control, recovery, accessibility, and harm-reduction patterns.
- Engineer: data handling, security, abuse prevention, system constraints, monitoring, and auditability.
- PM: risk appetite, policy alignment, approvals, stakeholder communication, and accountability.

Artifact requirements:

- Responsible AI risk register.
- Human review and escalation model.
- Monitoring and incident response assumptions.

Acceptance criteria:

- Every high-risk failure mode has an owner and mitigation.
- The team distinguishes prevent, detect, respond, and recover controls.
- The launch recommendation cannot ignore unresolved critical risks.

Suggested references:

- NIST AI Risk Management Framework: https://airc.nist.gov/airmf-resources/airmf/5-sec-core/
- UNESCO AI competency framework for students: https://www.unesco.org/en/articles/ai-competency-framework-students

### Week 8: Capstone Studio

Primary output: launch recommendation with role-specific evidence.

Purpose: force a clear product decision under uncertainty.

Core topics:

- Evidence synthesis.
- Product narrative and critique.
- Cross-functional trade-off framing.
- Launch readiness and operating model.
- Roadmap, monitoring, and trust repair.

Studio activities:

- Final capstone presentations.
- Cross-functional review panel.
- Rubric-based critique.
- Retrospective: what changed from week 1 to week 8.

Role lenses:

- Designer: experience quality, trust, correction, failure states, and critique narrative.
- Engineer: architecture, feasibility, evals, observability, privacy, and reliability.
- PM: customer value, MVP scope, rollout, metrics, governance, and roadmap.

Artifact requirements:

- Final capstone package.
- Launch recommendation: ship, hold, revise, or kill.
- Personal reflection: what the learner would do differently on a real product team.

Acceptance criteria:

- The recommendation is supported by evidence from the prior seven weeks.
- The team names unresolved risk and next decision points.
- The final review makes role-specific competence visible.

## 7. Required Artifact Set

Every learner or team must produce these shared artifacts:

| Artifact | Purpose |
|---|---|
| AI opportunity brief | Prevents AI-for-AI's-sake framing. |
| Workflow and stakeholder map | Grounds AI in a real human system. |
| AI vs. non-AI decision record | Forces explicit trade-offs. |
| Model/data assumptions canvas | Makes dependencies and unknowns visible. |
| Human-AI interaction flow | Shows how the experience handles uncertainty and control. |
| Failure-mode map | Designs beyond the happy path. |
| Evaluation plan | Connects product quality to evidence. |
| Responsible AI risk register | Makes harm, mitigation, and accountability concrete. |
| Launch recommendation | Forces a ship, hold, revise, or kill decision. |

Role-specific evidence:

| Role | Required Evidence |
|---|---|
| Designer | AI experience prototype, interaction model, failure states, trust/control patterns, critique narrative. |
| Engineer | Technical prototype or architecture, model/data assumptions, eval plan, observability plan, security/privacy notes, reliability trade-offs. |
| PM | Product brief, opportunity sizing, customer/user segmentation, MVP definition, success metrics, rollout plan, risk governance, roadmap recommendation. |

## 8. Assessment Model

Use one common rubric plus role-specific overlays.

| Dimension | Designer | Engineer | PM |
|---|---:|---:|---:|
| AI opportunity framing | 15% | 10% | 18% |
| Model/data/system fluency | 12% | 20% | 12% |
| Human-AI interaction craft | 20% | 10% | 10% |
| Research and evaluation | 15% | 18% | 15% |
| AI prototyping | 12% | 15% | 10% |
| Responsible AI/governance | 15% | 15% | 15% |
| Product lifecycle/adoption | 6% | 7% | 15% |
| Cross-functional critique | 5% | 5% | 5% |

Performance levels:

| Level | Description |
|---|---|
| Level 1: Foundation | Explains core ideas, recognizes obvious AI product risks, and translates prior discipline knowledge into AI vocabulary. |
| Level 2: Applied practice | Uses methods on scoped problems with guidance, prototypes simple AI interactions, and critiques with evidence. |
| Level 3: Product-ready | Independently frames, designs, prototypes, tests, and justifies an AI product experience with clear trade-offs. |
| Level 4: Lead-ready | Guides a team, defines standards, shapes strategy, manages risk, and creates reusable decision tools. |

Grading guidance:

- Designers should not be graded as engineers. They need enough technical fluency to design responsibly, but their strongest evidence is interaction quality, user control, failure handling, and research judgment.
- Engineers should not be graded on visual polish. They need to prove that the intended experience can be supported reliably, safely, and observably.
- PMs should not be graded only on storytelling. They need evidence of customer value, prioritization, risk appetite, rollout, metrics, and operating model.
- Everyone is accountable for opportunity framing, evaluation, responsible AI, and cross-functional communication.

## 9. Capstone Review Format

Recommended final presentation:

1. Problem and workflow: 90 seconds.
2. AI vs. non-AI decision: 2 minutes.
3. Proposed capability and interaction model: 2 minutes.
4. Prototype or experiment evidence: 2 minutes.
5. Evaluation and risk plan: 2 minutes.
6. Launch recommendation: 90 seconds.
7. Role-specific evidence: 2 minutes.

Recommended critique questions:

- Where does AI create real value in this workflow?
- What non-AI alternative was considered, and why was it rejected or deferred?
- What are the most important model, data, or system assumptions?
- How does the experience handle uncertainty, correction, and recovery?
- What evidence would change the launch recommendation?
- What risk remains unresolved, and who owns it?
- What happens after launch if quality, cost, trust, or policy conditions change?

## 10. Artifact Templates

### AI Opportunity Brief

Use this when framing the capstone.

| Field | Prompt |
|---|---|
| User workflow | What recurring activity is being improved? |
| Primary user | Who does the work today? |
| Current pain | Where does the workflow break, slow down, or create risk? |
| AI hypothesis | What could AI do that conventional software cannot do as well? |
| Non-AI alternative | What simpler product, workflow, rules, or service option could solve this? |
| Value | What improves for the user, business, or operating team? |
| Risk | What could go wrong if the AI is inaccurate, misused, or overtrusted? |
| Decision | Continue, revise, or kill the AI idea. |

### AI vs. Non-AI Decision Record

| Field | Prompt |
|---|---|
| Decision | Use AI, avoid AI, or continue testing. |
| Reason | Why this path is better than the alternative. |
| Alternatives considered | Non-AI workflow, rules, search, templates, human service, or other product approach. |
| Evidence | What is known from research, examples, prototype tests, or expert review. |
| Assumptions | What must be true for this decision to hold. |
| Kill criteria | What evidence would cause the team to stop or change direction. |
| Owner | Who is accountable for revisiting the decision. |

### Model/Data Assumptions Canvas

| Field | Prompt |
|---|---|
| Inputs | What information does the AI need? |
| Sources | Where does that information come from? |
| Rights and privacy | What can be stored, used, logged, or shared? |
| Output | What does the AI produce? |
| Quality bar | How accurate, complete, safe, or explainable must it be? |
| Evaluation | How will quality be measured before and after launch? |
| Constraints | Latency, cost, security, access, permissions, compliance, or availability. |
| Unknowns | What needs research, engineering validation, legal review, or policy review? |

### Failure-Mode Map

| Failure Mode | User Consequence | Severity | Detection | Mitigation | Owner |
|---|---|---:|---|---|---|
| Incorrect output | User makes the wrong decision | High | User report, eval, monitoring | Explanation, review, fallback | TBD |
| Missing context | AI gives generic or incomplete help | Medium | Task failure, feedback | Better inputs, retrieval, prompt constraints | TBD |
| Overreliance | User accepts weak output without review | High | Study findings, telemetry | Confidence cues, review steps, user controls | TBD |

### Evaluation Plan

| Field | Prompt |
|---|---|
| Research question | What must be learned? |
| Method | Usability test, Wizard-of-Oz, technical eval, pilot, survey, benchmark, or mixed method. |
| Participants or test data | Who or what is being tested? |
| Success metric | What evidence shows the capability works? |
| Guardrail metric | What evidence shows the capability is risky or harmful? |
| Launch threshold | What result is good enough to ship? |
| Decision rule | Ship, hold, revise, or kill based on results. |

### Responsible AI Risk Register

| Risk | Affected Group | Cause | Severity | Likelihood | Mitigation | Escalation |
|---|---|---|---:|---:|---|---|
| Biased or exclusionary output | Underrepresented users | Training data or workflow bias | High | Medium | Test with representative cases, add review path | Product and policy lead |
| Privacy exposure | Users or customers | Sensitive data in prompts or logs | High | Low | Data minimization, redaction, access controls | Security and legal |
| Unsafe reliance | Decision maker or end customer | AI appears more certain than it is | High | Medium | Confidence, provenance, review, override | Product owner |

### Launch Recommendation

| Field | Prompt |
|---|---|
| Recommendation | Ship, hold, revise, or kill. |
| Rationale | The evidence that supports the recommendation. |
| Remaining risk | What is unresolved and why it is acceptable or unacceptable. |
| Launch conditions | Required mitigations, metrics, controls, approvals, or rollout limits. |
| Monitoring plan | What will be watched after launch. |
| Next decision date | When the team revisits the recommendation. |

## 11. Facilitator Notes

Use the same workflow across all eight weeks. Switching projects each week will make the course feel like a methods sampler and will weaken transfer.

Keep critiques anchored to evidence. A useful critique names the issue, why it matters, and what the team should do next.

Do not let the class collapse into prompting tricks. Prompting can appear inside prototyping, but the curriculum target is AI product judgment.

Push teams to define non-AI alternatives early. If they cannot explain the simpler path, they are not ready to defend the AI path.

Make role differences explicit. The shared curriculum creates a common product language. The overlay protects each discipline's real craft.

## 12. Program Acceptance Check

The curriculum is working if, by the final review, learners can:

- Explain the workflow and user need without leaning on AI novelty.
- Defend the AI vs. non-AI decision.
- Describe model, data, and system assumptions in plain language.
- Show how the experience handles uncertainty, failure, correction, and recovery.
- Identify evaluation methods and launch thresholds.
- Name responsible AI risks, mitigations, owners, and escalation paths.
- Make a clear launch recommendation with evidence.

The curriculum is not working if final projects are only polished prompts, pretty screens, technical demos without user value, or product narratives without risk and evaluation.

