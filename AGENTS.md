# Project Notes

## Project Context

This is a standalone, single-player Electron game. The campaign engine, map, event content, and saves are local. Keep the game playable without an account or network connection.

## Key Files

- `src/`: game UI, campaign engine, and content.
- `public/art/`: artwork shipped with the game.
- `electron/main.cjs`: desktop launcher.
- `README.md`: local setup, packaging, and release notes.

## Working Notes

- Keep changes focused on the requested game work and preserve existing conventions.
- Never commit local secrets or machine-specific configuration.
- Store game saves locally. Add online services only when explicitly requested.
- Run only the checks requested by the user; build when needed to produce a release package.
