import { ISSUES, ISSUE_BY_ID } from '@/data/platform';
import { STATE_LIST, STATE_BY_ABBR } from '@/data/states';
import { addTurnoutState, turnoutOf } from '@/lib/turnout';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const round1 = (value) => Math.round(value * 10) / 10;

export const CAMPAIGN_STAFF = [
  { id: 'field', title: 'Field Director', focus: 'Turnout and field capacity', priority: 'Find the closest state where turnout still needs work.' },
  { id: 'pollster', title: 'Chief Pollster', focus: 'Persuadable voters and uncertainty', priority: 'Measure the tightest state before moving the message.' },
  { id: 'communications', title: 'Communications Director', focus: 'Message discipline and the news cycle', priority: 'Keep the campaign on its strongest high-salience issue.' },
  { id: 'chief', title: 'Chief of Staff', focus: 'Coordinate the whole campaign', priority: 'Resolve competing advice into one weekly priority.' },
];

export const ENDORSEMENT_LEADERS = [
  // Named figures use public leadership roles current in 2026. Their game preferences and endorsement outcomes are scenario modeling, not claims about actual endorsements.
  { id: 'labor-council', label: 'Midwest Labor Council', representative: 'Shawn Fain', representativeRole: 'UAW president · modeled union profile', office: 'Union leadership', parties: ['dem'], preferences: { economy: 0, affordability: 1, tariffs: 0, immigration: 1 }, states: ['MI', 'WI', 'PA'], cash: 8, volunteers: 2, minFit: 0.58 },
  { id: 'party-moderates', label: 'Party Moderates Caucus', representative: 'Ken Martin', representativeRole: 'DNC chair · modeled party profile', office: 'Party organization', parties: ['dem'], preferences: { economy: 1, immigration: 1, iran: 1, israel: 1, corruption: 1 }, states: ['PA', 'MI', 'AZ'], cash: 12, volunteers: 1, minFit: 0.64 },
  { id: 'party-conservatives', label: 'Republican National Committee', representative: 'Joe Gruters', representativeRole: 'RNC chair · modeled party profile', office: 'Party organization', parties: ['rep'], preferences: { economy: 2, immigration: 2, tariffs: 2, crime: 2, corruption: 1 }, states: ['GA', 'NC', 'PA'], cash: 12, volunteers: 2, minFit: 0.64 },
  { id: 'progressive-organizers', label: 'Progressive Organizing Network', office: 'Party organization', parties: ['dem', 'grn'], preferences: { affordability: 0, health: 0, inequality: 0, rent: 0, energy: 0 }, states: ['PA', 'MI', 'NV'], cash: 4, volunteers: 3, minFit: 0.66 },
  { id: 'governors-table', label: 'Bipartisan Governors’ Table', representative: 'Wes Moore', representativeRole: 'Maryland governor and 2026–27 NGA chair · modeled governors’ profile', office: 'Governors’ offices', parties: ['dem', 'rep'], preferences: { economy: 1, crime: 1, datacenters: 1, immigration: 1 }, states: ['GA', 'NC', 'PA'], cash: 10, volunteers: 2, minFit: 0.58 },
  { id: 'health-access', label: 'Health Access Coalition', representative: 'Alexis McGill Johnson', representativeRole: 'Planned Parenthood president and CEO · modeled advocacy profile', office: 'Advocacy group', parties: ['dem', 'grn'], preferences: { health: 0, abortion: 0, affordability: 0 }, states: ['MI', 'PA', 'AZ'], cash: 3, volunteers: 3, minFit: 0.7 },
  { id: 'clean-energy', label: 'Clean Energy Partnership', office: 'Advocacy group', parties: ['dem', 'grn'], preferences: { energy: 0, datacenters: 0, ai: 1 }, states: ['AZ', 'NV', 'PA'], cash: 5, volunteers: 2, minFit: 0.64 },
  { id: 'business-federation', label: 'National Business Federation', office: 'Business and party donors', parties: ['dem', 'rep'], preferences: { economy: 2, affordability: 1, tariffs: 0, datacenters: 2 }, states: ['GA', 'NC', 'PA'], cash: 20, volunteers: 0, minFit: 0.7 },
  { id: 'faith-coalition', label: 'Faith and Family Coalition', office: 'Advocacy group', parties: ['rep'], preferences: { abortion: 2, trans: 2, birthrate: 2, immigration: 2 }, states: ['GA', 'NC', 'WI'], cash: 8, volunteers: 2, minFit: 0.66 },
  { id: 'civil-liberties', label: 'Civil Liberties Network', representative: 'Derrick Johnson', representativeRole: 'NAACP president and CEO · modeled advocacy profile', office: 'Advocacy group', parties: ['dem', 'rep', 'lib', 'grn'], preferences: { ai: 0, datacenters: 0, gerrymandering: 0, corruption: 0 }, states: ['AZ', 'NV', 'PA'], cash: 4, volunteers: 2, minFit: 0.62 },
];

