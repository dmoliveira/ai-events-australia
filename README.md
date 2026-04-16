# AI Events Australia — AI/ML, Data Science, Generative AI, and CS Events

[![Updated 2026](https://img.shields.io/badge/updated-2026-blue)](./docs/data/meta.json)
[![GitHub Pages Ready](https://img.shields.io/badge/GitHub%20Pages-ready-black)](./docs/)
[![Launch dataset](https://img.shields.io/badge/dataset-launch--seed-orange)](./docs/data/events.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

Curated directory of **AI, machine learning, data science, generative AI, and adjacent computer science events happening across Australia in 2026**, with a strong spotlight on **Melbourne** and **Sydney**.

Created by **[Diego Marinho](https://dmoliveira.github.io/my-cv-public/cv/human/)**.

## What this includes

- curated launch dataset of Australia-relevant AI/data/ML events
- event discovery focused on Melbourne and Sydney, with other capitals included
- city, topic, and upcoming-event views
- calendar-style browsing plus `.ics` export
- static site ready for **GitHub Pages** from `/docs`

## Open the site locally

Serve `/docs` locally because the site loads JSON with `fetch()`:

```bash
python3 -m http.server 8000 -d docs
```

## Rebuild derived data

```bash
python3 scripts/build_site.py
```
