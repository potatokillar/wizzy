# Wizzy Brand Assets

This directory is the canonical location for Wizzy logo files, app icons, and derived brand assets.

## Selected Direction

The current logo direction is:

- a minimal black-and-white abstract symbol
- paired with the `Wizzy` wordmark
- optimized for strong small-size recognition
- intended to feel calm, technical, and product-grade rather than decorative

The currently approved concept should be treated as the visual baseline for future cleanup and vectorization.

## Production Rule

Do not ship raw AI-generated preview images as final assets.

Before using the logo in product surfaces, replace preview renders with:

- clean vector exports
- transparent background PNG exports
- no watermark
- consistent spacing and alignment

## Directory Layout

Recommended asset layout:

- `assets/brand/logo-symbol.svg`
- `assets/brand/logo-horizontal.svg`
- `assets/brand/logo-dark.svg`
- `assets/brand/logo-light.svg`
- `assets/brand/logo-app-icon-1024.png`
- `assets/brand/logo-app-icon-512.png`
- `assets/brand/favicon.png`

If source design files are available, place them in:

- `assets/brand/source/`

## Naming Convention

Use these naming rules consistently:

- use lowercase file names
- use hyphen-separated names
- use `logo-` prefix for logo variants
- encode size only when size is part of the output contract

Examples:

- `logo-symbol.svg`
- `logo-horizontal.svg`
- `logo-dark.svg`
- `logo-app-icon-1024.png`

Avoid ambiguous names such as:

- `final-logo.png`
- `logo-new2.png`
- `wizzy最新版.svg`

## Usage Targets

Preferred usage by surface:

- `logo-symbol.*` for square app icon or avatar-like surfaces
- `logo-horizontal.*` for README, landing pages, docs, and headers
- `logo-dark.*` for dark backgrounds
- `logo-light.*` for light backgrounds
- `logo-app-icon-*` for packaged application assets

## Export Checklist

Every production-ready logo set should include:

- SVG vector files
- transparent PNG files
- dark-background variant
- light-background variant
- app icon exports at multiple sizes

Optional but recommended:

- monochrome symbol-only export
- clear-space and minimum-size note
- favicon-specific simplified export

## Notes For Future Web/App Integration

When web or app surfaces are added, consume brand assets from this directory instead of duplicating them into multiple feature folders.

If a framework needs copied build assets, treat those as generated outputs and keep the source-of-truth in `assets/brand/`.