const STAFF_IDS = CAMPAIGN_STAFF.map((staff) => staff.id);
const LEADERS_BY_ID = Object.fromEntries(ENDORSEMENT_LEADERS.map((leader) => [leader.id, leader]));

export function initialCampaignStaff() {
  return {
    field: { morale: 72, burnout: 18 },
    pollster: { morale: 68, burnout: 22 },
    communications: { morale: 70, burnout: 18 },
    chief: { morale: 76, burnout: 14 },
    tension: 16,
  };
}

export function sanitizeCampaignStaff(raw = {}) {
  const fallback = initialCampaignStaff();
  const clean = {};
  STAFF_IDS.forEach((id) => {
    clean[id] = {
      morale: clamp(finite(raw?.[id]?.morale, fallback[id].morale), 0, 100),
      burnout: clamp(finite(raw?.[id]?.burnout, fallback[id].burnout), 0, 100),
    };
  });
  clean.tension = clamp(finite(raw?.tension, fallback.tension), 0, 100);
  return clean;
}

export function initialEndorsements() {
  return Object.fromEntries(ENDORSEMENT_LEADERS.map((leader) => [leader.id, {
    favor: 54,
    status: 'watching',
    attempts: 0,
    memory: [],
  }]));
}

export function sanitizeEndorsements(raw = {}) {
  const clean = {};
  ENDORSEMENT_LEADERS.forEach((leader) => {
    const record = raw?.[leader.id] || {};
    clean[leader.id] = {
      favor: clamp(finite(record.favor, 54), 0, 100),
      status: ['watching', 'endorsed', 'critical', 'withdrawn'].includes(record.status) ? record.status : 'watching',
      attempts: Math.max(0, Math.round(finite(record.attempts, 0))),
      memory: Array.isArray(record.memory) ? record.memory.slice(-8) : [],
    };
  });
  return clean;
}

export function policyAlignment(game, leader) {
  const preferences = Object.entries(leader?.preferences || {});
  if (!preferences.length) return 0.5;
  const total = preferences.reduce((sum, [issueId, preferred]) => {
    const stance = finite(game?.stances?.[issueId], 1);
    return sum + 1 - Math.abs(preferred - stance) / 2;
  }, 0);
  return clamp(total / preferences.length, 0, 1);
}

