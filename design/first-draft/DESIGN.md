---
name: "Hark — first design draft"
description: "Provisional local sky-and-listening design extracted from code; not an approved production identity."
colors:
  paper: "#fff"
  ground: "#f5f7fa"
  line: "#e0e6ed"
  ink: "#172b3b"
  muted: "#596b7b"
  blue: "#2458d5"
  blue-soft: "#edf3ff"
  cyan-soft: "#e9f9fb"
  nav: "#112b3d"
  green: "#247052"
  green-soft: "#edf6f1"
  sky-top: "#9bd4f4"
  sky-bottom: "#edfaff"
  cloud: "#ffffffdc"
  dark-paper: "#172837"
  dark-ground: "#10212e"
  dark-line: "#314858"
  dark-ink: "#edf4f8"
  dark-muted: "#a8bdcb"
  dark-blue: "#90b6ff"
  dark-blue-soft: "#233d5e"
  dark-cyan-soft: "#193a43"
  dark-nav: "#0b1b27"
  dark-green: "#a0dbb9"
  dark-green-soft: "#203d32"
  dark-sky-top: "#173c59"
  dark-sky-bottom: "#142e41"
  dark-cloud: "#91c1df20"
typography:
  display:
    fontFamily: 'Instrument, "PingFang SC", sans-serif'
    fontSize: "clamp(40px, 4.5vw, 66px)"
    fontWeight: 580
    lineHeight: 1.08
    letterSpacing: "-0.04em"
  headline:
    fontFamily: 'Instrument, "PingFang SC", sans-serif'
    fontSize: "42px"
    fontWeight: 530
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: 'Instrument, "PingFang SC", sans-serif'
    fontSize: "23px"
    fontWeight: 570
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: 'Instrument, "PingFang SC", sans-serif'
    fontSize: "15px"
    lineHeight: 1.5
  reading:
    fontFamily: 'Instrument, "PingFang SC", sans-serif'
    fontSize: "14px"
    lineHeight: 1.8
  label:
    fontFamily: 'Instrument, "PingFang SC", sans-serif'
    fontSize: "14px"
    fontWeight: 600
  data:
    fontFamily: "JetBrains, monospace"
    fontSize: "13px"
    fontWeight: 500
rounded:
  tag: "5px"
  field: "7px"
  control: "8px"
  radius: "12px"
  stage: "18px"
spacing:
  tight: "8px"
  control-gap: "10px"
  group: "16px"
  inset: "20px"
  section-gap: "24px"
components:
  button-primary:
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "13px 19px"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-subtle:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "13px 19px"
  button-text:
    textColor: "{colors.blue}"
    typography: "{typography.label}"
    padding: "0"
  search-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "8px 10px"
  feature-filter:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 15px"
  fit-tag:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green}"
    rounded: "{rounded.tag}"
    padding: "4px 7px"
  evidence-surface:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.radius}"
  lead-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "16px"
---

# Design System: Hark — first design draft

## Overview

**Creative North Star: "Open sky, attentive listening (provisional)"**

This is a local code-first proposal, not an approved production identity. It records the implemented `app.tsx` and `style.css` within this directory only (source baseline `26d0368`). The user-confirmed direction is a Lurk-inspired blue sky, white clouds, subtle gradients, fuller homepage controls and a shared workspace. The metaphor above describes that direction; it does not establish a new brand name or commitment.

An airy sky introduces the product; cool paper carries conversations and their evidence. Navy navigation, blue actions, restrained green fit signals and the same type families connect the public and working surfaces. The prototype's logo, typography and replacement layout remain proposals. Surface composition belongs to the root surface brief; this document records reusable visual behavior.

**Key Characteristics:**

- Diffuse CSS clouds and bounded blue-to-cyan gradients.
- Opaque reading surfaces with compact, clearly selected controls.
- Instrument Sans for language; JetBrains Mono for fit measurements.
- Theme-aware color pairs and responsive list/detail navigation.

## Colors

Cool blues and white define the atmosphere; navy anchors navigation and green identifies fit information. Frontmatter values are the light palette and its explicit dark counterparts, rather than additional accents.

### Primary

- **Listening Blue:** actions, links, selected headings, focus outlines and the input caret.
- **Blue Mist / Cyan Mist:** selected rows, evidence callouts and bounded panel gradients.
- **Open Sky / Horizon / Cloud White:** decorative sky depth in the homepage stage. Cloud White includes source alpha; it is not a text surface.

### Secondary

- **Fit Green / Fit Wash:** fit scores, intent tags and confirmation details; keep these meanings distinct from blue selection.

### Neutral

- **Paper / Cool Ground:** opaque content panels and the surrounding canvas.
- **Ink / Muted Ink:** primary language and supporting metadata.
- **Divider:** quiet borders, row separators and themed scrollbars.
- **Navigation Navy:** persistent navigation; its supporting text remains a lighter blue-gray from the source stylesheet.

**The Bounded Gradient Rule.** Gradients remain bounded by sky stages, actions and supporting surfaces. Long conversation text stays on opaque paper; text itself is not gradient-filled.

Dark theme substitutes the matching dark tokens. The primary action uses a pale blue-to-cyan gradient with dark text; text selection pairs Ink with Blue Mist in both themes. Exact gradient recipes and hover colors remain in the component snippets and source stylesheet, since gradients are not color primitives.

## Typography

**Display Font:** Instrument Sans, self-hosted under the CSS family `Instrument`, with PingFang SC and sans-serif fallbacks.
**Body Font:** the same family.
**Label/Mono Font:** JetBrains Mono, self-hosted under `JetBrains`, with monospace fallback.

