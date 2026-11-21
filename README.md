# Battle for America 2028

Standalone desktop build of the single-player campaign game. The game rules, map, event data, save game, and encyclopedia are packaged locally. No account, server, or network connection is needed to play.

## Build 34.1

The rival uses the shared election forecast to choose its event response and select from five legal weekly schedules. Each comparison uses the same set of 16 election draws. The prototype scores the presidency and Congress. House forecasts cover all 435 districts using 314 reported 2026 results and 121 labeled 2024 fallbacks. Each district is measured against the national House vote of its source year.

## Build the desktop app

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run desktop:dev
```

Create distribution packages for the current platform:

```sh
npm run dist:win
npm run dist:linux
npm run dist:mac

# Steam depot folder (run on the target OS)
npm run steam:win
npm run steam:linux
```

Build one target on a matching host when possible. The Windows package includes an installer and a ZIP; Linux produces AppImage and DEB packages. Upload the unpacked application files from the build output as the Steam depot. The executable starts the game directly, with no separate launcher screen.

## Offline and saved data

The desktop app embeds the compiled game UI and local data. Fonts fall back to installed system fonts. Saved campaigns and encyclopedia edits use local browser storage inside the desktop app profile. They persist between launches on that computer. Steam Cloud is not configured yet; add a Steam Auto-Cloud mapping after choosing a cross-platform save location if cloud synchronization is desired.

## Steam readiness notes

- Single-player play is designed to work after install with the network disconnected.
- The app opens at 1280×800 and supports resizing; review text legibility at Steam Deck resolution (1280×800).
- This project currently uses mouse and keyboard oriented web controls. Steam Input can map the Deck trackpads to mouse input, but the game has not been given a complete native controller layout and should not be described as Deck Verified until the default controller configuration can reach all game actions.
- Steam's compatibility rating is assigned through Valve's review. Packaging alone does not guarantee a rating.
- Test the finished depot on a clean Windows machine and Steam Deck, including first launch offline, save/resume, aspect ratios, and controller navigation.

## License and store identity

Set the final developer/publisher identity, app icon, and store artwork before release. Review the rights and permissions for the game's name, candidate references, writing, and any third-party assets independently. See `docs/ARTWORK_PROVENANCE.md` and `docs/ARTWORK_MANIFEST.csv` for the retrospective record of the included AI-assisted art. This record documents the project's stated creation history and file hashes; it is not an independent rights clearance or a generation receipt.
