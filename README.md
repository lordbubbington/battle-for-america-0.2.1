# Battle for America 2028

Standalone desktop political strategy game simulating the 2028 U.S. presidential and congressional elections. The game engine, map, event data, encyclopedia, save system, and modding pipeline are packaged locally—no account, server, or network connection is required to play.

## Features (v0.2.2)

- **Three campaign modes:** Two-Party, Four-Party (Democratic, Republican, Libertarian, Green), and Regional Parties (six playable regional parties plus four AI-only regional parties with 270 EV pooling and contingent-election rules).
- **Full-ballot coattail simulation:** Models all 50 states plus D.C. for the presidency alongside 34 Senate races, all 435 House districts, gubernatorial races, and state legislatures, with alternate House and Electoral College rules (MMP, proportional, district EV, and popular vote).
- **Adaptive AI opponent:** Evaluates weekly campaign schedules and event responses using a shared 16-draw Monte Carlo forecast.
- **Declarative JSON modding & Steam Workshop support:** Add, patch, or remove candidates, skill ratings, custom PNG portraits (`bfa-mod://`), states, scenarios, running mates, events, news, debates, and issues via JSON packs. See `docs/MODDING.md` and `mods-template/starter-mod/`.

## Development & Verification

Requires Node.js `20.19+` or `22.12+` and npm.

```sh
npm install
npm run desktop:dev
```

Run verification checks and mod validation:

```sh
npm run lint
npm run typecheck
npm run build
npm run mod:validate -- mods-template/starter-mod
```

## Packaging & Steam Depot

Create distribution packages for the current platform:

```sh
npm run dist:win
npm run dist:linux
npm run dist:mac

# Steam depot folder (run on the target OS)
npm run steam:win
npm run steam:linux
```

Build one target on a matching host when possible. The Windows target produces an NSIS installer and a ZIP; `npm run steam:win` produces the unpacked `win-unpacked` depot folder. The executable launches directly into the game with no separate launcher.

## Offline & Saved Data

Saved campaigns, encyclopedia notes, and mod load order persist locally in the desktop app profile between launches. Steam Cloud is not configured yet; add a Steam Auto-Cloud mapping after finalizing your cross-platform save path if cloud sync is desired.

## Steam Readiness Notes

- Single-player play works completely offline after install.
- Default window size is `1280x800` with resize support; verify legibility at Steam Deck resolution (`1280x800`) and common desktop resolutions (`1366x768`, `1920x1080`, `2560x1440`).
- Controls are mouse-and-keyboard oriented; do not market as Steam Deck Verified until a native controller layout covers all actions.
- Test the packaged Windows depot on a clean machine before publishing, including first launch offline, save/resume, and Mod Manager (`Open Mods Folder`, `Create Example Mod`, and `bfa-mod://` portraits).

## License & Store Identity

Set the final developer/publisher identity, Steam AppID, app icon, and store artwork before release. Review rights and permissions for the game name, candidate references, writing, and third-party assets independently. See `docs/ARTWORK_PROVENANCE.md` and `docs/ARTWORK_MANIFEST.csv` for the retrospective record of included AI-assisted art.
