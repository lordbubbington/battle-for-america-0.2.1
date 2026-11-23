# Battle for America 2028 — Human-Voice Writing Style Guide

This guide governs all player-facing prose across the codebase (`wiki.js`, `candidates.js`, `runningMates.js`, `news.js`, `worldNews.js`, `debates.js`, `platform.js`, and event catalogs). Every rewrite pass must follow these rules strictly and preserve all IDs, numeric values, template variables, and game-rule accuracy.

## 1. Hard Bans (Zero-Tolerance AI Tells)

Never use any of the following in player-facing text:

* **Zero em-dashes (`—`) and en-dash parentheticals (`–`):** Use commas, parentheses, or separate sentences instead. (Hyphens inside compound modifiers like `winner-take-all` or `mid-campaign` are fine.)

* **No "Not X, Y" or "It is not just X, it is Y" antithesis tropes:** State the fact directly.

* **No "which is either A or B" / "either a gift or a tell" sign-off clauses.**

* **No dramatic fragments or punchline closers:** Avoid lines like *"And it shows."*, *"The math is brutal."*, *"Every vote counts."*, or *"Nobody approved it."*

* **No forced rule-of-three cadence** (e.g., *"Runs on discipline, subpoenas, and a very good ground game."*). Vary list lengths naturally (1, 2, or 4 items, or plain prose).

* **Banned AI-favored vocabulary:** `delve`, `underscore`, `tapestry`, `navigate`, `pivotal`, `landscape`, `vibrant`, `testament`, `resonates`, `galvanize`, `foster`, `nuanced`, `bolster`, `stark`, `myriad`, `compelling`, `seamless`, `robust`, `multifaceted`, `optics`, `vibes`, `receipts`, `brawler`, `sprints for the exits`.

* **No cheeky, winking, or sarcastic narrator voice:** Keep the tone straight, institutional, and matter-of-fact across all three registers.

## 2. The Three Target Voices

### A. Wiki & Encyclopedia (`src/data/wiki.js`) — Dry Political-Science Textbook

* **Tone:** Formal, neutral, instructional, third-person (avoid conversational second-person banter; use *"the player"*, *"a campaign"*, or neutral passive/active institutional phrasing).

* **Structure:** Clear topic sentence followed by concrete mechanical rules, thresholds, and exceptions. Use plain parentheses for dates, formulas, or examples rather than dashes.

* **Vocabulary:** Standard political-science and election-administration terminology (*electoral allocation, statewide plurality, constituency seats, turnout elasticity, generic ballot, contingency election*).

* **Example:**

  * *Before:* "The clock starts on the date you pick — **January 1, April 1 or August 1, 2028** — and always stops on **November 7**. A January launch is forty-four weeks of campaign; August is fourteen. Every one of them is a set of choices you cannot take back."

  * *After:* "Campaigns begin on the selected launch date (January 1, April 1, or August 1, 2028) and conclude on Election Day, November 7. A January start provides forty-four campaign weeks, while an August start provides fourteen. Once a weekly action is taken, it cannot be reversed."

### B. Events & News (`src/data/events*.js`, `src/data/news.js`, `src/data/worldNews.js`, `src/data/build40EventCatalog.js`) — AP / Reuters Wire-Service Deadpan

* **Tone:** Objective, restrained, inverted-pyramid wire reporting. Lead with what happened, where, and who reacted; omit editorializing adjectives.

* **Headlines:** Straight newspaper/wire headlines (concise subject + verb, no clickbait colons like *"Crisis: ..."* or dramatic puns like *"Changes the Math"*).

* **Attribution:** Ground claims in plain wire attributions where natural (*"campaign aides said"*, *"state election officials reported"*, *"pollsters noted"*, *"party strategists said"*).

* **Choice labels:** Short, operational campaign actions (e.g., *"Endorse the measure"*, *"Distance the campaign from the disputed clause"*, *"Decline to comment"*).

