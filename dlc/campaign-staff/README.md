# Campaign Staff DLC Module (Archived for Future Expansion)

This folder contains the complete traditional ("normal") and non-traditional ("zany") campaign staff system extracted from the active v0.2.2 base game so it can be re-integrated later as a standalone DLC expansion.

## Contents
- `data/`
  - `traditionalStaffRoster.js` — Normal campaign staff roles, names, and portraits
  - `nonTraditionalStaffRoster.js` — Non-traditional / zany staff roster
- `lib/`
  - `build35Staff.js` — Action hooks, agendas, contracts, attendance, quality rolls, field conversion, signage discounts, weekly debriefs
  - `build36StaffMigration.js` — Save migration for legacy staffing structures
  - `build38StaffRules.js` — Weekly staff upkeep (`staffWeeklyUpkeep`)
  - `traditionalStaffRules.js` — Initial selection (`selectInitialTraditionalStaff`), readiness check (`isTraditionalStaffingReady`), policy promise conflict inspection (`inspectPolicyPromiseConflicts`)
  - `traditionalStaffNativeAdapter.js` — Native engine adapter for traditional staff
  - `nonTraditionalStaffRules.js` — Selection/validation rules for non-traditional staff
  - `nonTraditionalStaffEffects.js` — Resolver effect specifications for non-traditional staff
- `components/`
  - `StaffSelection.jsx` — Opening staff-draft screen
  - `StaffWorkspace.jsx` — In-campaign Staff board tab workspace
  - `StaffPanel.jsx` — Staff roster/detail panel
  - `StaffMention.jsx` — Inline staff mention badge renderer for events/history
  - `StaffPortrait.jsx` — Staff portrait renderer
- `__tests__/build35Developer3.test.js` — Unit tests for non-traditional staff selection and effect specs

## Base-Game Re-Integration Hook Points
When enabling this DLC in a future expansion:
1. **`src/lib/gameEngine.js`** — Replace the inline no-op stubs (`staffWeeklyUpkeep`, `isTraditionalStaffingReady`, `applyBuild35Agenda`, `applyBuild35Contract`, `build35Attendance`, `build35QualityRoll`, `build35FieldConversion`, `build35SignageCost`, `fileBuild35StaffDebrief`) with imports from `dlc/campaign-staff/lib/*`; initialize `game.staffing = initialBuild36Staff(game.build34CampaignId)` in `createGame`; restore `selectInitialTraditionalStaff` in `confirmBuild35Staffing`; restore `migrateBuild36Staffing` in `loadGame`.
2. **`src/lib/build40Field.js`** — Reconnect `build35SignageCost` for opening ground-game discounts.
3. **`src/lib/news.js`** — Reconnect `applyBuild35Agenda` in `spinStory`.
4. **`src/pages/Home.jsx`** — Restore `<StaffSelection />` pre-turn gate, `recordBuild35StaffAction`, and `setBuild35Agenda` (`onSetAgenda`).
5. **`src/components/game/GameScreen.jsx` & `BoardPanel.jsx`** — Restore the `Staff` board tab and `<StaffWorkspace />`.
6. **`src/components/game/EventCard.jsx`, `HistoryPanel.jsx`, & `ShiftPolicyPanel.jsx`** — Restore `<StaffMention />`, `<StaffPortrait />`, and `inspectPolicyPromiseConflicts`.
