# Changelog — NookSpace

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha] - 2026-11-06

### Added
- Initialized Phase 0 Project Foundation with WXT 0.19, React 18 LTS, TypeScript, and Tailwind CSS.
- Configured multi-target build pipeline for Chromium MV3 and Firefox Desktop MV2/MV3 with Gecko ID `nookspace@local-dev`.
- Implemented `browserApi` abstraction service in `src/services/browser/` (Storage, Alarms, Notifications, Tabs, Runtime, and Offline Domain Monogram generator).
- Built foundational New Tab entrypoint with live digital clock, theme toggle (Dark/Light), and environment detection.
- Built background service worker in `entrypoints/background.ts` with alarm listener and desktop notification dispatch.
- Configured Vitest test harness with browser mocks and achieved 100% test pass on `tests/unit/browserApi.test.ts`.
- Verified clean production builds for Chromium (`.output/chrome-mv3`) and Firefox (`.output/firefox-mv2`).
