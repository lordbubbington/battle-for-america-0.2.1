import { ISSUE_BY_ID } from '@/data/platform';
import { queueTriggeredEventResponses } from '@/lib/triggeredEventCatalog';
import { isCommittedIncidentReceipt } from '@/lib/triggeredEventProducers';

const ISSUE_LABELS = {
  economy: 'the economy', healthcare: 'health care', immigration: 'immigration', democracy: 'democracy',
  climate: 'climate policy', abortion: 'abortion policy', education: 'education', labor: 'labor policy',
};

function baseEvent(receipt, { title, text, icon = 'news', kicker = 'Campaign response', tone = 'press', choices }) {
  return {
    id: `response-${receipt.id}`,
    title,
    text,
    icon,
    kicker,
    tone,
    choices,
    receiptKey: receipt.id,
    receiptRecap: receipt.recap,
  };
}

/** Build a response card only from a recorded, factual incident. */
export function responseForReceipt(receipt) {
  const p = receipt?.payload || {};
  if (!receipt?.id) return null;

  if (receipt.sourceType === 'faction-milestone' && p.milestone && [0, 100].includes(p.threshold)) {
    const milestone = p.milestone;
    const faction = p.factionLabel || milestone.factionLabel || 'Party faction';
    if (p.threshold === 0) {
      return baseEvent(receipt, {
        title: milestone.title || `${faction} Leaves the Campaign`,
        icon: 'community',
        kicker: 'Faction crisis',
        tone: 'warning',
        text: `${milestone.text || `${faction} has abandoned the campaign.`} The damage has already landed. One response cannot erase the break; the crisis remains until support is rebuilt.`,
        choices: [
          { label: 'Start rebuilding the relationship', detail: 'Spend $4M and regain 12 standing. The crisis remains until the faction climbs back above 20.', effects: { funds: -4, factions: { [p.factionId]: 12 } }, outcome: `${faction} accepts a first step toward rebuilding, but the field and fundraising damage already caused will remain until support is repaired.` },
          { label: 'Absorb the loss and move on', detail: 'Preserve the faction’s remaining distance from the campaign and focus on the next week.', effects: { mom: -0.4, oppMom: -0.3 }, outcome: `The campaign moves on without ${faction}. Its support and the immediate damage do not return.` },
        ],
      });
    }
    return baseEvent(receipt, {
      title: milestone.title || `${faction} Commits to the Campaign`,
      icon: 'community',
      kicker: 'Faction milestone',
      text: `${faction} has reached full support. ${milestone.text || 'The faction is ready to commit its resources.'} Choose where to deploy the boost.`,
      choices: (milestone.options || []).map((option) => ({
        label: option.label,
        detail: option.detail,
        effects: option.effects || {},
        outcome: option.outcome,
      })),
    });
  }
  if (receipt.sourceType === 'debate-answer' && p.scandal) {
    const transcript = p.reply ? ` The answer on the record was: “${p.reply}”` : '';
    return baseEvent(receipt, {
      title: 'The Debate Clip Is Spreading',
      icon: 'debate',
      text: `Your debate answer, “${p.answer || 'the recorded answer'},” produced a ${p.scandal.level || 'reported'} gaffe.${transcript} The clip is circulating, and the campaign has to decide how to answer it.`,
      choices: [
        { label: 'Release the full exchange', detail: 'Show the answer in context and keep the response factual.', effects: { mom: 1.1 }, outcome: 'The full exchange gives reporters context. Some voters still dislike the original answer, but the campaign looks direct.' },
        { label: 'Acknowledge the miss and move on', detail: 'Own the moment without giving it another full news cycle.', effects: { mom: 0.6, oppMom: -0.3 }, outcome: 'The campaign acknowledges what happened and returns to its planned message.' },
        { label: 'Attack the clip’s framing', detail: 'Push back hard and risk making the clip travel further.', effects: { mom: 0.9, risk: 0.08 }, outcome: 'The counterattack energizes supporters, while reporters keep replaying the answer that started the dispute.' },
      ],
    });
  }

  if (receipt.sourceType === 'policy-position' && p.brokenPromise) {
    const issue = ISSUE_BY_ID[p.issueId]?.label?.toLowerCase() || ISSUE_LABELS[p.issueId] || p.issueId || 'a policy issue';
    const state = receipt.state ? ` in ${receipt.state}` : '';
    return baseEvent(receipt, {
      title: 'A Broken Promise Comes Back',
      icon: 'promise',
      text: `Your recorded position changed after a promise on ${issue}${state}. The rival campaign has the earlier commitment and is using it in its message.`,
      choices: [
        { label: 'Explain what changed', detail: 'Give the reasoning and accept that voters can compare the two positions.', effects: { mom: 0.7 }, outcome: 'The explanation reaches voters who were asking for one. The earlier promise remains part of the record.' },
        { label: 'Restore the promised position', detail: 'Take the political cost of reversing course again.', effects: { mom: 0.3, groups: { moderate: -0.2, 'far left': 0.2 } }, outcome: 'The campaign returns to its commitment. The reversal itself becomes the story.' },
        { label: 'Make the contrast about the rival', detail: 'Turn the response toward the opponent’s record.', effects: { oppMom: -0.8, risk: 0.05 }, outcome: 'The contrast gets airtime, though some voters still want a direct answer about your own promise.' },
      ],
    });
  }

  if (receipt.sourceType === 'advertisement' && p.result && Number.isFinite(p.result.swing)) {
    const state = receipt.state || p.result.abbr || 'the target state';
    const result = p.result.outcome || (p.result.dud ? 'a weak response' : 'a measured response');
    return baseEvent(receipt, {
      title: 'The Ad Buy Gets a Readout',
      icon: 'media',
      text: `The campaign’s ad in ${state} produced ${result} and a recorded ${Math.abs(p.result.swing).toFixed(1)}-point local movement. Decide how to use the result.`,
      choices: [
        { label: 'Put organizers behind the message', detail: 'Use the response to mobilize supporters in the state.', effects: { turnout: receipt.state ? { [receipt.state]: 1.2 } : {} }, outcome: 'Field staff use the measured response to focus their voter contact.' },
        { label: 'Keep the tested message on air', detail: 'Reinforce the message with a small follow-up buy.', effects: { states: receipt.state ? { [receipt.state]: 0.25 } : {}, funds: -1 }, outcome: 'A modest follow-up extends the tested message in the same state.' },
        { label: 'Move on to a different issue', detail: 'Avoid diminishing returns from repeating the same spot.', effects: { mom: 0.35 }, outcome: 'The campaign changes its focus and preserves its remaining ad budget.' },
      ],
    });
  }

  if (receipt.sourceType === 'endorsement-request' && ['endorsed', 'critical', 'withdrawn'].includes(p.status)) {
    const leader = p.leaderName || 'the organization';
    const offered = p.status === 'endorsed' || p.status === 'won';
    return baseEvent(receipt, {
      title: offered ? 'How Should the Campaign Use Its Endorsement?' : 'An Organization Criticizes Your Position',
      icon: 'endorsement',
      text: offered
        ? `${leader} endorsed the campaign under the policy alignment recorded in its relationship ledger. The funds and volunteer support have already been applied; decide how to frame the endorsement.`
        : `${leader} declined the request. The organization’s recorded policy priorities and the campaign’s position remain visible to both sides.`,
      choices: offered
        ? [
            { label: 'Feature the endorsement', detail: 'Bring the aligned group’s support into the public campaign.', effects: { mom: 0.65 }, outcome: 'The campaign highlights the endorsement and its recorded policy alignment.' },
            { label: 'Keep it local', detail: 'Let organizers use the endorsement in states where the group is active.', effects: { states: receipt.state ? { [receipt.state]: 0.18 } : {} }, outcome: 'The campaign uses the endorsement in targeted outreach without a national announcement.' },
            { label: 'Keep the focus on your platform', detail: 'Acknowledge the endorsement without centering the group.', effects: { mom: 0.2 }, outcome: 'The campaign notes the support and continues with its planned message.' },
          ]
        : [
            { label: 'Explain the policy position', detail: 'Answer the criticism and keep your position on the record.', effects: { mom: 0.25 }, outcome: 'The campaign gives a direct explanation of its position.' },
            { label: 'Focus on aligned supporters', detail: 'Keep the campaign’s time on organizations already backing its platform.', effects: { mom: 0.15 }, outcome: 'Staff redirect attention to groups that already align with the campaign.' },
          ],
    });
  }

  if (receipt.sourceType === 'opponent-plan' && (p.moves || []).some((move) => ['ground', 'volunteers'].includes(move.type))) {
    const move = p.moves.find((item) => ['ground', 'volunteers'].includes(item.type));
    const state = move?.state || receipt.state || 'a battleground state';
    const text = move?.text || `The rival campaign has logged a field operation in ${state}.`;
    return baseEvent(receipt, {
      title: 'The Rival Builds a Field Advantage',
      icon: 'field',
      text: `${text}. This move appears in the rival campaign log. Choose a response based on the recorded activity.`,
      choices: [
        { label: 'Match the field investment', detail: 'Spend $3M and a campaign action on volunteers.', effects: { funds: -3, turnout: receipt.state ? { [receipt.state]: 1.4 } : {} }, outcome: 'The campaign commits organizers to the same state.' },
        { label: 'Contest the state with a message', detail: 'Answer in public and shift attention to your issue.', effects: { states: receipt.state ? { [receipt.state]: 0.35 } : {}, mom: 0.3 }, outcome: 'The campaign responds with a focused message based on the rival’s logged move.' },
        { label: 'Protect another priority', detail: 'Do not let one rival action dictate your week.', effects: { mom: 0.2 }, outcome: 'Staff keep the planned schedule and monitor the rival operation.' },
      ],
    });
  }

  return null;
}

export function queueIncidentResponse(receipt, queued = [], game = null) {
  if (!isCommittedIncidentReceipt(receipt, game)) return queued;
  if (receipt?.sourceType === 'endorsement-request') return queued;
  return queueTriggeredEventResponses(receipt, game, queued);
}
