---
name: Hark
description: Cool paper, blue actions and a navy workspace, with a sky/cloud marketing expression.
colors:
  bg: "#f5f7fa"
  surface: "#fff"
  surface-2: "#edf2f7"
  border: "#e0e6ed"
  fg: "#172b3b"
  fg-muted: "#596b7b"
  primary: "#2458d5"
  primary-fg: "#fff"
  accent-soft: "#edf3ff"
  cyan-soft: "#e9f9fb"
  nav-bg: "#112b3d"
  nav-fg: "#edf4f8"
  nav-muted: "#b3c6d3"
  nav-line: "#314858"
  nav-hover: "#213e52"
  nav-selected: "#d9eaff"
  nav-selected-fg: "#172b3b"
  score-hot: "#247052"
  score-warm: "#8a5d0d"
  dark-bg: "#10212e"
  dark-surface: "#172837"
  dark-surface-2: "#213746"
  dark-border: "#314858"
  dark-fg: "#edf4f8"
  dark-fg-muted: "#a8bdcb"
  dark-primary: "#90b6ff"
  dark-primary-fg: "#13263d"
  dark-accent-soft: "#233d5e"
  dark-cyan-soft: "#193a43"
  dark-nav-bg: "#0b1b27"
  dark-nav-muted: "#b0c3d0"
  dark-nav-hover: "#193448"
  dark-score-hot: "#a0dbb9"
  dark-score-warm: "#f0c879"
typography:
  display:
    fontFamily: "Instrument Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "48px"
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Instrument Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "32px"
    lineHeight: 1.15
  title:
    fontFamily: "Instrument Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    lineHeight: 1.3
  body:
    fontFamily: "Instrument Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    lineHeight: 1.5
  small:
    fontFamily: "Instrument Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: 1.4
  label:
    fontFamily: "Instrument Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    fontSize: "12px"
    lineHeight: 1.4
  marketing-display:
    fontFamily: "Instrument Sans Variable, PingFang SC, sans-serif"
    fontSize: "clamp(44px, 5.3vw, 76px)"
    fontWeight: 620
    lineHeight: 1.07
    letterSpacing: "-0.04em"
rounded:
  control: "8px"
  card: "12px"
  frame: "20px"
  pill: "999px"
spacing:
  tight: "4px"
  control: "8px"
  compact: "16px"
  page: "32px"
  marketing: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-fg}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    textColor: "{colors.fg}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-destructive:
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-link:
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "40px"
  navigation-item:
    textColor: "{colors.nav-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "6px 8px"
  verdict-chip:
    textColor: "{colors.score-hot}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  stat-card:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.card}"
    padding: "16px"
---

# Design System: Hark

## Overview

**Creative North Star: "Sky/cloud stage and navy workspace"**

Hark pairs an airy public expression with a compact working application. Both use Instrument Sans, cool paper, clear blue actions, fine borders and rounded controls. The homepage carries the confirmed sky/cloud background, blue/violet/rose gradient lettering and computer/iPhone framing. The authenticated shell uses navy navigation and opaque content surfaces so conversations, reasons and controls remain readable.

This records the implemented homepage and shared workspace palette, header and rail. The homepage was integrated from the selected interactive code prototype; there is no approved raster composition or new shipping raster. Its composition and story remain in the [surface brief](.impeccable/surfaces/src-components-marketing-home-experience-tsx.md). Existing individual modules have layout smoke checks, not complete interaction acceptance. Cross-platform public-web discovery remains planned, and this record does not establish a public deployment.

**Key Characteristics:**

- Cool neutral content surfaces with blue actions and navy application navigation.
- Readable conversation evidence, compact controls and restrained mono metadata.
- Rounded, opaque working surfaces; atmospheric glass and hardware framing on the public homepage.
- Theme-aware semantic tones and visible keyboard focus.

## Colors

The palette combines cool paper and navy with blue action emphasis; green and amber communicate lead judgements.

### Primary

- **Action blue** (`primary`, `dark-primary`): actions, links, focus and selected controls. The foreground pair changes with the theme; the pale dark-theme blue uses dark ink.
- **Blue wash** (`accent-soft`, `dark-accent-soft`): selected content, text selection and quiet action context.

### Secondary

- **Cyan wash** (`cyan-soft`, `dark-cyan-soft`): the shared shell and header gradients, alongside the blue wash.
- **Navy navigation** (`nav-bg`, `dark-nav-bg`): the application rail, with its own foreground, muted, line and hover roles. Its selected item uses `nav-selected` and `nav-selected-fg` in both themes.
- **Strong green** (`score-hot`, `dark-score-hot`) and **good amber** (`score-warm`, `dark-score-warm`): judgement text and indicators. Cool judgements inherit muted text. Labels and fit dots carry meaning alongside color.

### Neutral

