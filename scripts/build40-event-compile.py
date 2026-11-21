"""Compile and validate the pinned Build 40 event extract."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT.parent / "docs" / "build40-event-raw.json"
OUT = ROOT / "src" / "data" / "build40EventCatalog.js"
MAP_OUT = ROOT / "src" / "data" / "build40EventMappings.json"
REPORT = ROOT / "docs" / "BUILD40_EVENT_RECONCILIATION.md"
EXPECTED_SOURCES = {
    "all-implemented-events.docx": "21169c90e03cd8741b346512d9d7660b6597b2b2cd24eafc950e54dc25d63a03",
    "planned-unimplemented-events.docx": "10d92e66cc20bdd603e17ac4f45d7d27214d8b59c503d5c3b4aabc00ecbb022b",
}
EFFECT = re.compile(
    r"^(?P<who>Campaign|Rival|Party activists[’']?s?|Climate|Labor|Activists?|Donor|Religious|Approval)\s+"
    r"(?P<body>.+?)\s+(?P<sign>[+−-])\s*\$?(?P<amount>\d+(?:\.\d+)?)\s*(?P<unit>points|m)?$"
)
EFFECT_START = re.compile(r",\s+(?=(?:Campaign|Rival|Party activists|Climate|Labor|Activists?|Donor|Religious|Approval of the faction)\b)")


def split_effects(text):
    return [part.strip() for part in EFFECT_START.split(text) if part.strip()]


def source_ref(event):
    return {"document": event["source"]["document"], "tableRow": event["source"]["tableRow"]}


def target_for(text, actor):
    if "rival" in text.lower() or actor == "Rival":
        side = "opponent"
    else:
        side = "actor"
    low = text.lower()
    if "recorded ad state and one eligible neighbor" in low:
        return {"side": side, "scope": "primary-and-neighbor", "selector": "source-ad-state"}
    if "recorded ad state" in low:
        return {"side": side, "scope": "primary-state", "selector": "source-ad-state"}
    if "primary state and its house races" in low:
        return {"side": side, "scope": "state-and-house", "selector": "primary-state"}
    if "primary state" in low or "state persuasion" in low or "state turnout" in low:
        return {"side": side, "scope": "primary-state", "selector": "primary-state"}
    if "voter group in the report" in low:
        return {"side": side, "scope": "group", "selector": "source-receipt-group"}
    if "faction" in low:
        m = re.search(r"(party activists[’']?s?|climate|labor|activists?|donor|religious|the faction named in the event report) faction approval|approval of the faction named in the event report", text, re.I)
        selector = (m.group(1).lower().replace(" ", "-").replace("’", "").replace("'", "") if m and m.group(1) else "source-receipt-faction")
        if "named in the event report" in low:
            selector = "source-receipt-faction"
        return {"side": side, "scope": "faction", "selector": selector}
    if "support among" in low:
        m = re.search(r"support among (.+?)(?:\s+[+−-]\s*\$?\d+(?:\.\d+)?(?: points|m)?)?$", text, re.I)
        if m:
            selector = m.group(1).strip().lower()
            if selector.endswith(" voters"):
                selector = selector[:-7]
            return {"side": side, "scope": "group", "selector": selector.replace(" ", "-")}
        return {"side": side, "scope": "group", "selector": "source-receipt-group"}
    return {"side": side, "scope": "national"}


def parse_effect(text, ref, event_id):
    text = text.strip().rstrip(".")
    if not text or text == "No additional effect":
        return []
    if "scandal" in text.lower():
        return [{"kind": "scandal", "target": {"side": "actor", "scope": "campaign"}, "severity": "ordinary", "sourceText": text, "source": ref}]
    m = EFFECT.match(text)
    if not m:
        raise ValueError(f"{event_id} {ref}: unrecognized effect text: {text}")
    actor, body = m.group("who"), m.group("body")
    amount = float(m.group("amount")) * (-1 if m.group("sign") in ("−", "-") else 1)
    low = body.lower()
    if "momentum" in low:
        kind, unit = "momentum", "points"
    elif "funds" in low:
        kind, unit = "cash", "millions"
    elif "persuasion" in low:
        kind, unit = "persuasion", "points"
    elif "turnout" in low:
        kind, unit = "turnout", "points"
    elif "downballot" in low or "house races" in low:
        kind, unit = "house", "points"
    elif "faction approval" in low or "approval of the faction" in low or "of the faction named in the event report" in low:
        kind, unit = "faction", "points"
    elif "support among" in low:
        kind, unit = "group", "points"
    else:
        raise ValueError(f"{event_id} {ref}: unknown effect family: {text}")
    return [{"kind": kind, "amount": amount, "unit": unit, "target": target_for(text, actor), "scalable": kind != "scandal", "sourceText": text, "source": ref}]


def parse_choice(event, choice):
    ref = source_ref(event)
    text = choice["effectText"].strip()
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    odds = []
    outcomeOdds = []
    scandalChance = None
    public = []
    effects = []
    for line in lines:
        if line.startswith("Design odds. "):
            note = line.removeprefix("Design odds. ")
            odds.append(note)
            scandal = re.search(r"(\d+)%\s+scandal at (twice ordinary|ordinary) severity", note, re.I)
            if scandal:
                scandalChance = {"probability": float(scandal.group(1)) / 100, "severity": "double" if scandal.group(2).lower().startswith("twice") else "ordinary", "sourceText": line, "source": ref}
            elif "Guaranteed ordinary scandal" in note:
                scandalChance = {"probability": 1, "severity": "ordinary", "sourceText": line, "source": ref}
            else:
                outcomeOdds.append(note)
            continue
        if line.startswith(("Small chance ", "Medium chance ", "Large chance ")) or line in ("A campaign scandal follows.", "The follow-up may do better."):
            public.append(line)
            if line == "A campaign scandal follows." and scandalChance is None:
                scandalChance = {"probability": 1, "severity": "ordinary", "sourceText": line, "source": ref}
            continue
        # Source outcome alternatives use a single design-odds line with | separators.
        for item in split_effects(line):
            effects.extend(parse_effect(item, ref, event["id"]))
    branches = []
    for line in outcomeOdds:
        parts = re.split(r"\s+\|\s+", line)
        for part in parts:
            chance = re.match(r"(?P<p>\d+(?:\.\d+)?)%\s*(?P<effects>.*)$", part)
            if not chance:
                raise ValueError(f"{event['id']} {ref}: malformed design odds branch: {part}")
            pct = float(chance.group("p")) / 100
            branch_effects = []
            raw = chance.group("effects").removesuffix(" (hidden tier)").strip()
            if raw and raw != "No additional effect":
                for item in split_effects(raw):
                    branch_effects.extend(parse_effect(item, ref, event["id"]))
            branches.append({"probability": pct, "effects": branch_effects, "hidden": "hidden tier" in part, "sourceText": part, "source": ref})
        if abs(sum(b["probability"] for b in branches) - 1) > 1e-9:
            raise ValueError(f"{event['id']} {ref}: branch odds do not total 100%")
    if scandalChance:
        effects.append({"kind": "scandal", "probability": scandalChance["probability"], "severity": scandalChance["severity"], "target": {"side": "actor", "scope": "campaign"}, "scalable": False, "sourceText": scandalChance["sourceText"], "source": ref})
    if not branches:
        branches = [{"probability": 1, "effects": effects, "source": ref}]
    elif effects:
        for branch in branches:
            branch["effects"] = effects + branch["effects"]
    return {
        "id": f"choice-{choice['slot']}", "slot": choice["slot"], "label": choice["label"],
        "preview": " ".join(public), "branches": branches,
        "sourceText": choice["effectText"], "designOdds": odds, "scandalChance": scandalChance,
    }


def predicate(event):
    trigger = event["triggerText"]
    lines = [line.strip() for line in trigger.splitlines() if line.strip()]
    body = " ".join(lines[1:])
    low = body.lower()
    if event["bucket"] != "Campaign specific":
        return {"kind": "general-draw", "sourcePredicateText": body}
    if event["id"].startswith("debate") and "-q" in event["id"]:
        kind = "debate-question"
    elif "queue this response" in low:
        kind = "queued-choice"
    elif "state target." in low or "state recorded" in low or "state persuasion" in low:
        kind = "receipt-and-state"
    elif "faction" in low and ("below" in low or "least supportive" in low or "factions named" in low):
        kind = "faction-receipt"
    elif "debate" in low:
        kind = "debate-receipt"
    elif "weeks" in low or "week " in low or "final ten days" in low:
        kind = "schedule-condition"
    elif "four parties" in low:
        kind = "mode-condition"
    else:
        kind = "campaign-receipt"
    return {"kind": kind, "sourcePredicateText": body, "requiresRuntimeBinding": True}


def compile_data(raw):
    events = []
    mappings = []
    catalog_titles = {row["title"] for row in raw["events"]}
    legacy_files = [ROOT / "src" / "data" / name for name in (
        "events.js", "eventsExtra.js", "eventsMega.js", "eventsMega2.js", "nationEvents.js",
        "eventsDemographics.js", "derivedEvents.js", "eventsBoosts.js", "factionConflicts.js",
        "vanceSuccession.js", "easterEggs.js", "triggeredEvents.js",
    )]
    legacy_ids = set()
    for path in legacy_files:
        if path.exists():
            legacy_ids.update(re.findall(r"\bid\s*:\s*(['\"])(.*?)\1", path.read_text(encoding="utf-8", errors="replace")))
    legacy_ids = {value for _, value in legacy_ids}
    for e in raw["events"]:
        ref = source_ref(e)
        p = predicate(e)
        event = {
            "id": e["id"], "title": e["title"], "flavor": e["flavor"], "source": ref,
            "style": e["style"], "mashup": e["mashup"], "bucket": e["bucket"],
            "triggerText": e["triggerText"], "trigger": p,
            "choices": [parse_choice(e, c) for c in e["choices"]],
            "designNotes": e["designNotes"],
            "sourceAnnotations": e["source"]["annotations"],
        }
        # Build 44 owner decision: fictional Republican draw, unchanged mechanics.
        if e["id"] == "interrupt-069-ballot-measure-conflict":
            event["flavor"] = "Fictional campaign incident: Republican county organizers cite Ted Cruz in their discussion of a proposed state measure. In this fictional scenario, the measure qualifies with a provision that conflicts with a campaign pledge. Local groups want the candidate’s position before their voter forum."
            event["designNotes"] = [*event["designNotes"], "Build 44: owner-approved fictional draw; framework 2 and all authored effects retained."]
        events.append(event)
        prerequisite_titles = re.findall(r"[\"“]([^\"”]+)[\"”]", " ".join(e["triggerText"].splitlines()[1:]))
        prerequisites = [{"title": title, "status": "catalog-event" if title in catalog_titles else "off-list-prerequisite"} for title in prerequisite_titles]
        target_rules = []
        for choice in event["choices"]:
            for branch in choice["branches"]:
                for effect in branch["effects"]:
                    target = effect.get("target")
                    if target and target not in target_rules:
                        target_rules.append(target)
        mappings.append({
            "id": e["id"], "source": ref,
            "category": "new" if e["id"].startswith("draft-") else ("existing" if e["id"] in legacy_ids else "revised-replacement"),
            "predicateKind": p["kind"], "predicateText": p["sourcePredicateText"],
            "targetRules": target_rules or [{"scope": "none"}],
            "dynamicTargets": [t for t in target_rules if t.get("selector", "").startswith("source-")],
            "requiresRuntimeBinding": p.get("requiresRuntimeBinding", False),
            "prerequisites": prerequisites,
        })
    retired = sorted(legacy_ids - {e["id"] for e in events})
    for row in mappings:
        row["retiredLegacyIds"] = retired if row is mappings[0] else []
    return events, mappings


def validate(raw, events, mappings):
    assert raw["sources"] == EXPECTED_SOURCES
    assert len(events) == 416 and len({e["id"] for e in events}) == 416
    buckets = Counter(e["bucket"] for e in events)
    styles = Counter(e["style"] for e in events)
    mashups = sum(e["mashup"] for e in events)
    assert buckets == {"Any candidate": 208, "Republicans only": 42, "Democrats only": 41, "Campaign specific": 125}, buckets
    assert styles == {**{i: 42 for i in range(1, 7)}, **{i: 41 for i in range(7, 11)}}, styles
    assert mashups == 139
    assert Counter(e["source"]["document"] for e in events) == {"all-implemented-events.docx": 206, "planned-unimplemented-events.docx": 210}
    assert sum(e["id"].startswith("draft-") for e in events) == 100
    for e in events:
        expected_choices = 2 if e["style"] >= 8 and not e["mashup"] else 3
        assert len(e["choices"]) == expected_choices, (e["id"], len(e["choices"]), expected_choices)
        for c in e["choices"]:
            assert 1 <= c["slot"] <= 3
            assert c["label"] and c["sourceText"] is not None
            assert c["branches"]
            assert abs(sum(b["probability"] for b in c["branches"]) - 1) < 1e-9, (e["id"], c["slot"])
            all_effects = [fx for b in c["branches"] for fx in b["effects"]]
            assert all(fx.get("source", {}).get("document") and fx.get("source", {}).get("tableRow") for fx in all_effects)
            assert all(fx.get("target") for fx in all_effects if fx["kind"] != "scandal")
    assert all(m["source"]["document"] and m["source"]["tableRow"] for m in mappings)
    assert sum(m["requiresRuntimeBinding"] for m in mappings) == 125
    assert len(mappings) == 416 and sum(m["predicateKind"] == "queued-choice" for m in mappings) > 0


def main():
    raw = json.loads(RAW.read_text(encoding="utf-8"))
    events, mappings = compile_data(raw)
    validate(raw, events, mappings)
    hidden_effects = sum(fx.get("hidden") is True for e in events for c in e["choices"] for b in c["branches"] for fx in b["effects"])
    assert hidden_effects <= 12, f"Explicitly hidden effects exceed 12: {hidden_effects}"
    OUT.write_text("// Generated by scripts/build40-event-compile.py; do not edit by hand.\nexport const BUILD40_EVENTS = " + json.dumps(events, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    MAP_OUT.write_text(json.dumps(mappings, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    REPORT.write_text(report(events, mappings), encoding="utf-8")
    print(json.dumps({"events": len(events), "documents": dict(Counter(e["source"]["document"] for e in events)), "eligibility": dict(Counter(e["bucket"] for e in events)), "styles": dict(Counter(e["style"] for e in events)), "mashups": sum(e["mashup"] for e in events), "campaignSpecificPredicateRows": sum(e["bucket"] == "Campaign specific" for e in events), "queuedChoices": sum(m["predicateKind"] == "queued-choice" for m in mappings), "out": str(OUT), "mappings": str(MAP_OUT)}, ensure_ascii=False, indent=2))


def report(events, mappings):
    docs = Counter(e["source"]["document"] for e in events)
    elig = Counter(e["bucket"] for e in events)
    styles = Counter(e["style"] for e in events)
    kinds = Counter(m["predicateKind"] for m in mappings if m["predicateKind"] != "general-draw")
    classification = Counter(m["category"] for m in mappings)
    retired_ids = next((m["retiredLegacyIds"] for m in mappings if m["retiredLegacyIds"]), [])
    off_list = [(m, p) for m in mappings for p in m["prerequisites"] if p["status"] == "off-list-prerequisite"]
    all_effects = [fx for e in events for c in e["choices"] for b in c["branches"] for fx in b["effects"]]
    effect_kinds = Counter(fx["kind"] for fx in all_effects)
    branch_choices = sum(len(c["branches"]) > 1 for e in events for c in e["choices"])
    hidden_branches = sum(b.get("hidden", False) for e in events for c in e["choices"] for b in c["branches"])
    choice_counts = Counter(len(e["choices"]) for e in events)
    target_scopes = Counter(t.get("scope", "none") for m in mappings for t in m["targetRules"])
    dynamic_targets = sum(len(m["dynamicTargets"]) for m in mappings)
    lines = [
        "# Build 40 event data reconciliation", "",
        "Generated by `python scripts/build40-event-compile.py` from the single pinned extract at `../docs/build40-event-raw.json`.", "",
        "## Coverage", "", f"- Unique rows: {len(events)}; IDs unique: yes.",
        f"- Source rows: implemented {docs['all-implemented-events.docx']}, planned/unimplemented {docs['planned-unimplemented-events.docx']}.",
        f"- Eligibility: any {elig['Any candidate']}, Republican-only {elig['Republicans only']}, Democratic-only {elig['Democrats only']}, campaign-specific {elig['Campaign specific']}.",
        f"- Styles: {', '.join(f'{i}={styles[i]}' for i in range(1,11))}; mashups {sum(e['mashup'] for e in events)}; draft IDs {sum(e['id'].startswith('draft-') for e in events)}.",
        f"- Choice counts: 2-choice events {choice_counts[2]}, 3-choice events {choice_counts[3]}; conditional branch choices {branch_choices}; hidden outcomes {hidden_branches}.",
        f"- Effect kinds: {', '.join(f'{k}={v}' for k,v in sorted(effect_kinds.items()))} (branch outcome records).",
        f"- Target scopes: {', '.join(f'{k}={v}' for k,v in sorted(target_scopes.items()))}; dynamic target mappings {dynamic_targets}.",
        f"- Predicate classes requiring integration: {', '.join(f'{k}={v}' for k,v in sorted(kinds.items()))}.",
        "- All choices retain source labels and effect text; odds and hidden tiers are stored as data, separate from public previews.",
        "- Every effect retains a document and table-row citation. All campaign-specific rows have exact predicate text, kind and citation in `build40EventMappings.json`.",
        "", "## Classifications and exceptions", "",
        f"- Direct catalog-module ID comparison: existing {classification['existing']}, revised replacements {classification['revised-replacement']}, new {classification['new']}, legacy IDs absent from the allowlist {len(retired_ids)}.",
        "- ID categories and directly scanned retired IDs are in `build40EventMappings.json`; this does not replace integration's route-by-route inventory of adapters and producers.",
        "- Runtime producer mappings needed: every campaign-specific predicate row (125); the lead must bind each to a normal gameplay receipt/producer.",
        "- Dynamic source targets are explicitly listed per row and effect (`source-receipt-group`, `source-receipt-faction`, `source-ad-state`, or `primary-state`) and require runtime materialization.",
        "- Queued choice conditions use `queued-choice`; debate question IDs use `debate-question`; both require integration scheduling/receipt wiring.",
        "- No source text was discarded. Writer design notes and annotations are retained outside player-facing `flavor`.",
        "", "## Small exception report", "", "| Event | Predicate class | Source |", "|---|---|---|",
    ]
    for m in [m for m in mappings if m["predicateKind"] in ("queued-choice", "debate-question", "receipt-and-state")][:10]:
        lines.append(f"| `{m['id']}` | {m['predicateKind']} | {m['source']['document']} row {m['source']['tableRow']} |")
    lines += ["", "### Off-list prerequisite references", "", "Each quoted prerequisite not matching a decision title must be supplied by a normal campaign/news/action receipt; do not recreate it as a separate decision.", ""]
    for m, p in off_list:
        lines.append(f"- `{m['id']}` requires `{p['title']}` — {m['source']['document']} row {m['source']['tableRow']}.")
    if not off_list:
        lines.append("- None detected by exact title match.")
    lines += ["", "See the JSON mapping file for the complete row-level report and original predicates.", ""]
    return "\n".join(lines)


if __name__ == "__main__":
    main()
