# Build 33 election-data imports

Place supplied research files here; this folder is not imported into the game bundle until the data has passed validation.

## House results

The developer-only command `node scripts/inspect-wikipedia-house-results.mjs --write` saves Wikipedia's currently reported 2026 House results to `2026-house-votes-wikipedia-provisional.json`; `node scripts/inspect-wikipedia-house-results.mjs --year=2024 --write` refreshes the historical comparison snapshot. Each row carries its article URL, retrieval timestamp, reported Democratic and Republican vote totals, reporting percentage when listed, and normalized D–R margin/lean when both totals are available.

`npm run build:house-district-baselines` creates the checked-in 435-row game baseline at `src/data/houseDistrictBaselines.json`. It uses the 2026 district vote totals and the 2026 national two-party margin where both district totals are reported. Where 2026 district totals are missing, it uses the matching 2024 district two-party margin relative to the 2024 national two-party margin. Every row preserves the source year, source URL, reporting status, and boundary vintage. Historical fallbacks are explicitly marked and must never be described as 2026 returns. The current merged baseline contains 314 2026 rows and 121 historical fallbacks; this permits the model to run for all districts while preserving the remaining data-quality gap. Current Wikipedia results are unofficial and can change before certification.

If supplying missing district results in CSV, use these columns:

`state_abbr,district_number,dem_votes,rep_votes,reporting_percent,certification_status,source_url,source_checked_on`

Use `certified` or `unofficial` in `certification_status`; leave values blank only when the source has not reported them.

## State-legislature roster

For the 2028 model, provide one row per contest/district with at least:

`state_abbr,chamber,district_id,seats_contested,seats_in_chamber,seats_up_in_2028,members_elected,election_method,term_years,starting_dem_seats,starting_rep_seats,starting_other_seats,nonpartisan,source_url,source_checked_on`

Include a separate row or notes for staggered seats, multi-member districts, designated positions, special elections, nonpartisan rules, and any 2027 result affecting starting composition. Nebraska must be represented as its single officially nonpartisan unicameral legislature. Label projections separately from certified outcomes.