export function recordPolicyChoice(previous, next, issueId, oldStance, newStance) {
  const issue = ISSUE_BY_ID[issueId];
  if (!issue || !Number.isFinite(newStance)) return next;
  const records = sanitizeEndorsements(next.endorsements || previous.endorsements);
  ENDORSEMENT_LEADERS.forEach((leader) => {
    const preferred = leader.preferences[issueId];
    if (!Number.isFinite(preferred)) return;
    const oldFit = 1 - Math.abs(preferred - finite(oldStance, 1)) / 2;
    const newFit = 1 - Math.abs(preferred - newStance) / 2;
    const record = records[leader.id];
    const shift = Math.round((newFit - oldFit) * 12);
    record.favor = clamp(record.favor + shift, 0, 100);
    record.memory = [...record.memory, {
      week: previous.week || 0,
      issueId,
      issue: issue.label,
      stance: newStance,
      reaction: shift > 0 ? 'approval' : shift < 0 ? 'concern' : 'noted',
    }].slice(-8);
    if (record.favor < 24 && record.status !== 'endorsed') record.status = 'critical';
    else if (record.status === 'critical' && record.favor >= 35) record.status = 'watching';
    if (record.status === 'endorsed' && newFit < 0.35) record.status = 'withdrawn';
  });
  return { ...next, endorsements: records };
}

export function requestEndorsement(game, leaderId) {
  const leader = LEADERS_BY_ID[leaderId];
  if (!leader || !leader.parties.includes(game.party)) return game;
  const left = Number.isFinite(game.actionsLeft) ? game.actionsLeft : 7;
  const record = sanitizeEndorsements(game.endorsements)[leaderId];
  if (left <= 0 || record.status === 'endorsed' || record.status === 'withdrawn') return game;

  const fit = policyAlignment(game, leader);
  const confidence = record.favor * 0.45 + fit * 55;
  const accepted = fit >= leader.minFit && confidence >= 57;
  const next = {
    ...game,
    stateMods: { ...(game.stateMods || {}) },
    issueEdge: { ...(game.issueEdge || {}) },
    endorsements: sanitizeEndorsements(game.endorsements),
    weekLog: [...(game.weekLog || [])],
    actionsLeft: left - 1,
  };
  const nextRecord = next.endorsements[leaderId];
  nextRecord.attempts += 1;

  if (accepted) {
    nextRecord.status = 'endorsed';
    nextRecord.favor = clamp(nextRecord.favor + 8, 0, 100);
    next.funds = round1((game.funds || 0) + leader.cash);
    next.momentum = clamp(finite(game.momentum, 50) + 1.2, 0, 100);
    const pov = game.party === 'rep' ? -1 : 1;
    leader.states.forEach((abbr) => {
      if (!STATE_BY_ABBR[abbr]) return;
      const turnoutDelta = leader.volunteers ? 0.8 + leader.volunteers * 0.15 : 0;
      if (turnoutDelta) addTurnoutState(next, game.party, abbr, turnoutDelta);
      const regMul = (next.build40?.modeId === 'regional-parties' || next.build39?.scenario?.id === 'regional-parties') ? 10 : 1;
      next.stateMods[abbr] = (next.stateMods[abbr] || 0) + pov * 0.18 * regMul;
    });
    const issueId = Object.keys(leader.preferences).sort((a, b) => (ISSUE_BY_ID[b]?.weight || 0) - (ISSUE_BY_ID[a]?.weight || 0))[0];
    if (issueId) next.issueEdge[issueId] = clamp((next.issueEdge[issueId] || 0) + pov * 0.22, -1, 1);
    next.lastAction = `${leader.label} endorsed the campaign — ${fit >= 0.78 ? 'a strong policy fit' : 'a workable policy agreement'} brings $${leader.cash}M and field help`;
  } else {
    nextRecord.status = 'critical';
    nextRecord.favor = clamp(nextRecord.favor - 9, 0, 100);
    next.momentum = clamp(finite(game.momentum, 50) - 0.8, 0, 100);
    next.oppMomentum = clamp(finite(game.oppMomentum, 50) + 1.1, 0, 100);
    const policyConcern = [...record.memory].reverse().find((memory) => memory.reaction === 'concern' && memory.issueId) || null;
    next.lastAction = fit < leader.minFit && policyConcern
      ? `${leader.label} delayed its endorsement and cited its concern about ${(policyConcern.issue || 'policy').toLowerCase()}`
      : `${leader.label} rejected the request and criticized the campaign’s position`;
  }
  const policyConcern = [...record.memory].reverse().find((memory) => memory.reaction === 'concern' && memory.issueId) || null;
  next.lastEndorsementRequest = {
    leaderId,
    leaderName: leader.label,
    fit: round1(fit * 100),
    minimumFit: round1(leader.minFit * 100),
    accepted,
    status: nextRecord.status,
    delayedForPolicy: !accepted && fit < leader.minFit && !!policyConcern,
    policyConcern,
    message: next.lastAction,
  };
  next.weekLog.push(next.lastAction);
  return next;
}

