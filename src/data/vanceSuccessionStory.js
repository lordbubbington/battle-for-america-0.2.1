/** Conditional five-step Vance succession arc; effects stay voter-group scoped. */

const groupShift = (moderateSupportPoints, populistSupportPoints) => ({
  type: 'candidate-voter-group-fit',
  groupTags: {
    moderates: moderateSupportPoints,
    populists: populistSupportPoints,
  },
});

const stage = (id, title, summary, choices, final = false) => ({
  id,
  title,
  summary,
  chain: true,
  drawRandomly: false,
  candidateId: 'vance',
  requiresRecordedSuccessionIncident: true,
  requiredPriorStageReceipt: id === 'vance_stage_1' ? null : `vance_stage_${Number(id.slice(-1)) - 1}`,
  choices,
  nextStageId: final ? null : `vance_stage_${Number(id.slice(-1)) + 1}`,
  nextStageDelayWeeks: final ? null : 1,
});

export const VANCE_SUCCESSION_STORY = Object.freeze([
  stage('vance_stage_1', 'Vance Takes the Oath',
    'A recorded succession event places JD Vance in the presidency while he remains an active candidate.', [
      { id: 'vance_transition_institutional', label: 'Emphasize continuity and constitutional duty', effects: [groupShift(2, -1.5)] },
      { id: 'vance_transition_movement', label: 'Present the transition as the movement’s victory', effects: [groupShift(0.5, 0.5)] },
    ]),
  stage('vance_stage_2', 'The New President Sets His Own Course',
    'Vance decides whether his first major policy signal will reassure the center or reassure the populist base.', [
      { id: 'vance_course_independent', label: 'Draw a clear line on one policy', effects: [groupShift(2, -2)] },
      { id: 'vance_course_inherit', label: 'Keep the prior administration’s coalition intact', effects: [groupShift(0.5, 1)] },
    ]),
  stage('vance_stage_3', 'A Cabinet Choice Defines the Presidency',
    'A consequential appointment shows whether the new administration will rely on experienced officials or movement loyalists.', [
      { id: 'vance_cabinet_experienced', label: 'Choose an experienced governing team', effects: [groupShift(2, -2)] },
      { id: 'vance_cabinet_loyalists', label: 'Keep movement allies close', effects: [groupShift(0.4, 1.2)] },
    ]),
  stage('vance_stage_4', 'The First Address Reaches Beyond the Base',
    'The first major presidential address gives voters a clear signal about whether Vance wants a broader coalition.', [
      { id: 'vance_address_unity', label: 'Make a national unity appeal', effects: [groupShift(2.5, -2.5)] },
      { id: 'vance_address_base', label: 'Speak directly to the movement', effects: [groupShift(0.3, 1.2)] },
    ]),
  stage('vance_stage_5', 'Vance Defines His Own Presidency',
    'The final decision turns the succession into a distinct Vance presidency or a continuation of the populist movement.', [
      { id: 'vance_final_independent', label: 'Run as an independent-minded incumbent', effects: [groupShift(1.5, -2)] },
      { id: 'vance_final_successor', label: 'Run as the movement’s chosen successor', effects: [groupShift(0.2, 0.8)] },
    ], true),
]);

/** Queue a stage only from a verified succession and its prior story receipt. */
export function canQueueVanceSuccessionStage({
  candidateId,
  stageId,
  successionIncidentReceipt,
  completedStageIds = [],
}) {
  const definition = VANCE_SUCCESSION_STORY.find((event) => event.id === stageId);
  if (!definition) return { eligible: false, reason: 'unknown-stage' };
  if (candidateId !== definition.candidateId) return { eligible: false, reason: 'candidate-not-vance' };
  if (!successionIncidentReceipt?.id || successionIncidentReceipt.type !== 'presidential-succession') {
    return { eligible: false, reason: 'no-recorded-succession' };
  }
  if (definition.requiredPriorStageReceipt && !completedStageIds.includes(definition.requiredPriorStageReceipt)) {
    return { eligible: false, reason: 'prior-stage-incomplete' };
  }
  return { eligible: true, reason: null, definition };
}

/** Convert the selected stage choice into a voter-model command, once only. */
export function resolveVanceSuccessionChoice({
  campaignId,
  candidateId,
  stageId,
  choiceId,
  successionIncidentReceipt,
  completedStageIds = [],
  appliedReceiptIds = [],
} = {}) {
  const eligibility = canQueueVanceSuccessionStage({
    candidateId,
    stageId,
    successionIncidentReceipt,
    completedStageIds,
  });
  if (!eligibility.eligible) return { ...eligibility, command: null, appliedReceiptIds };
  const choice = eligibility.definition.choices.find((option) => option.id === choiceId);
  if (!choice) return { eligible: false, reason: 'unknown-choice', command: null, appliedReceiptIds };
  const receiptId = `${campaignId}:${stageId}:${choiceId}`;
  if (!campaignId) throw new Error('Vance story choice requires a campaign ID');
  if (appliedReceiptIds.includes(receiptId)) return { eligible: true, command: null, appliedReceiptIds, applied: false };
  return {
    eligible: true,
    applied: true,
    command: {
      type: 'candidate-voter-group-fit',
      candidateId,
      effects: choice.effects,
      resolveThroughExistingVoterModel: true,
      incumbentChange: stageId === 'vance_stage_1'
        ? { incumbentCandidateId: 'vance', sourceIncidentId: successionIncidentReceipt.id }
        : null,
      sourceEventId: stageId,
      choiceId,
      successionIncidentId: successionIncidentReceipt.id,
    },
    completedStageIds: [...completedStageIds, stageId],
    appliedReceiptIds: [...appliedReceiptIds, receiptId],
    nextStageId: eligibility.definition.nextStageId,
    nextStageAvailableAfterWeeks: eligibility.definition.nextStageDelayWeeks,
  };
}
