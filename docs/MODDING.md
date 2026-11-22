# Battle for America — Modding Guide (Phases 1–3)

Battle for America uses **declarative JSON + PNG mod packs**—no executable JavaScript is loaded from mod folders.

## Quick Start (Starter Template)
Copy `mods-template/starter-mod/` into your local mods folder (or click **Mods → Create Example Mod** on the setup screen):
- **Windows:** `%APPDATA%/battle-for-america-2028/mods/<mod-id>/`
- **macOS:** `~/Library/Application Support/battle-for-america-2028/mods/<mod-id>/`
- **Linux:** `~/.config/battle-for-america-2028/mods/<mod-id>/`

## Mod Folder Structure
```text
mods/
  my-mod-id/
    manifest.json        # Required
    candidates.json      # Optional: add, patch, or remove candidates
    ratings.json         # Optional: debate, speech, rally, corruption (1–20)
    states.json          # Optional: patch state leans, EVs, names, or regions
    scenarios.json       # Optional: add custom scenario presets
    runningMates.json    # Optional: add, patch, or remove DEM/REP running mates
    events.json          # Optional: add, patch, or remove decision events
    news.json            # Optional: add, patch, or remove national & world news
    debates.json         # Optional: add, patch, or remove debates/questions
    issues.json          # Optional: add, patch, or remove platform issues
    preview.png          # Optional: Steam Workshop thumbnail
    assets/
      portraits/         # Optional: 96x96 PNG portraits referenced as "assets/portraits/name.png"
```

## Validating, Packing & Sharing Mods (CLI)
Validate any mod folder before sharing or uploading:
```bash
npm run mod:validate -- mods-template/starter-mod
```

Pack a mod folder into a single shareable `.bfa-mod.json` file (for itch.io, Discord, or browser import):
```bash
npm run mod:validate -- mods-template/starter-mod --pack starter-mod.bfa-mod.json
```

## Steam Workshop Distribution (Phase 3)
1. **Auto-discovery for players:** In the desktop app, open **Mods → Steam Workshop**, enter the game's numeric Steam AppID (or set `BFA_STEAM_APP_ID` / `BFA_STEAM_WORKSHOP_DIR`), and click **Save & Scan Workshop**. Subscribed items under `steamapps/workshop/content/<appId>/<publishedFileId>/` are automatically discovered, validated, and served over the sandboxed `bfa-mod://` protocol.
2. **Uploading a mod via SteamCMD:** Generate a ready-to-use `workshop_build.vdf` either by clicking the cloud icon on any local mod in the Mod Manager or via CLI:
   ```bash
   npm run mod:validate -- mods-template/starter-mod --vdf --appid <YOUR_STEAM_APP_ID> --note "Initial release"
   steamcmd +login <steam_user> +workshop_build_item "<path/to/workshop_build.vdf>" +quit
   ```

## Validation & Quarantine
Every mod (local, browser-imported, or Steam Workshop) is validated at load time by `src/lib/modSchema.js`. Invalid JSON, unknown state abbreviations, out-of-range ratings, invalid debate weeks, or unsafe portrait paths (`..`) quarantine only that mod and display the exact field errors in the Mod Manager without crashing the game.