function marginOf(game, abbr) {
  const base = finite(game?.baseMargins?.[abbr], finite(game?.leans?.[abbr], 0));
  return base + finite(game?.stateMods?.[abbr], 0);
}

export function campaignStaffAdvice(game) {
  const rows = STATE_LIST.map((state) => ({
    ...state,
    margin: marginOf(game, state.abbr),
    turnout: turnoutOf(game, state.abbr, game.party),
    fieldLevel: (game.ops?.[state.abbr] || 0) + (game.freeOps?.[game.party]?.[state.abbr] || 0),
  }));
  const field = rows.slice().sort((a, b) => {
    const score = (row) => Math.max(0, 15 - Math.abs(row.margin)) + Math.max(0, 62 - row.turnout) * 0.45 - row.fieldLevel * 1.4;
    return score(b) - score(a);
  })[0];
  const pollster = rows.slice().sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin))[0];
  const issue = ISSUES.slice().sort((a, b) => {
    const score = (item) => item.weight + finite(game.salience?.[item.id], 0) + Math.abs(finite(game.issueEdge?.[item.id], 0)) * 2;
    return score(b) - score(a);
  })[0];
  const conflict = field.abbr === pollster.abbr ? 0 : 1;
  const tension = clamp(12 + conflict * 28 + Math.max(0, 72 - finite(game.staff?.chief?.morale, 76)) * 0.45, 0, 80);
  const chiefTarget = field.turnout < pollster.turnout - 3 ? field : pollster;
  return {
    field: { abbr: field.abbr, state: field.name, text: `Build turnout in ${field.name}`, action: 'field' },
    pollster: { abbr: pollster.abbr, state: pollster.name, text: `Measure the close race in ${pollster.name}`, action: 'poll' },
    communications: { issueId: issue.id, issue: issue.label, text: `Keep the message on ${issue.label.toLowerCase()}`, action: 'message' },
    chief: { abbr: chiefTarget.abbr, state: chiefTarget.name, text: `This week: prioritize ${chiefTarget.name}; use the ${issue.label.toLowerCase()} message`, action: 'coordinate' },
    tension,
  };
}

export function staffEffectiveness(game, roleId, tension = game?.staff?.tension || 0) {
  const staff = sanitizeCampaignStaff(game?.staff);
  const person = staff[roleId] || staff.chief;
  return clamp(1 + (person.morale - 70) * 0.006 - (person.burnout - 18) * 0.005 - tension * 0.003, 0.55, 1.25);
}

