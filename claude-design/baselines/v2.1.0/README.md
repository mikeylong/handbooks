# Claude Design Field Guide

Explore, refine and hand off an interactive product design. Version 2.1.0, dated October 7, 2026, includes nine chapters, a guided Velori exercise, a Markdown edition and matching Daytime and Late night PDFs.

[Read online](https://handbooks.surfaces.systems/claude-design/) · [Edition and downloads](https://handbooks.surfaces.systems/claude-design/editions/v2.1.0/) · [Manuscript](./Claude_Design_Field_Guide_Source.md)

Start with Figma foundations and screens or an existing component library. In Claude Design, brief the task, compare directions, choose, refine, connect the journey and review it with people. Finish with a reviewed prototype and usable handoff. Continue into Claude Code or Figma when the next owner needs that deliverable.

The Velori shopper journey ends with Configure → Review → Add to cart → Cart confirmation. The cart contains the configured robot, its four choices and quantity one. Edit cart item restores the choices; adding again updates the item. Configure and Edit use Continue. Reset fixture restores the starting choices and returns to Configure. Payment and order submission stay outside the exercise.

Download the exercise and native Figma starter from the edition page. Unzip the exercise and open `answer-key/velori-review-prototype.html` to compare the completed journey after choosing a direction. Import the starter into your own Figma Drafts when needed. Use your own accounts and source copies; access to the author's private Claude Design system or Figma file is not required. Keep the completed answer key out of initial generation context.

The October 6 native trial checked system import, three alternatives, chat and comment corrections, retained choices, keyboard navigation, narrow layouts and a local-agent handoff. Direct editing reverted on Save; the guide records the chat fallback. A fresh same-account Figma import retained instances, text styles and variables. The continuation remains a static Review screen with no prototype wiring. The October 7 cart extension was implemented locally in the offline export; no new native trial or Figma cart frame is claimed. Human task review, Code implementation and real missing-resource recovery remain untested.

Earlier editions retain their approved PDF, sample and native-file bytes and download URLs. Version 2.0.0 source and release metadata are preserved in [baselines/v2.0.0](./baselines/v2.0.0/). The earlier React library remains in [samples/velori-store](./samples/velori-store/) as supporting material.

The book uses thin build adapters and the shared publishing toolkit. Set `HANDBOOK_PUBLISHING_TOOLKIT` when extracting the toolkit outside the collection. [PDF configuration](./pdf-config.json) records the manuscript and layout; [release evidence](./qa/v2.1.0/) records exact comparisons, artifact validation, visual review and publication approval.
