# Hark

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Hark is the user's TypeScript/Next.js personal project, forked from Lurk. The user wants to reproduce the original functionality, finish the frontend, add their own features, and prepare résumé/presentation materials afterward. Presentation work is currently deferred.

The existing product turns a product URL into a profile and brief, finds relevant public Reddit/X conversations, judges their fit and intent, and lets the user inspect evidence before deciding what to do. It does not automatically post comments or send direct messages to prospects.

The confirmed next feature is manual cross-platform demand discovery: accept a product URL or a demand topic, search overseas English public content, and present Chinese demand-signal and pain-theme views. Reuse Reddit/X and add public web sources found through web search. This is approved scope for work after frontend completion, not an implemented capability. See [the confirmed scope](docs/specs/cross-platform-discovery.md).

## Users

The current deployment is a personal test workspace controlled by its existing Clerk owner. The repository's product audience is people seeking public conversations relevant to products they build or market. The next feature serves both people with an existing product seeking potential users and people investigating unmet needs in a field. Initial validation uses a public CapCut/video-editing case; no customer adoption or commercial positioning has been validated.

## Operating Context

Users sign in, select or create a project, inspect ranked conversations and their judgement reasons, filter results and manage handled states. Product profiles, sources, research, notification settings and read-only API access are separate existing surfaces. The user explicitly requested frontend design proposals for both the public homepage and authenticated workspace together.

## Capabilities and Constraints

- Existing stack: Next.js, TypeScript, React, Tailwind, Base UI, Lucide, Clerk and PostgreSQL. Keep the working fork and auth integration.
- Existing modules: Reddit/X leads, product profile/brief, sources/filters, competitor research, insights, Reddit SEO, usage, notifications, REST and MCP.
- Public test deployment uses Netlify and Neon. Paid calls and automatic notifications are deliberately disabled after bounded trials. Do not depict sample previews as currently running live scans.
- AnyAPI supplies data; models judge and analyse it. Provider calls can cost money. Self-hostable/open-source software is not a promise that data/model requests are free.
- Email and generic Webhook have been verified; Slack/Discord receipt and wallet OAuth remain unverified, and wallet work is deferred.
- Preserve existing URLs, project/owner isolation, queue behavior and stored records during visual work. Synthetic design content must be identified as examples.
- Product-wide localization is undecided. Existing application copy is English; the confirmed discovery extension will present Chinese explanations and summaries of English source content, preserving original quotes.

## Brand Commitments

The confirmed product name is Hark. Preserve the upstream MIT license and attribution. The installed design-taste-frontend and impeccable skills should guide the frontend work. The user requested a Lurk-inspired blue sky and white cloud homepage, light gradients, and richer feature controls. The user subsequently requested gradient headline typography and desktop/phone screen framing with an overall iPhone-inspired appearance, supplying a Lurk device-composition screenshot. On 2026-10-15 the user selected the current interactive draft's overall direction for real integration, requesting removal of the top prototype-only homepage/workspace switcher. Preserve that direction as the integration reference; implementation and public deployment remain separately verified work.

## Sequence

Recovery and isolated cloud retention verification are complete. Work proceeds through frontend, added features, then presentation. No new backend feature or paid scan is implied by a frontend concept.
