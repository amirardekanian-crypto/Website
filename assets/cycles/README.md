# Cycle banner images

Each athlete cycle card on the plan page (`program.html`) shows an image banner
at the top. The image is matched **by cycle name** — no JSON or code changes needed.

## How it works

For a cycle named `Load & Build`, drop a file here named **`load-build.jpg`**.
The page builds the filename by lowercasing the cycle name and turning every run
of non-letter/digit characters into a hyphen:

| Cycle name          | File to add            |
|---------------------|------------------------|
| `Foundation Forge`  | `foundation-forge.jpg` |
| `Load & Build`      | `load-build.jpg`       |
| `Power Translation` | `power-translation.jpg`|

The match is **case-insensitive**, so `FOUNDATION FORGE` and `Foundation Forge`
use the same file. Supported extensions, tried in order: `.jpg`, `.jpeg`,
`.png`, `.webp`. **If no file exists, the card falls back to the green gradient.**

Recommended: landscape image, ~1200×675 (16:9), photo will be cropped to fill.

## Filenames currently used across all athletes (38)

active-recovery, armor-maintain, armour-build, athlete-sculpt, competition-edge,
consolidate-elevate, court-carryover, court-ready-peak, court-transfer,
durability-build, foundation-forge, integrated-athlete, load-build, match-engine,
metabolic-override, metabolic-shift, peak-performance, peak-polish,
performance-peak, power-conversion, power-engine, power-platform, power-transfer,
power-translation, power-translator, race-ready, rebuild-reset, recomposition-peak,
resilience-engine, rotational-engine, shape-sustain, strength-engine,
strength-reclaim, structural-build, structural-strength, symmetry-engine,
the-reveal, volume-engine

> Regenerate this list anytime by scanning `data/*.json` for cycle names.
