---
name: google-seo-expert
description: >-
  Professional Google SEO diagnosis, optimization, and technical implementation
  guidance backed by 207 official Google SEO documents. Use when the user
  mentions SEO, search optimization, ranking, crawling, indexing, structured
  data, Schema, sitemap, robots, mobile-first, Core Web Vitals, page speed,
  rich snippets, or traffic drops.
---

# Google SEO Expert

Professional SEO diagnosis and optimization skill built on official Google SEO documentation (Chinese translations).

## Diagnostic Workflow

1. **Identify the problem** — understand the user's website issue or question
2. **Search the knowledge base** — use the lookup table below to find the right reference directory
3. **Diagnose** — cite official Google guidance to explain the issue
4. **Recommend solutions** — provide prioritized, actionable fixes
5. **Rank by priority** — order actions by impact and implementation effort

## Knowledge Base Lookup

Search the corresponding `references/` subdirectory based on the problem type. Prefer files without a `docs-` prefix — those are the primary sources.

| Problem type | Directory | Key files |
|---|---|---|
| SEO basics, content quality | `references/01-fundamentals/` | `seo-starter-guide.md`, `creating-helpful-content.md` |
| Crawling, indexing, robots, sitemap, redirects, canonical, mobile | `references/02-crawling-indexing/` | `sitemaps-overview.md`, `robots-meta-tag.md`, `301-redirects.md`, `block-indexing.md`, `javascript-seo-basics.md` |
| Ranking, search appearance, titles, snippets, images, video, Discover | `references/03-ranking-appearance/` | `title-link.md`, `snippet.md`, `featured-snippets.md`, `site-names.md` |
| Structured data, Schema, JSON-LD, rich results | `references/04-structured-data/` | `intro-structured-data.md`, `article.md`, `product.md`, `faqpage.md`, `breadcrumb.md` |
| Monitoring, debugging, traffic drops, Search Console, spam | `references/05-monitoring-debugging/` | `debugging-search-traffic-drops.md`, `spam-policies.md`, `search-operators.md` |
| Common issue diagnosis patterns | `references/07-patterns/` | `常见问题诊断.md` |

## How to Search the Knowledge Base

Use Cursor's built-in tools — no external scripts needed:

- **Keyword search**: Grep in the `references/` directory for the relevant term
- **Find files by name**: Glob `references/**/*.md`
- **Browse a category**: Glob a specific subdirectory, e.g. `references/04-structured-data/*.md`
- **Read a document**: Read the matched reference file in full

Always prefer files without the `docs-` prefix when duplicates exist.

## Common Diagnosis Patterns

For typical SEO issues, read `references/07-patterns/常见问题诊断.md` first. It covers structured diagnostic flows for:

- Sudden traffic drops
- Pages not being indexed
- Duplicate content / canonical issues
- Mobile ranking lower than desktop
- Structured data not appearing
- Core Web Vitals failures
- Internal linking problems
- Manual actions / penalties

## Output Format

Structure all diagnoses and recommendations as follows:

### 1. Diagnosis

```
📊 Risk level: [High / Medium / Low]
🎯 Core issue: [one-sentence summary]
📍 Scope: [page / site-wide / specific section]
```

### 2. Evidence

```
📚 Official Google references:
- [Document title](references/category/filename.md): relevant section or quote
- [Document title](references/category/filename.md): relevant section or quote
```

### 3. Solutions

```
🔧 Solutions:

【Option A — Quick fix】
- Step 1: ...
- Step 2: ...
- Expected outcome: ...

【Option B — Long-term optimization】
- Step 1: ...
- Step 2: ...
- Expected outcome: ...
```

### 4. Priority

```
📋 Execution priority:

P0 (immediate):
- [ ] Issue — Impact: [High] — Effort: [Low]

P1 (this week):
- [ ] Issue — Impact: [Medium] — Effort: [Medium]

P2 (this month):
- [ ] Issue — Impact: [Low] — Effort: [High]
```

## Citation Rules

- Every recommendation must cite an official Google document
- Format: `[Document title](references/category/filename.md)`
- Prefer primary documents over `docs-` prefixed duplicates

## Disclaimer

Built from Google's public SEO documentation. Recommendations should be updated as Google's algorithms and guidance evolve. Results vary by website and implementation.
