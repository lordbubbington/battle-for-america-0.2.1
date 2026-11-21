// Scheduler fixtures use minimal definitions; authored card acceptance is separate.
export const ticket = (candidateId, party) => ({ candidateId, party });
export const base = (changes = {}) => ({
  party: 'dem', opponentParty: 'rep', candidateId: 'shapiro', opponentId: 'vance',
  week: 3, totalWeeks: 24, build34CampaignId: 'cef-01:frozen:1',
  build39: { scenario: { id: 'standard' } }, build40: { modeId: 'two-parties' }, ...changes,
});
export const definition = (candidateId, index = 1, trigger = {}) => ({
  id: `fixture-${candidateId}-${index}`, candidateId,
  trigger: { kind: 'candidate-event', minWeek: 1, maxWeek: null, scenarios: [], states: [], ...trigger },
});
export const fixtures = [
  { id: 'two-parties', scenario: 'standard', tickets: [ticket('shapiro', 'dem'), ticket('vance', 'rep')] },
  { id: 'four-parties', scenario: 'standard', tickets: [ticket('shapiro', 'dem'), ticket('vance', 'rep'), ticket('chase', 'lib'), ticket('stein', 'grn')] },
  { id: 'six-party', scenario: 'six-party', tickets: [ticket('shapiro', 'dem'), ticket('trump', 'rep'), ticket('chase', 'lib'), ticket('stein', 'grn'), ticket('bernie-sanders', 'progressive'), ticket('vance', 'maga')] },
  { id: 'regional-parties', scenario: 'regional-parties', tickets: [ticket('shapiro', 'dem'), ticket('vance', 'rep'), ticket('chase', 'lib'), ticket('stein', 'grn'), ticket('farmer-labor', 'farmer-labor'), ticket('conservation', 'conservation'), ticket('localist', 'localist')] },
  { id: 'favorite-sons-daughters', scenario: 'favorite-sons-daughters', tickets: [ticket('shapiro', 'dem'), ticket('vance', 'rep'), ticket('chase', 'lib'), ticket('stein', 'grn'), ticket('favorite-mn', 'favorite-mn'), ticket('favorite-ut', 'favorite-ut'), ticket('favorite-me', 'favorite-me'), ticket('favorite-la', 'favorite-la')] },
];
export const resume = (value) => JSON.parse(JSON.stringify(value));