export function resolveStaffDecision(previous, next, context = {}) {
  if (!previous || !next || next === previous) return next;
  const advice = campaignStaffAdvice(previous);
  const staff = sanitizeCampaignStaff(previous.staff);
  const state = context.abbr || context.abbrs?.[0] || null;
  const issueId = context.issueId || null;
  const fieldAction = context.type === 'townhall' || context.type === 'action' && ['visit', 'volunteers', 'ops'].includes(context.actionId);
  const pollAction = ['promise', 'ad'].includes(context.type) || context.type === 'action' && ['visit', 'townhall'].includes(context.actionId);
  const commsAction = ['choice', 'debate', 'ad', 'spin', 'stance', 'promise'].includes(context.type);
  const relevant = [];
  const matched = [];
  if (fieldAction) { relevant.push('field'); if (state === advice.field.abbr) matched.push('field'); }
  if (pollAction) { relevant.push('pollster'); if (state === advice.pollster.abbr) matched.push('pollster'); }
  if (commsAction) { relevant.push('communications'); if (!issueId || issueId === advice.communications.issueId || context.type === 'debate') matched.push('communications'); }

  const tension = clamp(advice.tension + (relevant.length ? (relevant.length - matched.length) * 5 - matched.length * 2 : 0), 0, 90);
  relevant.forEach((roleId) => {
    const delivered = matched.includes(roleId);
    staff[roleId].morale = clamp(staff[roleId].morale + (delivered ? 2 : -1), 0, 100);
    staff[roleId].burnout = clamp(staff[roleId].burnout + (delivered ? 1 : 2), 0, 100);
  });
  staff.chief.morale = clamp(staff.chief.morale + (matched.length >= 2 ? 2 : relevant.length ? -1 : 0), 0, 100);
  staff.chief.burnout = clamp(staff.chief.burnout + (relevant.length ? 1 : 0), 0, 100);
  staff.tension = tension;

  const delivered = { ...next, staff };
  const pov = previous.party === 'rep' ? -1 : 1;
  if (state && fieldAction) {
    const execution = staffEffectiveness(previous, 'field', advice.tension);
    const delta = (matched.includes('field') ? 0.12 : -0.07) * execution;
    delivered.stateMods = { ...(delivered.stateMods || {}), [state]: finite(delivered.stateMods?.[state], 0) + pov * delta };
  }
  if (state && pollAction) {
    const execution = staffEffectiveness(previous, 'pollster', advice.tension);
    const delta = (matched.includes('pollster') ? 0.08 : -0.045) * execution;
    delivered.stateMods = { ...(delivered.stateMods || {}), [state]: finite(delivered.stateMods?.[state], 0) + pov * delta };
  }
  if (commsAction) {
    const execution = staffEffectiveness(previous, 'communications', advice.tension);
    const momentumDelta = (matched.includes('communications') ? 0.35 : -0.2) * execution;
    delivered.momentum = clamp(finite(delivered.momentum, 50) + momentumDelta, 0, 100);
  }
  delivered.weekLog = delivered.weekLog || next.weekLog || [];
  return delivered;
}

export function recoverCampaignStaff(game) {
  const staff = sanitizeCampaignStaff(game?.staff);
  const result = finite(game?.momentum, 50) - finite(game?.oppMomentum, 50);
  STAFF_IDS.forEach((id) => {
    staff[id].burnout = clamp(staff[id].burnout - 3, 0, 100);
    staff[id].morale = clamp(staff[id].morale + (result >= 0 ? 1 : -1), 0, 100);
  });
  staff.tension = clamp(staff.tension - (staff.chief.morale >= 60 ? 5 : 2), 0, 100);
  return { ...game, staff };
}

export function recordCampaignStrategy(previous, next, context = {}) {
  if (!previous || !next || next === previous) return next;
  const old = previous.strategyProfile || {};
  const stateActions = { ...(old.stateActions || {}) };
  const issueFocus = { ...(old.issueFocus || {}) };
  const states = context.type === 'ad' || (context.actionId === 'ops' && context.abbrs)
    ? (context.abbrs || []).filter(Boolean)
    : [context.abbr || context.abbrs?.[0]].filter(Boolean);
  const stateWeight = context.type === 'ad' ? 2 : context.type === 'promise' ? 1.5 : 1;
  states.forEach((abbr) => { stateActions[abbr] = finite(stateActions[abbr], 0) + stateWeight; });
  if (context.issueId) issueFocus[context.issueId] = finite(issueFocus[context.issueId], 0) + (context.type === 'ad' ? 2 : 1);
  const messages = [...(old.messages || [])];
  if (context.issueId) messages.push({ issueId: context.issueId, week: previous.week || 0, type: context.type });
  return { ...next, strategyProfile: { stateActions, issueFocus, messages: messages.slice(-20) } };
}

