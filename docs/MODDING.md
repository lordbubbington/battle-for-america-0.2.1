# Battle for America — Phase 1 Modding Guide

Battle for America uses **declarative JSON + PNG mod packs**—no executable JavaScript is loaded from mod folders.

## Folder Location (Desktop / Electron)
Place each mod in its own subfolder inside `<userData>/mods/`:
- **Windows:** `%APPDATA%/battle-for-america-2028/mods/<mod-id>/`
- **macOS:** `~/Library/Application Support/battle-for-america-2028/mods/<mod-id>/`
- **Linux:** `~/.config/battle-for-america-2028/mods/<mod-id>/`

You can also click **Mods → Open Mods Folder** or **Create Example Mod** on the setup screen.

## Mod Folder Structure
```text
mods/
  my-mod-id/
    manifest.json        # Required
    candidates.json      # Optional: add, patch, or remove candidates
    ratings.json         # Optional: debate, speech, rally, corruption (1–20)
    states.json          # Optional: patch state leans, EVs, names, or regions
    scenarios.json       # Optional: add custom scenario presets
    assets/
      portraits/         # Optional: 96x96 PNG portraits referenced as "assets/portraits/name.png"
```

## File Schemas

### `manifest.json` (Required)
```json
{
  "id": "election-1992",
  "name": "1992 Election Pack",
  "version": "1.0.0",
  "author": "Your Name",
  "minGameVersion": "0.2.2",
  "mode": "patch",
  "description": "Adds 1992 nominees and state leans."
}
```

### `candidates.json` (Optional)
```json
{
  "add": [
    {
      "id": "clinton-92",
      "name": "Bill Clinton",
      "short": "Clinton",
      "state": "Arkansas",
      "title": "The Man from Hope",
      "party": "dem",
      "portrait": "assets/portraits/clinton.png",
      "nat": 2.0,
      "region": { "south": 4.0, "midwest": 2.0, "northeast": 1.0, "west": 1.5 }
    }
  ],
  "patch": {
    "harris": { "nat": -1.5 }
  },
  "remove": []
}
```

### `ratings.json` (Optional)
```json
{
  "clinton-92": { "debate": 16, "speech": 18, "rally": 17, "corruption": 14 }
}
```

### `states.json` (Optional)
```json
{
  "patch": {
    "AR": { "lean": 8.0 },
    "PA": { "lean": 2.5 }
  }
}
```

## Validation & Quarantine
Every mod is validated at load time by `src/lib/modSchema.js`. Invalid JSON, unknown state abbreviations, out-of-range ratings, or unsafe portrait paths (`..`) quarantine only that mod and display the exact error in the Mod Manager without crashing the game.
