export const FACTION_CONFLICT_EVENTS = [
  {
    id: 'faction-conflict-dem-labor-moderates', oncePerScenario: true, partyOnly: 'dem', factionConflict: { factions: ['labor', 'suburbs'] },
    title: 'A Workplace Pledge Splits the Coalition', kicker: 'Labor and suburban Democrats', tone: 'chaos', icon: 'tools',
    text: 'Labor Democrats want a stronger workplace pledge before the convention. New Democrat Moderates warn that a sharper commitment could make competitive suburbs harder to hold. Both groups expect the campaign to choose a direction.',
    choices: [
      { label: 'Put the labor pledge in writing', detail: 'Strengthen union outreach and accept a harder sell to moderates.', effects: { factions: { labor: 3, suburbs: -2 }, groups: { noncollege: 1.2, moderate: -0.6 }, states: { MI: 0.25, PA: 0.25 }, funds: -2 }, outcome: 'The campaign makes the labor commitment. Union outreach improves, while some suburban leaders object to the sharper pledge.' },
      { label: 'Use flexible language for competitive districts', detail: 'Protect moderate persuasion while labor leaders question the commitment.', effects: { factions: { suburbs: 3, labor: -2 }, groups: { moderate: 1.1, noncollege: -0.5 }, states: { AZ: 0.25, PA: 0.2 }, mom: 0.3 }, outcome: 'The campaign keeps room for district-level language. Moderates stay engaged, while labor leaders ask for a clearer promise.' },
      { label: 'Fund a joint workplace and suburb message', detail: 'Spend money to explain the pledge to both groups.', effects: { factions: { labor: 1, suburbs: 1 }, groups: { noncollege: 0.4, moderate: 0.4 }, funds: -5 }, outcome: 'A shared message gives both groups a place in the campaign, at the cost of a targeted communications buy.' },
    ],
  },
  {
    id: 'faction-conflict-rep-faith-business', oncePerScenario: true, partyOnly: 'rep', factionConflict: { factions: ['religious', 'business'] },
    title: 'A Social Pledge Meets a Business Warning', kicker: 'Religious and business Republicans', tone: 'chaos', icon: 'civic-building',
    text: 'Religious Conservatives want a clear social-policy commitment. Free-Market Republicans warn that a new platform pledge will crowd out their economic message and unsettle business allies.',
    choices: [
      { label: 'Make the social-policy commitment', detail: 'Bring faith surrogates into the campaign and accept donor unease.', effects: { factions: { religious: 3, business: -2 }, groups: { evangelical: 1.2, moderate: -0.4 }, turnout: { GA: 1.5, NC: 1.5 } }, outcome: 'Faith leaders welcome the commitment and begin organizing. Business allies ask the campaign to keep the economic agenda in view.' },
      { label: 'Keep the platform focused on the economy', detail: 'Retain business support while religious conservatives wait for a clearer answer.', effects: { factions: { business: 3, religious: -2 }, groups: { conservative: 0.8, evangelical: -0.5 }, funds: 2 }, outcome: 'Business groups stay with the campaign’s economic message. Faith leaders say the social-policy question remains unanswered.' },
      { label: 'Pair the commitment with a fiscal explanation', detail: 'Spend money and effort to keep both groups at the table.', effects: { factions: { religious: 1, business: 1 }, groups: { evangelical: 0.5, conservative: 0.4 }, funds: -4 }, outcome: 'The campaign presents both commitments together. Neither faction gets everything it wanted, but both remain involved.' },
    ],
  },
  {
    id: 'faction-conflict-lib-activists-officers', oncePerScenario: true, partyOnly: 'lib', factionConflict: { factions: ['activists', 'officials'] },
    title: 'Civil-Liberties Language Risks Ballot Access', kicker: 'Libertarian activists and party officers', tone: 'chaos', icon: 'civic-building',
    text: 'Libertarian Party Activists want an uncompromising civil-liberties message. Party Officers warn that provocative language could make ballot-access work and local coalition agreements harder.',
    choices: [
      { label: 'Use the uncompromising message', detail: 'Energize liberty supporters while making ballot work more difficult.', effects: { factions: { activists: 3, officials: -2 }, groups: { libertarian: 1.2 }, turnout: { AZ: 1.5, NV: 1.5 } }, outcome: 'Activists carry the message into the field. Party officers warn that local ballot-access conversations will need extra care.' },
      { label: 'Use broader ballot-access language', detail: 'Protect state-party work while asking activists to accept a less absolute line.', effects: { factions: { officials: 3, activists: -2 }, groups: { moderate: 0.5, libertarian: -0.4 }, states: { AZ: 0.3, NV: 0.3 }, funds: 1 }, outcome: 'Party officers keep local agreements moving. Some activists say the message has lost its edge.' },
      { label: 'Separate the national and state messages', detail: 'Spend time coordinating tailored language with local organizers.', effects: { factions: { officials: 1, activists: 1 }, groups: { libertarian: 0.5 }, funds: -3, mom: 0.2 }, outcome: 'Local campaigns receive tailored language and both groups remain engaged, though coordination consumes time and money.' },
    ],
  },
  {
    id: 'faction-conflict-grn-climate-officials', oncePerScenario: true, partyOnly: 'grn', factionConflict: { factions: ['climate', 'officials'] },
    title: 'A Binding Energy Target Divides Greens', kicker: 'Climate groups and Green local officials', tone: 'chaos', icon: 'plant',
    text: 'Climate Action Greens want a binding energy target in the platform. Green Party Local Officials warn that a rigid commitment will constrain local coalition deals and city-level priorities.',
    choices: [
      { label: 'Adopt the binding target', detail: 'Give climate organizations a clear commitment and narrow local flexibility.', effects: { factions: { climate: 3, officials: -2 }, groups: { 'far left': 1.1, under30: 0.5 }, states: { MI: 0.2, WI: 0.2 } }, outcome: 'Climate groups begin organizing around the target. Local officials ask for flexibility when they negotiate city and county agreements.' },
      { label: 'Let local campaigns shape the target', detail: 'Protect local deals while climate organizers ask for a stronger national promise.', effects: { factions: { officials: 3, climate: -2 }, groups: { moderate: 0.6, 'far left': -0.4 }, funds: 1 }, outcome: 'Local officials keep room for coalition agreements. Climate organizations say the platform still lacks a binding commitment.' },
      { label: 'Commit nationally and fund local transition plans', detail: 'Spend campaign money to pair the target with local implementation.', effects: { factions: { climate: 1, officials: 1 }, groups: { 'far left': 0.6, moderate: 0.3 }, funds: -4 }, outcome: 'The campaign pairs its target with local implementation plans. Both groups see their priorities represented, at a real cost.' },
    ],
  },
  {
    id: 'faction-conflict-dem-donor-activists', oncePerScenario: true, partyOnly: 'dem', factionConflict: { factions: ['donors', 'activists'] },
    title: 'A Fundraising Gala Comes with a Message Change', kicker: 'Democratic donors and progressive organizers', tone: 'chaos', icon: 'business',
    text: 'The Democratic Donor Network offers a high-dollar fundraising event if the campaign softens a line that Progressive Democrats consider central. The finance staff wants an answer before invitations go out.',
    choices: [
      { label: 'Accept the donor’s requested language', detail: 'Take the fundraising opportunity and strain ties with progressive organizers.', effects: { factions: { donors: 3, activists: -2 }, funds: 10, groups: { moderate: 0.6, 'far left': -0.6 } }, outcome: 'The event raises money, but progressive organizers object to the softened message.' },
      { label: 'Keep the progressive line', detail: 'Protect activist trust and give up the gala contribution.', effects: { factions: { activists: 3, donors: -2 }, groups: { 'far left': 0.8 }, mom: 0.4 }, outcome: 'Organizers welcome the decision. The fundraising event is canceled and the campaign gives up the contribution.' },
    ],
  },
  {
    id: 'faction-conflict-rep-donor-base', oncePerScenario: true, partyOnly: 'rep', factionConflict: { factions: ['donors', 'base'] },
    title: 'A Finance Dinner Wants a Different Speech', kicker: 'Republican donors and MAGA populists', tone: 'chaos', icon: 'business',
    text: 'The Republican Donor Network will host a major finance dinner if the candidate tones down an attack on corporate influence. MAGA Populists say that attack is one of the campaign’s defining promises.',
    choices: [
      { label: 'Take the dinner and soften the attack', detail: 'Bring in campaign money while risking populist anger.', effects: { factions: { donors: 3, base: -2 }, funds: 10, groups: { moderate: 0.6, populistright: -0.6 } }, outcome: 'The dinner raises money, but populist organizers say the campaign backed away from its promise.' },
      { label: 'Keep the anti-corporate message', detail: 'Protect base trust and forgo the donor event.', effects: { factions: { base: 3, donors: -2 }, groups: { populistright: 0.8 }, mom: 0.4 }, outcome: 'Rally organizers welcome the decision. The finance dinner is canceled and the contribution is lost.' },
    ],
  },
  {
    id: 'faction-conflict-lib-donor-activists', oncePerScenario: true, partyOnly: 'lib', factionConflict: { factions: ['donors', 'activists'] },
    title: 'A Major Gift Requires a Campaign Promise', kicker: 'Libertarian donors and party activists', tone: 'chaos', icon: 'business',
    text: 'Libertarian Donors offer a large fundraising event if the campaign adds a pledge for business deregulation. Party Activists warn that taking the money could undercut the campaign’s civil-liberties message.',
    choices: [
      { label: 'Add the pledge and accept the gift', detail: 'Take the money and risk making activists question the platform.', effects: { factions: { donors: 3, activists: -2 }, funds: 8, groups: { conservative: 0.5, libertarian: -0.4 } }, outcome: 'The donors deliver their contribution. Activists say the added pledge has shifted the campaign’s priorities.' },
      { label: 'Keep the platform focused on civil liberties', detail: 'Protect activist trust and decline the fundraising event.', effects: { factions: { activists: 3, donors: -2 }, groups: { libertarian: 0.8 }, mom: 0.3 }, outcome: 'Activists welcome the choice. The donor event is canceled and its contribution is unavailable.' },
    ],
  },
  {
    id: 'faction-conflict-grn-donor-activists', oncePerScenario: true, partyOnly: 'grn', factionConflict: { factions: ['donors', 'activists'] },
    title: 'A Donor Event Asks for a Quieter Climate Message', kicker: 'Green donors and movement organizers', tone: 'chaos', icon: 'business',
    text: 'The Green Small-Donor Network has a large matching event ready, but its organizers want the campaign to quiet a disruptive climate demand. Green Party Activists say the demand is the reason they joined the campaign.',
    choices: [
      { label: 'Quiet the demand and take the match', detail: 'Raise campaign cash while disappointing movement organizers.', effects: { factions: { donors: 3, activists: -2 }, funds: 8, groups: { moderate: 0.5, 'far left': -0.5 } }, outcome: 'The match brings in money, but movement organizers say the campaign has stepped away from its core demand.' },
      { label: 'Keep the climate demand prominent', detail: 'Protect activist trust and give up the matching contribution.', effects: { factions: { activists: 3, donors: -2 }, groups: { 'far left': 0.8, under30: 0.4 }, mom: 0.3 }, outcome: 'Activists stay engaged. The matching donor event is withdrawn and the campaign forgoes the money.' },
    ],
  },
];