- **Cool ground** (`bg`, `dark-bg`): page ground behind content.
- **Opaque paper** (`surface`, `dark-surface`): conversation, form and menu surfaces.
- **Inset paper** (`surface-2`, `dark-surface-2`): secondary containers, statistics and quiet hover states.
- **Fine rule** (`border`, `dark-border`): surface boundaries and dividers.
- **Reading ink** (`fg`, `dark-fg`) and **supporting ink** (`fg-muted`, `dark-fg-muted`): content hierarchy. The rail uses its explicit navigation foreground roles instead.

The frontmatter lists light values and explicit `dark-` counterparts. In source, the dark theme overrides the same CSS custom properties under `data-theme="dark"`; unchanged navigation roles continue to inherit their light declarations. Homepage aliases resolve to the same shared palette for paper, ink, blue and green. Its sky, title gradients, cloud opacity and neutral device materials stay scoped in `home.css`. The categorical competitor-chart series and the pastel new-project illustrations remain local to those components.

**The Semantic Pair Rule.** Change a background and its intended foreground together. Solid green illustration badges use white in light mode and the dark page-ground foreground in dark mode; judgement text uses the semantic score tone on ordinary or selected surfaces.

## Typography

**Display Font:** Instrument Sans Variable, with the supplied sans-serif fallbacks.

**Body Font:** Instrument Sans Variable, shared with display. The homepage includes PingFang SC in its fallback stack.

**Label/Mono Font:** JetBrains Mono Variable, with monospace fallbacks.

**Character:** The variable sans keeps large public headlines and dense working screens related. Mono is reserved for compact metadata and technical material; the global scale does not impose a universal heading weight.

### Hierarchy

- **Display** (`display`): the shared application display size and tight line height.
- **Headline** (`headline`): application section headings.
- **Title** (`title`): subsection headings and compact content titles.
- **Body** (`body`): the default reading and control size.
- **Small** (`small`): secondary labels, captions and field hints.
- **Label** (`label`): verdict-chip text at the compact metadata size, retaining the reading sans.
- **Mono** (`mono`): compact metadata; the font-family utility is applied explicitly where needed.
- **Marketing display** (`marketing-display`): the larger public headline role. The homepage's observed responsive overrides are (64px) below (1120px), (54px) below (820px), and `clamp(34px, 9.5vw, 45px)` below (600px). These are surface rules, not the application's heading scale.

**The Evidence Hierarchy Rule.** Conversation titles and quoted evidence keep the reading sans. Use mono selectively for compact comparison or technical context; do not turn body copy into a data label.

## Layout

The application header stays at the top (58px). The rail is a self-scrolling column (232px), pinned below the header. Main content grows within the remaining width and retains `min-width: 0` so long evidence does not expand the entire page. The page gutter is (32px), changing to (16px) at (767px) and below. At the (768px) desktop threshold, navigation changes between a column and a mobile drawer; the drawer closes on navigation and Escape.

Controls and working containers use a compact rhythm of (4px), (8px), (16px) and related half steps. Statistics use (16px) internal padding and grow to (20px) at the desktop threshold. The shared shell does not impose one module layout: lists, detail panes, tables and forms keep their existing responsibilities.

The homepage has its own broader container (1264px maximum) with (40px) inline padding, reducing to (20px) on narrow screens. Its layout changes at (1120px), (820px) and (600px). Desktop and phone framing belongs to that surface; at the smallest breakpoint the desktop frame is hidden and the phone becomes the readable primary preview. The phone's content scroll region is keyboard focusable. Preserve this surface behavior without applying hardware frames or centered marketing layouts to ordinary application modules.

Research results retain native disclosure controls for all supporting original quotations and product requirements. A merged case is distinct from an observed-author count. Reused-source dates/expiry, unknown requirements and unreviewed history use explicit text within the existing evidence hierarchy; no new visual status is inferred from model confidence.

## Elevation & Depth

Working screens rely mainly on tonal layers and fine borders. The rail stays navy, content stays opaque, and the shell's blue/cyan wash is atmospheric ground. The homepage adds translucent navigation with blur (18px), CSS cloud layers and soft hardware shadows. Device depth and glass belong to those public presentation components, while selection and keyboard focus stay legible on their own.

### Shadow Vocabulary

- **Marketing action:** `0 3px 9px #1c61b524`, a restrained lift under the homepage gradient action.
- **Desktop hardware:** `0 28px 60px -24px #163f6760`, anchoring the laptop frame.
- **Phone hardware:** `0 22px 44px -16px #14293966`, separating the overlapping phone from the stage.
- **Feature frame:** `0 16px 30px -20px #183e5b66`, used for the homepage's framed module previews.
- **Control focus:** a muted three-pixel ring on the shared Button primitive; ordinary application focus uses the primary outline color with a three-pixel offset. Homepage interactive elements use a two-pixel blue outline with a four-pixel offset.

**The Opaque Evidence Rule.** Put real conversation reading and form controls on opaque semantic surfaces. Keep sky, clouds, glass and device shadows within the public presentation and existing illustrative components.

