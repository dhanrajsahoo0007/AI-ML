---
# Copy this file to content/newsletter/<yyyy>/<slug>.mdx and fill it in. The loader reads only <yyyy>/*.mdx, so
# this file is never published. tests/unit/newsletter-template.test.ts keeps it valid against the schema and
# the deep-dive format. Reference issue: content/newsletter/2026/harness-engineering.mdx.
title: "One short, plain claim about the idea"
issue: 2 # the next number after the newest issue; no gaps
date: "2026-12-01" # quoted YYYY-MM-DD
summary: "One sentence, at most 200 characters: what the reader will understand by the end."
format: deep-dive
series: agent-engineering # optional; a key in content/newsletter/catalog.yaml
tags: [agents] # keys in content/newsletter/catalog.yaml
level: intro # intro | intermediate | advanced
# Pick a cover at /newsletter/covers on the dev server and paste its line here.
cover: { motif: constellation, palette: lagoon, seed: 1 }
takeaways: # 3–5 lines; the "In 30 seconds" box, the email, and carousel slide 2
  - "The one idea, in a sentence a newcomer can repeat."
  - "How it works, in a sentence."
  - "The most common mistake, and its fix."
related: # site articles to read next (paths must exist)
  - /ai-system-design/genai-system-design/harness-engineering
share:
  hook: "Two or three short sentences that make someone stop scrolling on LinkedIn." # optional; else the summary
access: free
status: draft
audience: all
---

<!--
How a deep dive reads (content-check warns when the shape drifts):
- A figure or callout at least every 350 words. A figure is a Markdown image whose source is
  asset:diagrams/svg/newsletter/<slug>/<figure>, drawn with the figure kit (content/newsletter/FIGURES.md). Add
  #steps for a figure that builds up in steps. The figures below are Issue #1's, as placeholders: replace them.
- Callouts: > [!NOTE] in plain English, > [!IMPORTANT] key idea, > [!WARNING] common trap, > [!TIP] try it.
- Short sentences (22 words on average at most), no jargon without a plain explanation, at most 4,000 words.
- Plain Markdown only: the same file becomes the web page and the email.
-->

## Why this matters

Two or three sentences built on a real situation the reader has seen. Why should they care today?

## The idea in plain English

An everyday analogy first, with no jargon. Then the hero figure: one picture that summarises the whole issue.

![What the hero figure shows](asset:diagrams/svg/newsletter/harness-engineering/model-plus-harness)

> [!NOTE]
> The idea in one or two plain sentences.

## How it works

Step by step. One `## How it works: <part>` section per part is fine. Show the main mechanism as a build-up figure.

![What the build-up figure shows](asset:diagrams/svg/newsletter/harness-engineering/agent-loop#steps)

Explain each step in a short paragraph.

![A second figure for the next part](asset:diagrams/svg/newsletter/harness-engineering/context-budget)

> [!IMPORTANT]
> The key idea of this part.

![A third figure](asset:diagrams/svg/newsletter/harness-engineering/verification-ladder#steps)

## A worked example

One concrete system, traced end to end, with a trace figure.

![The example, traced](asset:diagrams/svg/newsletter/harness-engineering/coding-agent-trace)

## What goes wrong

> [!WARNING]
> **The trap in a few words.** What happens, why, and the fix.

> [!WARNING]
> **A second trap.** What happens, why, and the fix.

## The bigger picture

Where the idea is heading and how it connects to other ideas on the site.

## Try it yourself

> [!TIP]
> One small exercise the reader can do in 15 minutes.

## Go deeper

- [A primary source, checked live](https://www.anthropic.com/engineering/building-effective-agents): one line on what it adds.
