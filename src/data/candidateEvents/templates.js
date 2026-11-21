// Structural builders only. Every call supplies its own situation, approaches and targets.
export const STYLE_NAMES = ['', 'Do you want to take a risk?', 'Small variance or big variance', 'A bad thing is happening; make the most of it or try to stop it', 'Varying levels of risk and reward', 'A good and bad thing happened; mitigate the bad or embrace it', 'Good vibes only', 'Bad vibes only', 'An opponent’s scandal is emerging; how should we capitalize?', 'A scandal is emerging; try to cover it up?', 'A good thing happened; push our luck or bank it'];
const VALUES = {
  momentum: [1, 3, 5, 10], turnout: [1, 2, 3, 6],
  persuasion: [0.1, 0.25, 0.5, 1], cash: [2, 5, 10, 20], group: [1, 2, 5, 10],
};
export function effect(family, tier, sign = 1, side = 'actor') {
  const kind = VALUES[family] ? family : 'group';
  return { kind, amount: sign * VALUES[kind][tier], unit: kind === 'cash' ? 'millions' : 'points',
    target: { side, scope: kind === 'group' ? 'group' : 'national', ...(kind === 'group' ? { selector: family } : {}) },
    scalable: true, sourceText: `${['small', 'medium', 'large', 'massive'][tier]} ${sign > 0 ? 'gain' : 'loss'}: ${family}` };
}
const scandal = (probability, severity) => ({ kind: 'scandal', probability, ...(severity ? { severity } : {}), target: { side: 'actor', scope: 'campaign' }, scalable: false });
const branch = (probability, effects, hidden = false) => ({ probability, effects, ...(hidden ? { hidden: true } : {}) });
export function authorCard({ candidateId, packId, number, title, situation, style, labels, families, tradeoff, grounding, mashup = false }) {
  const e = (slot, tier, sign = 1, side = 'actor') => effect(families[slot], tier, sign, side);
  let packages;
  switch (style) {
    case 1: packages = [[branch(1, [e(0, 2), e(1, 2), scandal(0.7)])], [branch(1, [e(2, 0, -1)])], [branch(0.5, [e(0, 3), e(1, 3)]), branch(0.5, [e(0, 3, -1), e(1, 3, -1)])]]; break;
    case 2: packages = [[branch(1, [e(0, 0), e(1, 0, -1)])], [branch(1, [e(0, 2), e(1, 0, -1), e(2, 0, -1), e(3, 0, -1)])], [branch(1, [e(0, 2), e(1, 2, -1), e(2, 1), e(3, 1, -1)])]]; break;
    case 3: packages = [[branch(1, [e(1, 1), e(0, 2, -1)])], [branch(0.25, []), branch(0.75, [e(0, 2, -1)])], [branch(0.5, [e(0, 0)]), branch(0.5, [e(0, 3, -1)])]]; break;
    case 4: packages = [[branch(1, [e(0, 2), scandal(0.5)])], [branch(1, [e(1, 2), scandal(0.3)])], [branch(1, [e(2, 1), scandal(0.05)])]]; break;
    case 5: packages = [[branch(1, [e(0, 2), e(1, 2, -1)])], [branch(1, [e(0, 0), e(1, 0, -1)])], [branch(0.5, [e(0, 3)]), branch(0.5, [e(1, 3, -1)])]]; break;
    case 6: case 7: { const sign = style === 6 ? 1 : -1; packages = [0, 1, 2].map((offset) => [branch(1, [e(offset, 2, sign), e((offset + 1) % 3, 1, sign), e((offset + 2) % 3, 0, sign)])]); break; }
    case 8: packages = [[branch(1, [e(0, 2, -1, 'opponent'), e(1, 2, -1, 'opponent')])], [branch(0.6, [e(0, 3, -1, 'opponent'), e(1, 3, -1, 'opponent')]), branch(0.4, [])]]; break;
    case 9: packages = [[branch(1, [e(0, 1), e(1, 1), scandal(1)])], [branch(1, [scandal(0.6, 'double')])]]; break;
    case 10: packages = [[branch(1, [e(0, 1)])], [branch(0.5, [e(0, 0)]), branch(0.45, [e(0, 2)]), branch(0.05, [e(0, 3)], true)]]; break;
    default: throw new Error(`Unknown framework ${style}`);
  }
  // Tier utility is a transparent authoring comparison, never an engine mechanic.
  // S/M/L/Massive = 1/2/3/6; ordinary scandal = -6, double = -12.
  const expected = packages.map((branches) => branches.reduce((sum, b) => sum + b.probability * b.effects.reduce((n, v) => {
    if (v.kind === 'scandal') return n - v.probability * (v.severity === 'double' ? 12 : 6);
    const index = VALUES[v.kind].findIndex((value) => value === Math.abs(v.amount));
    return n + [1, 2, 3, 6][index] * Math.sign(v.amount) * (v.target.side === 'opponent' ? -1 : 1);
  }, 0), 0));
  const mean = expected.reduce((a, b) => a + b, 0) / expected.length;
  return { id: `ce-${candidateId.replaceAll('_', '-')}-${String(number).padStart(2, '0')}`, candidateId, packId, title,
    flavor: `Fictional campaign simulation: ${situation}`, style, styleName: STYLE_NAMES[style], mashup,
    polarity: mean > 0.01 ? 'positive' : mean < -0.01 ? 'negative' : 'mixed',
    triggerText: `From the second campaign week, while ${candidateId} is an active presidential nominee with ballot access.`,
    trigger: { kind: 'candidate-event', minWeek: 1, maxWeek: null, scenarios: [], states: [] },
    choices: packages.map((branches, index) => ({ id: `choice-${index + 1}`, label: labels[index], preview: '', branches })),
    source: { document: 'candidate-pack-authoring', tableRow: Number(packId.replace(/\D/g, '')) },
    authorship: { grounding, framework: `${style}: ${STYLE_NAMES[style]}`, tradeoff, expectedActorTierUtility: expected,
      polarityMethod: 'Equal-choice mean of expected actor-relative normalized tiers; scandal harm rated six tiers, double twelve. This review heuristic is not an engine effect or a claim of universal option value.',
      perspective: 'actor is this ticket, including when rival; opponent is its primary rival for player actors and player for rival actors.',
      dominanceReview: 'Different scarce objectives or distinct downside variance; no same-target same-upside cheaper/riskless duplicate.' } };
}