**Character:** a clear variable sans carries both open headlines and dense operating UI. The measured mono voice is reserved for numeric evidence. The hierarchy is role-based, not a uniform mathematical scale.

### Hierarchy

- **Display:** the frontmatter clamp and tight tracking carry the main homepage statement. Source breakpoints replace it with medium-screen and mobile sizes, ending at 42px on phones.
- **Headline:** section headings step down to 34px at the tablet breakpoint and 33px on phones.
- **Title:** conversation detail headings; workspace page headings use a separate 27px, weight 600 treatment.
- **Body:** general interface language. Homepage explanation uses a larger 17px, line-height 1.65 treatment on wide screens.
- **Reading:** conversation paragraphs use a 72ch maximum measure. Fit explanations use 12px with line-height 1.7 and the same measure; quoted evidence uses the reading size and line-height at weight 500.
- **Label:** action labels; small action variants use 13px. Compact metadata is contextual, not a universal body-text scale.
- **Data:** fit measurements; smaller row scores use 11px. Ordinary labels stay in the sans family.

**The Data Numeral Rule.** Mono communicates fit measurements and meaningful step numbers; prose and navigation keep the sans voice.

## Layout

The homepage wrapper has an outer maximum width of 1264px with 40px inline padding. Its padding becomes 28px at 1120px and 22px on phones. Groups use the recurring tight, group and section-gap values in frontmatter; section separation is deliberately larger than control spacing. Do not derive a new universal spacing scale from every one-off inset.

Wide homepage content uses paired columns. The main pair stacks at 820px; feature controls wrap, then form two columns at 600px. The feature container uses a more generous inset than its working controls. These are observed draft layouts, not a mandated page template.

The workspace uses a 208px navigation rail and a flexible main area. List/detail columns start at `minmax(260px, 0.85fr)` and `minmax(0, 1.25fr)`, separated by 18px. Above 1600px the rail becomes 220px and the detail pane gains space. Below 820px navigation becomes a drawer; below 600px the list and detail become successive views with a back control. Evidence measure stays bounded as panes widen.

## Elevation & Depth

Tonal layering and fine dividers provide everyday structure. Soft offset shadows lift primary actions, preview examples and the undo notice; ordinary evidence containers remain bordered and flat. The sky uses blurred radial CSS gradients for atmosphere, without placing blur on readable evidence.

### Shadow Vocabulary

- **Action lift:** a small offset shadow under primary actions; its exact source value is in the sidecar.
- **Undo lift:** a wider soft shadow separates the temporary status notice from the workspace.

**The Reading Surface Rule.** Conversation text and persistent action rows sit on opaque paper, even when surrounding workspace accents use gradients.

State transitions are short (0.16s). Evidence changes have one brief 0.18s ease-out reveal. Loading uses the existing spinner and skeleton; reduced-motion preference removes animation and transition and restores immediate scrolling.

## Shapes

Controls are gently rectangular; fields are slightly tighter, tags smaller and evidence containers roomier. The frontmatter records the repeated radii. Thin borders define the working containers. Small fit tags are compact rounded rectangles, not large pill panels. The homepage sky frame and large feature containers use broader corners; their responsive dimensions remain surface-specific.

## Components

### Buttons

Direct, compact actions. Primary buttons use the source accent gradient, with solid blue hover, a small soft shadow and a one-pixel press displacement. Standard buttons have a 46px minimum height; small actions use 38px. Dark actions invert Ink and Paper; subtle actions use Paper with a fine Divider border and a soft hover surface. Text actions carry blue sans labels and gain an underline on hover. Disabled buttons use reduced opacity. Keyboard focus is a 2px blue outline with 4px offset.

### Chips

Feature filters are bordered rectangular buttons. Selection combines Blue Mist, blue text and a blue border; it is also exposed as `aria-pressed`. Fit tags use Fit Green on Fit Wash and convey status rather than clickability. Do not give static tags button behavior.

### Cards / Containers

Evidence containers use Paper, a fine Divider border and the repeated container radius. Header, reading region and action row separate through padding and dividers. A fit verdict is a blue-to-cyan inset surface, followed by original conversation text on paper. Selected rows use a subtle blue-to-cyan fill and blue heading.

### Inputs / Fields

Search fields combine an inline drawn icon, Paper background and fine Divider stroke. Focus-within outlines the whole field in blue with a 2px offset. Placeholder, caret and entered text use the theme's Muted Ink, Blue and Ink. Native status and project selects retain their actual selection behavior. The prototype does not establish a validation-error field style.

### Navigation

Navy navigation uses light blue-gray labels and consistent line icons. The active item has a pale blue-to-cyan fill, dark blue text and a slightly stronger weight in both themes. Source controls use a compact segmented group with a paper selected segment. At the drawer breakpoint, the same navigation receives focus containment, Escape dismissal and focus return.

### Conversation Evidence

A source, title and fit score make rows scannable. The detail pane separates the reason for the match from the original request and highlighted quotation. Highlighted text keeps the Ink foreground on Blue Mist in either theme. Local sample disclosures identify illustrative data; they are not promotional badges or brand elements.

## Do's and Don'ts

### Do:

- **Do** keep long evidence on opaque paper with a bounded reading measure.
- **Do** carry blue selection, fit green and navy navigation across both surfaces.
- **Do** preserve themed focus, selection, caret and reduced-motion behavior.
- **Do** identify synthetic examples near the content they describe.

### Don't:

- **Don't** fill text with gradients or let cloud decoration reduce reading contrast.
- **Don't** present this local proposal's mark, font selection or layout as an approved Hark identity.
- **Don't** promote tiny preview metadata, decorative source glyphs or border-plus-shadow preview frames into reusable component defaults.