* **Example:**

  * *Before:* **A Ballot Measure Changes the Math** — "A citizens’ initiative qualifies for the ballot. Its canvassers reach voters you need, but the proposal includes a provision your campaign has questioned."

  * *After:* **Ballot Initiative Qualifies in Key State** — "A citizen-led initiative secured enough signatures this week to appear on the November ballot, putting its organizers in front of undecided voters even as campaign aides continue to raise objections to a disputed clause in the measure."

### C. Candidate Bios & Running Mates (`src/data/candidates.js`, `src/data/runningMates.js`) — *Almanac of American Politics*

* **Tone:** Dry, factual, journalistic reference profile. Cover officeholder record, geographic base, ideological lane, and coalition appeal without roast humor or partisan caricature.

* **Balanced framing:** Present strengths and vulnerabilities using standard political-reference phrasing (*"Supporters point to..."*, *"Critics argue..."*, *"His record in \[State\] gives him..."*, *"Skeptics question whether..."*).

* **Strengths / Weaknesses bullets:** Short, concrete factual statements (e.g., *"Two-term governor of a core Midwest battleground"* rather than *"Owns the industrial Midwest"*).

* **Example (`buttigieg`):**

  * *Before:* "He turned a small-city mayoralty into a cabinet seat through media competence. He can explain anything in 20 seconds, which is either a gift or a tell."

  * *After:* "A former South Bend mayor and Transportation Secretary, he built his national profile through frequent television appearances and disciplined messaging. Supporters point to his fluency on policy, while critics argue his delivery can come across as overly rehearsed."

## 3. Ultra-Light Human Imperfection Dial (\~1 per 10 Paragraphs)

Keep prose clean, accurate, and readable, with **at most one subtle human writing quirk per \~10 paragraphs**:

* **Allowed (subtle only):**

  * An occasional extra comma where a human writer naturally pauses (e.g., before a short `and` clause or around an introductory phrase).

  * Repeating a plain, accurate noun (*"voters"*, *"state"*, *"campaign"*) in adjacent sentences instead of artificially thesaurus-swapping every mention.

  * Slight natural variation in sentence length without rhythmic polish.

* **Strictly Forbidden:**

  * Misspellings, typos, missing apostrophes, or missing ending punctuation.

  * Broken grammar that makes a game rule, threshold, or number ambiguous.

  * Forced slang or obvious "quirky" errors.

## 4. Technical Safety Rules (Mandatory on Every Pass)

1. **Never modify** object IDs, slugs, numeric stats, probabilities, effect objects, or JS/JSON keys.

2. **Preserve** all template literals (`${...}`), markdown bold tags (`**...**`) used for rule callouts in `wiki.js`, and proper nouns.

3. **Run an automated AI-tell check** after every pass (verifying 0 `—` em-dashes, 0 banned words, 0 `"which is either"` patterns) alongside `npm run lint`, `npm run typecheck`, `tests/v022/v022-verification.test.mjs`, and `npm run build`.

## 5. Staged Execution Plan

* **Pass 1 (Highest Visibility):** `src/data/candidates.js` (bios, strengths, weaknesses) + `src/data/wiki.js` (all encyclopedia articles).

* **Pass 2 (News, Debates & Platform):** `src/data/runningMates.js`, `src/data/debates.js`, `src/data/platform.js`, `src/data/worldNews.js`, `src/data/news.js`.

* **Pass 3 (Hand-Authored Events):** `src/data/events.js`, `src/data/eventsExtra.js`, `src/data/eventsMega.js`, `src/data/eventsMega2.js`, `src/data/triggeredEvents.js`, `src/data/triggeredEventChains.js`, `src/data/derivedEvents.js`, `src/data/easterEggs.js`.

* **Pass 4 (Compiled Event Catalog):** `src/data/build40EventCatalog.js` (in clean batches) + final full-repo AI-tell lint sweep.