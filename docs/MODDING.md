# Battle for America — Modding Guide (Phase 1 + Phase 2)

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
    runningMates.json    # Optional: add, patch, or remove DEM/REP running mates
    events.json          # Optional: add, patch, or remove decision events
    news.json            # Optional: add, patch, or remove national & world news
    debates.json         # Optional: add, patch, or remove debates/questions
    issues.json          # Optional: add, patch, or remove platform issues
    assets/
      portraits/         # Optional: 96x96 PNG portraits referenced as "assets/portraits/name.png"
```

## Phase 1 Schemas

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

### `candidates.json`
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
  "patch": { "harris": { "nat": -1.5 } },
  "remove": []
}
```

### `ratings.json` & `states.json`
```json
{ "clinton-92": { "debate": 16, "speech": 18, "rally": 17, "corruption": 14 } }
```
```json
{ "patch": { "AR": { "lean": 8.0 }, "PA": { "lean": 2.5 } } }
```

## Phase 2 Schemas

### `runningMates.json`
```json
{
  "add": [
    {
      "id": "mod-mate-dem",
      "name": "Elena Morales",
      "short": "Morales",
      "party": "dem",
      "state": "Arizona",
      "stateAbbr": "AZ",
      "title": "Sun Belt Closer",
      "nat": 0.2,
      "region": { "west": 0.8 },
      "states": { "AZ": 2.0, "NV": 1.2 }
    }
  ]
}
```

### `events.json`
```json
{
  "add": [
    {
      "id": "mod-event-diner-stop",
      "title": "Viral Local Diner Stop",
      "tone": "hope",
      "icon": "megaphone",
      "text": "A spontaneous Q&A at a swing-state diner racks up 12 million views overnight.",
      "choices": [
        { "label": "Amplify it with an ad push", "effects": { "mom": 3, "funds": 4 } },
        { "label": "Stay focused on policy", "effects": { "mom": 2 } }
      ]
    }
  ]
}
```

### `news.json`
```json
{
  "national": {
    "add": [
      {
        "id": "mod-nat-clean-grid",
        "desk": "Economy",
        "headline": "Regional grid upgrade cuts utility bills across Midwest",
        "body": "Consumers report lower monthly energy bills heading into autumn.",
        "nat": 0.4,
        "issue": "energy"
      }
    ]
  },
  "world": {
    "add": [
      {
        "id": "mod-world-tech-plant",
        "headline": "A battery manufacturer announces two thousand new jobs",
        "issue": "economy",
        "lean": 1,
        "mag": 1.0,
        "tags": ["midwest", "purple"]
      }
    ]
  }
}
```

### `debates.json` & `issues.json`
```json
{
  "patch": {
    "debate1": { "title": "The Cost-of-Living Showdown" }
  }
}
```
```json
{
  "add": [
    {
      "id": "mod-space-policy",
      "label": "Space & orbital infrastructure",
      "weight": 4.5,
      "line": "Who leads commercial launch and lunar bases.",
      "options": [
        "Public NASA-led mission funding",
        "Public-private commercial partnerships",
        "Deregulate private launch corridors"
      ],
      "party": { "dem": 0, "rep": 2 }
    }
  ]
}
```

## Validation & Quarantine
Every mod is validated at load time by `src/lib/modSchema.js`. Invalid JSON, unknown state abbreviations, out-of-range ratings, invalid debate weeks, or malformed options quarantine only that mod and display the exact field errors in the Mod Manager without crashing the game.
