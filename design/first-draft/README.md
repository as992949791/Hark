# Hark interactive frontend draft

Local design reference for [issue 15](https://github.com/as992949791/Hark/issues/15), based on `v0.1.19-worker-recovery`. The user selected homepage + workspace together, code-first preview, then a reference-inspired sky/cloud background with subtle gradients and more feature controls. A subsequent user reference requests gradient headline lettering and computer/phone screen framing with an iPhone-inspired appearance. On 2026-10-15 the user selected this direction for real integration and requested removal of the top homepage/workspace switcher. This fixture draft remains separate from the authenticated Next.js application; real integration is tracked in [issue 16](https://github.com/as992949791/Hark/issues/16).

Run from the repository root after `npm ci`:

```sh
node design/first-draft/preview.mjs
```

Open [homepage](http://127.0.0.1:4173/#home) or [workspace](http://127.0.0.1:4173/#workspace). Override the port with `PORT=4174` if needed. Stop with Ctrl+C. The script bundles into ignored `.local/design-preview/`, binds only to loopback and serves an explicit asset allowlist. It does not load environment files or start the database, scheduler or main application. Restart it after editing the source, then refresh the browser.

The homepage centers gradient headline emphasis above a desktop/phone composition; on narrow screens it prioritizes the larger phone preview. Desktop and phone share the selected synthetic conversation. Phone content scrolls inside a labelled keyboard-focusable region.

The top homepage/workspace switcher has been removed. Open workspace through a homepage action and return through the workspace brand link; direct hashes also work. The remaining preview toolbar controls theme and workspace loading/empty/error states. Homepage feature buttons change illustrative panels. Lead selection, source/search/status filters, project switching, mark replied, hide and undo operate only on in-memory synthetic data. State resets on page reload or remount. Preview scan animates a local loading state; it never calls a provider. Research/alert previews are illustrative, and disabled workspace navigation is not connected in this draft.

Use desktop split view or mobile list/detail with Back to leads. The mobile menu supports Escape, focus containment and focus return. The stylesheet respects reduced motion. Main app routes, Clerk, stored data, provider configuration and public deployment are unchanged.

## References and direction

The upstream visual reference supplies the sky/cloud and product-framing reference; the repository's original marketing CSS informed the CSS-only cloud forms. Hark retains the upstream MIT attribution. Instrument Sans, JetBrains Mono and Lucide reuse installed dependencies. The prototype uses local fonts and no remote image or analytics assets. No new runtime dependency was added.

The homepage uses the installed design-taste-frontend skill and Impeccable; the workspace follows Impeccable's Operate guidance. [Reusable implementation prompts](../../docs/design/frontend-prompts.md) describe the proposed direction. The surface brief records user steering; the prototype-local DESIGN.md describes the implemented proposal, not an approved production identity.

Screenshots and raw operator logs stay under ignored `.local/design/`. See [acceptance](../../docs/acceptance/11-frontend-draft.md) for checks and integration limits.