Motion is short and state-led: the shared transition duration is (150ms, ease), while homepage button color/background/shadow transitions use (160ms). Pressed buttons move down (1px). The homepage and shared shell suppress transitions and animation under reduced-motion preferences; retain those scoped overrides when extending either surface.

## Shapes

The shared radius family uses gently curved controls (`control`), roomier content containers (`card`) and larger frames (`frame`). Verdict chips and homepage CTA/feature controls use the pill radius. Fine one-pixel borders separate adjacent surfaces without heavy outlines.

The homepage deliberately uses larger local silhouettes: the sky stage is (30px) at wide sizes and (23px) below (600px), feature/closing containers are (24px), and hardware corners follow their laptop or iPhone outline. These local dimensions do not replace the shared radius family.

## Components

### Buttons

Compact application controls use the shared control radius, medium-weight (14px) text and a default height of (32px). Smaller (24px, 28px), larger (36px), and icon-only sizes are already available. Primary uses action blue with its paired foreground; outline uses a thin boundary and page ground; secondary uses inset paper; ghost removes the resting fill; link uses blue text and underline on hover. The destructive variant uses the existing Reddit/destructive semantic color with a translucent fill.

Primary hover reduces the fill to (80%) opacity. Outline and ghost hover use inset paper. Focus adds a muted boundary and three-pixel ring; invalid states use the destructive tone. Disabled buttons stop pointer interaction and reduce opacity to (50%). Applicable pressed buttons move down (1px). The secondary variant's existing unresolved hover aliases are drift, not a reusable hover rule.

Homepage actions use a separate pill treatment with a blue-to-cyan gradient, a minimum height of (46px) and stronger weight (600). Their hover becomes the scoped solid-blue hover tone. Header actions are smaller (38px); the foreground still follows the theme pair. Preserve the distinction between public CTA scale and compact working controls.

### Chips

Verdict chips are fine-bordered pills with (2px 8px) padding and compact mono-scale text. Strong/good/cool judgements map to semantic green/amber/muted tones. Their fit indicator is four small dots, while the words and explanatory title carry the judgement. They are informational, not controls. Synthetic homepage score badges are illustrations and do not redefine the real application's judgement language.

### Cards / Containers

Shared statistics use the card radius, inset-paper fill, a fine border and compact padding. Large tabular numbers sit between a muted label and optional caption. Conversation, field and menu surfaces use opaque paper. Preserve module-local layouts rather than wrapping every page in a new card.

### Inputs / Fields

Single-line fields are (40px) tall with (8px) inline padding, opaque paper, reading ink, a fine border and the shared control radius. Textareas use (8px) padding. Field labels and hints use the small, muted role with a (4px) gap. Application caret and focus outline use action blue. Native validation and disabled semantics remain attached to the actual control; do not infer additional field states from a visual sample.

### Navigation

The header carries the Hark audio-line mark and existing provider attribution at the left, with theme/account controls at the right. Its surface graduates from opaque paper to cyan wash. The navy rail groups existing destinations, preserving project context and count pills. Items use body text and the control radius; muted resting labels brighten on hover. The selected item uses a pale blue/cyan gradient with dark reading ink and an explicit current-page state in both themes. On mobile the menu trigger remains reachable above the drawer.

### Research monitoring and pain evidence

Daily-monitor conditions and the owner list use collapsed disclosures on the existing opaque paper surfaces. Run/lifetime costs and paused/configuration states sit beside controls. Demand cases and themes separate current workarounds from limitations, disclosing exact quotes/sources and honest missing or legacy extraction states. Preserve existing type, palette, evidence links and mobile stacking. No new visual world or raster assets.

### Public preview framing

The homepage's laptop and iPhone frames enclose actual DOM illustrations. Their synchronized selection changes the shown fit reason and quote; feature controls change the illustrated module. Each is clearly labelled synthetic/sample content and links into the real workspace. These are code-led examples, not screenshots of a live scan. Do not reuse their fixture state in the authenticated application. The removed prototype-only homepage/workspace switcher is not production navigation.

## Do's and Don'ts

### Do:

- **Do** use the semantic light/dark pairs and keep real conversation and form surfaces opaque.
- **Do** preserve Instrument Sans for reading and apply JetBrains Mono selectively to compact metadata or technical content.
- **Do** preserve the navy rail, reachable sticky header, project context and narrow-screen drawer behavior.
- **Do** keep keyboard focus visible and retain the existing reduced-motion and forced-color fallbacks.
- **Do** identify synthetic public previews and keep their fixture state separate from live workspace data.

### Don't:

- **Don't** extend homepage sky, glass, headline gradients or hardware framing into every application module.
- **Don't** add the prototype-only homepage/workspace switcher to production navigation.
- **Don't** represent planned public-web discovery, live scans or unverified module interactions as completed capabilities.
- **Don't** treat inherited uppercase rail group labels or unresolved secondary-button hover aliases as house-style rules.
