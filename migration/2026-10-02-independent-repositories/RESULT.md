# Independent handbook repositories

Completed 2026-10-02. Each of the six handbooks owns an independent GitHub repository. The collection root is outside Git.

| Repository | Visibility |
| --- | --- |
| https://github.com/mikeylong/production-ai-engineering-book | Public |
| https://github.com/mikeylong/ai-consulting-playbook | Public |
| https://github.com/mikeylong/ai-evaluation-field-guide | Public |
| https://github.com/mikeylong/claude-design-field-guide | Private |
| https://github.com/mikeylong/poisonous-mushrooms-handbook | Private |
| https://github.com/mikeylong/ai-product-design-handbook | Private |
| https://github.com/mikeylong/handbooks-site | Public |

Engineering cleanup: https://github.com/mikeylong/production-ai-engineering-book/pull/29
Merge: `1ac55ab66a10ba9a446bface1824cb292c52cee6`. Required CI passed and focused review completed without actionable findings.

Both live sites run handbooks-site commit `2d414d1e056a323b0dccbba6ce86f14d2b0c1c52`. Hosted CI passed for Consulting, Evaluation and the site. Browser validation passed 668 staged checks and final live link, theme, search, font and download checks. Public HTML, shared assets and approved PDF bytes match the tested output.

All seven local repos are clean on main, tracking origin/main with zero ahead/behind. Approved PDFs and source histories are preserved. Historical release pages point to the new canonical repositories while retaining their assets.

Full machine-readable evidence: [RESULT.json](RESULT.json).
