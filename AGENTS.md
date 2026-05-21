# TabulaRaza: Agentic Development Guide

This document provides system instructions and architectural guidelines for AI agents working on **TabulaRaza**, a GDPR/RODO Article 17 erasure request generator.

## Project Overview

**TabulaRaza** is a client-side privacy actuator. Its primary purpose is to help users issue formal "Right to Erasure" (opt-out) requests to data brokers.
- **Strictly Client-Side**: 100% zero-tracking architecture. No backend database for users, no external API calls for analytics, cookies, or tracking. Data is kept in `localStorage`.
- **Identity Module**: Users can sign in with Google or manually enter their details, which are populated into an email template.
- **Theme Constraints**: Deep charcoal grays, custom `var(--color-brand-*)` variables. "Cosmic Slate" aesthetic, hacker/cyberpunk undertones, but strictly clean layout.
- **Data Harvesters**: Directory of brokers loaded statically from `src/data/brokers.ts`.

## Tech Stack

- **React 19** + **Vite 6**
- **TypeScript** (strict mode enabled by default)
- **Tailwind CSS V4**
- **State Management**: Zustand (via `src/lib/store.ts` wrapped over `localStorage`)
- **Animations**: Framer Motion (`motion/react`)
- **Icons**: `lucide-react`
- **i18n**: Custom locale system under `src/locales/` (English and Polish `.ts` files and an index module for `getTranslation`).

## Architecture Details

1. **State / Context**:
   - `src/lib/store.ts` exports `useStore()`.
   - `profile.preferences.language` stores whether the user selected 'en' or 'pl'.
   - Auth is handled via a client-side Google OAuth hook (`src/lib/auth.ts`) which updates the store on success.

2. **Internationalization (i18n)**:
   - `src/locales/index.ts` exposes `getTranslation(lang)`.
   - Use `const t = getTranslation(currentLang);` inside components.
   - Text strings should not be hard-coded in components if they are meant to be translated. Add them to `src/locales/en.ts` and `src/locales/pl.ts`.

3. **Styling & Layout**:
   - **One Screen**: The entire app lives largely on one screen, split into a left column (directory search, context, policy) and a right column (composer area).
   - Brand Colors (in `index.css`):
     - `--color-brand-dark`: `#060709` (Background)
     - `--color-brand-surface`: `#0a0c10` (Card backgrounds)
     - `--color-brand-element`: `#1a1f26` (Borders, list items)
     - `--color-brand-primary`: `#52d1b8` (Main accent)
     - `--color-brand-glow`: `#63ffd7` (Hover/Highlight)
   - Layout strictly single-view or modal. Avoid multi-page routing like `react-router` unless specifically requested.

4. **Data Models**:
   - `src/types.ts`: Schema types derived from Schema.org principles where applicable.
   - Example schema: `SchemaOrganization` for brokers.

## Agent Guidelines

- **Adherence to Scope**: Only add features requested by the user. Do not implement unrequested backend integration (Firebase, PostgreSQL) as the app is "Zero Tracking" intentionally.
- **Styling**: Always use existing `var(--color-brand-*)` palette instead of generic Tailwind colors like `blue-500` or `indigo-600`.
- **Translations**: Before pushing any string into the UI, add the string and its translation to `src/locales/en.ts` and `src/locales/pl.ts`. Use literal business terms for Polish (e.g., "Wniosek o Usunięcie Danych" instead of "Żądanie Wykasowania").
- **External Links**: When displaying external links (like privacy policies), use the `<ExternalLink>` icon from `lucide-react`. Ensure proper padding on touch targets.
- **Tone & Voice**: Keep error messages and placeholders formal, slightly technical, but legally grounded (e.g., "Formal GDPR Article 17 Erasure Request" vs "Please delete my data").