export function decayCampaignStrategy(game) {
  const old = game?.strategyProfile || {};
  const decay = (source) => Object.fromEntries(
    Object.entries(source || {}).map(([key, value]) => [key, round1(finite(value, 0) * 0.62)]).filter(([, value]) => Number(value) >= 0.15)
  );
  return {
    ...game,
    strategyProfile: {
      stateActions: decay(old.stateActions),
      issueFocus: decay(old.issueFocus),
      messages: (old.messages || []).filter((message) => finite(game.week, 0) - finite(message.week, 0) <= 4).slice(-20),
    },
  };
}

const MILESTONE_SEEDS = [
  { id: 'debate-one', weeksBefore: 11, kind: 'Debate', title: 'First presidential debate', detail: 'Debate prep competes with field work this week.', states: ['PA', 'MI'], tactic: 'Bank a prep action, then protect the closest state.' },
  { id: 'registration-pa', weeksBefore: 4, kind: 'State deadline', title: 'Pennsylvania registration deadline', detail: 'The in-game registration window closes before early voting.', states: ['PA'], tactic: 'Use a state action or paid media to remind voters.' },
  { id: 'debate-two', weeksBefore: 7, kind: 'Debate', title: 'Second presidential debate', detail: 'A town-hall format puts answers and preparation on display.', states: ['MI', 'WI'], tactic: 'Choose between debate prep and a visible state visit.' },
  { id: 'early-nc', weeksBefore: 4, kind: 'Early voting', title: 'North Carolina early voting opens', detail: 'The first major in-game early-vote wave begins.', states: ['NC', 'GA'], tactic: 'Prioritize field operations and turnout in the Southeast.' },
  { id: 'registration-mi', weeksBefore: 3, kind: 'State deadline', title: 'Michigan and Wisconsin registration deadlines', detail: 'Two Great Lakes states reach their modeled registration cutoff.', states: ['MI', 'WI'], tactic: 'Concentrate organizers or late advertising in one state.' },
  { id: 'early-pa', weeksBefore: 3, kind: 'Early voting', title: 'Pennsylvania early voting opens', detail: 'Mail and in-person voting begin in the largest Blue Wall prize.', states: ['PA'], tactic: 'Protect the field budget for voter contact.' },
  { id: 'early-sunbelt', weeksBefore: 3, kind: 'Early voting', title: 'Arizona, Georgia, and Nevada early voting', detail: 'The Sun Belt early-vote window opens across three battlegrounds.', states: ['AZ', 'GA', 'NV'], tactic: 'Pick one state for field work; cover the others with media.' },
  { id: 'debate-three', weeksBefore: 4, kind: 'Debate', title: 'Final presidential debate', detail: 'The last national stage before voting is nearly complete.', states: ['PA', 'AZ'], tactic: 'Spend remaining prep, then move to turnout.' },
  { id: 'final-week', weeksBefore: 1, kind: 'Final week', title: 'Election week', detail: 'Most persuadable voters have heard the case. Turnout and execution matter most.', states: ['PA', 'MI', 'WI', 'GA', 'AZ', 'NV', 'NC'], tactic: 'Spend on the states your field team can still reach.' },
];

export function campaignCalendar(game) {
  const totalWeeks = Math.max(1, finite(game?.totalWeeks, 14));
  return MILESTONE_SEEDS.map((milestone) => ({
    ...milestone,
    week: clamp(totalWeeks - milestone.weeksBefore, 0, totalWeeks - 1),
    states: milestone.states.filter((abbr) => STATE_BY_ABBR[abbr]),
  })).sort((a, b) => a.week - b.week || a.title.localeCompare(b.title));
}

export function upcomingMilestones(game, limit = 5) {
  return campaignCalendar(game).filter((item) => item.week >= finite(game?.week, 0)).slice(0, limit);
}
