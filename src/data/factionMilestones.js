export const FACTION_MILESTONES = {
  dem: {
    activists: {
      groupIds: ['far left'], states: ['MI', 'WI', 'PA'],
      atZero: { title: 'The Canvass Goes Dark', text: 'Progressive organizers suspend their canvass. Volunteer operations lose capacity, and aligned turnout slips in the industrial Midwest.', groupPenalty: 1.8, turnoutPenalty: 2.4, crisis: { actionMul: 0.86 } },
      atHundred: { title: 'The Movement Fills the Field', text: 'Progressive organizers have built a campaign-wide canvass surge. Choose where to deploy the extra capacity.', options: [
        { label: 'Send the surge to the industrial Midwest', detail: 'Mobilize progressive voters and unlock one enhanced volunteer operation.', outcome: 'The canvass surge boosts aligned turnout and leaves one volunteer operation funded by the movement.', effects: { groups: { 'far left': 1.3 }, turnout: { MI: 3.2, WI: 3.2, PA: 3.2 }, freeVolunteerOps: 1 } },
        { label: 'Make it a national movement push', detail: 'Spread a smaller turnout lift across the Midwest and raise campaign momentum.', outcome: 'The movement takes its canvass beyond its strongest states and carries the campaign’s message with it.', effects: { groups: { 'far left': 1.6 }, region: { midwest: 1.5 }, mom: 1.4 } },
      ] },
    },
    labor: {
      groupIds: ['noncollege'], states: ['MI', 'WI', 'PA'],
      atZero: { title: 'The Union Halls Close Their Lists', text: 'Labor locals stop sharing phone banks. Workplace outreach weakens, and union households become harder to reach in Michigan, Wisconsin, and Pennsylvania.', groupPenalty: 1.1, turnoutPenalty: 2.2, crisis: { laborFieldMul: 0.58 } },
      atHundred: { title: 'Labor Opens the Industrial States', text: 'Union locals have assembled a coordinated field operation. Choose how to use the new reach.', options: [
        { label: 'Put union members on the doors', detail: 'Focus turnout and persuasion in Michigan, Wisconsin, and Pennsylvania.', outcome: 'Union volunteers add targeted turnout and move aligned households in the industrial states.', effects: { groups: { noncollege: 1.2 }, turnout: { MI: 3, WI: 3, PA: 3 }, states: { MI: 0.35, WI: 0.35, PA: 0.35 } } },
        { label: 'Build a phone bank for the whole region', detail: 'Strengthen the Senate and House field effort in labor states.', outcome: 'Labor locals lend their lists and phone banks to downballot campaigns across the region.', effects: { db: { MI: 0.8, WI: 0.8, PA: 0.8 }, funds: 3, mom: 0.6 } },
      ] },
    },
    suburbs: {
      groupIds: ['moderate', 'college'], states: ['AZ', 'MI', 'NV', 'PA'],
      atZero: { title: 'Suburban Endorsers Step Away', text: 'New Democrat moderates publicly distance themselves from the ticket. The campaign has a harder time persuading moderate voters in competitive suburbs.', groupPenalty: 1.7, crisis: { moderatePersuasionMul: 0.72 } },
      atHundred: { title: 'Suburban Leaders Offer Their Support', text: 'Moderate local leaders are ready to make the case in competitive suburbs. Choose how to use their endorsement.', options: [
        { label: 'Put local validators on the air', detail: 'Improve persuasion among moderates in four competitive states.', outcome: 'Local validators make the campaign’s case to persuadable suburban voters.', effects: { groups: { moderate: 1.8, college: 0.6 }, states: { AZ: 0.4, MI: 0.4, NV: 0.4, PA: 0.4 } } },
        { label: 'Send them into the neighborhoods', detail: 'Turn the endorsement into focused turnout and a small momentum lift.', outcome: 'Moderate supporters organize neighborhood events and bring new voters into the campaign.', effects: { turnout: { AZ: 1.8, MI: 1.8, NV: 1.8, PA: 1.8 }, groups: { moderate: 1.2 }, mom: 1.1 } },
      ] },
    },
    officials: {
      groupIds: ['moderate'], states: ['MI', 'PA', 'WI'],
      atZero: { title: 'State Parties Pull Back', text: 'State-party organizations suspend coordinated field work. Downballot campaigns lose support, and the presidential operation has fewer local organizers.', groupPenalty: 0.9, statePenalty: 0.35, crisis: { downballotPenalty: 0.45, actionMul: 0.92 } },
      atHundred: { title: 'The State Parties Coordinate', text: 'Governors, mayors, and party chairs have agreed on a coordinated push. Choose where their organization goes first.', options: [
        { label: 'Build a shared field operation', detail: 'Add a local margin and a downballot lift in the industrial states.', outcome: 'State parties share staff and voter contact plans across the presidential and downballot campaigns.', effects: { states: { MI: 0.5, PA: 0.5, WI: 0.5 }, db: { MI: 0.8, PA: 0.8, WI: 0.8 }, freeVolunteerOps: 1 } },
        { label: 'Coordinate the battleground map', detail: 'Send a smaller field and downballot boost to four close states.', outcome: 'Party organizations coordinate voter contact in the closest states on the board.', effects: { states: { AZ: 0.3, GA: 0.3, MI: 0.3, PA: 0.3 }, db: { AZ: 0.55, GA: 0.55, MI: 0.55, PA: 0.55 }, mom: 0.8 } },
      ] },
    },
    donors: {
      groupIds: [], states: ['AZ', 'GA', 'MI', 'PA'],
      atZero: { title: 'The Bundlers Cancel Their Events', text: 'Major Democratic bundlers close their calendars. The campaign loses money now and faces a steep reduction in future income until the relationship is rebuilt.', cashPenalty: 10, crisis: { incomeMul: 0.62 } },
      atHundred: { title: 'The Finance Network Opens Its Rolodex', text: 'The donor network has met its goal and is ready to fund the next phase. Choose how to put the money to work.', options: [
        { label: 'Fund the next three weeks', detail: 'Take a cash infusion and a capped weekly income increase.', outcome: 'Bundlers close a major fundraising goal and commit to a short, predictable run of additional support.', effects: { funds: 14, incomeBonus: { amount: 2, weeks: 3 } } },
        { label: 'Buy battleground media now', detail: 'Get immediate cash and a free follow-up ad buy.', outcome: 'The finance network converts its pledge into cash and reserves a media buy for a battleground state.', effects: { funds: 9, freeAds: 1, mom: 0.5 } },
      ] },
    },
  },
  rep: {
    base: {
      groupIds: ['populistright'], states: ['GA', 'NC', 'PA'],
      atZero: { title: 'Rally Organizers Cancel Their Stops', text: 'MAGA organizers cancel appearances and stop bringing volunteers to campaign events. Populist-right turnout and campaign energy fall.', groupPenalty: 1.8, turnoutPenalty: 2.4, momentumPenalty: 1.5, crisis: { actionMul: 0.86, momentumDrift: -0.25 } },
      atHundred: { title: 'The Base Is Ready to Mobilize', text: 'Rally organizers and local chapters are ready for a high-energy volunteer surge. Choose where to send it.', options: [
        { label: 'Mobilize the battleground base', detail: 'Boost turnout in three close states and fund one enhanced volunteer action.', outcome: 'The base launches a battleground canvass and leaves one volunteer operation ready to deploy.', effects: { groups: { populistright: 1.4 }, turnout: { GA: 3, NC: 3, PA: 3 }, freeVolunteerOps: 1 } },
        { label: 'Turn the rallies into a regional push', detail: 'Spread turnout through the South and raise campaign momentum.', outcome: 'Rally organizers carry their turnout operation across the South.', effects: { groups: { populistright: 1.6 }, region: { south: 1.6 }, mom: 1.5 } },
      ] },
    },
    religious: {
      groupIds: ['evangelical'], states: ['GA', 'NC', 'TX'],
      atZero: { title: 'Faith-Network Surrogates Withdraw', text: 'Religious-conservative surrogates stop making appearances. Turnout among aligned religious voters falls in states where the campaign needs them.', groupPenalty: 1.8, turnoutPenalty: 2.2, crisis: { momentumDrift: -0.35 } },
      atHundred: { title: 'Faith Leaders Organize a Turnout Push', text: 'The faith network has assembled trusted surrogates and a coordinated outreach program. Choose how to deploy it.', options: [
        { label: 'Reach voters through local congregations', detail: 'Boost evangelical turnout in three states with a small coalition lift.', outcome: 'Local faith leaders encourage aligned voters to turn out across the campaign’s target states.', effects: { groups: { evangelical: 1.5 }, turnout: { GA: 3, NC: 3, TX: 2.5 } } },
        { label: 'Put a trusted surrogate on the trail', detail: 'Focus on a state appearance and carry the message into nearby states.', outcome: 'A trusted surrogate makes the campaign’s case to religious conservatives in the South.', effects: { groups: { evangelical: 1.2 }, states: { GA: 0.5, NC: 0.5, SC: 0.5 }, mom: 0.9 } },
      ] },
    },
    business: {
      groupIds: ['conservative', 'moderate', 'college'], states: ['AZ', 'GA', 'NC', 'PA'],
      atZero: { title: 'Business Allies Suspend Their Endorsements', text: 'Business groups stop lending their names and outreach lists. Fiscally conservative voters become harder to persuade, and donor relationships weaken.', groupPenalty: 1.5, crisis: { incomeMul: 0.82, moderatePersuasionMul: 0.86 } },
      atHundred: { title: 'Business Groups Offer Media and Validators', text: 'Business allies are prepared to provide in-kind media and local validators. Choose where to spend their political capital.', options: [
        { label: 'Run the business validator campaign', detail: 'Improve persuasion among conservative and moderate voters in battleground states.', outcome: 'Business leaders make a focused case to fiscally conservative voters in competitive states.', effects: { groups: { conservative: 1.2, moderate: 0.8 }, states: { AZ: 0.35, GA: 0.35, NC: 0.35, PA: 0.35 }, freeAds: 1 } },
        { label: 'Put the in-kind media on air', detail: 'Take a smaller persuasion lift and a direct cash contribution.', outcome: 'Business groups provide a media package and direct help for the campaign’s operation.', effects: { funds: 7, groups: { conservative: 1.4 }, mom: 0.7 } },
      ] },
    },
    officials: {
      groupIds: ['conservative'], states: ['AZ', 'GA', 'NC', 'PA'],
      atZero: { title: 'State Organizations Withhold Staff', text: 'Party organizations withhold staff and campaign support. Field capacity and downballot coordination weaken across key states.', groupPenalty: 0.8, statePenalty: 0.35, crisis: { downballotPenalty: 0.45, actionMul: 0.92 } },
      atHundred: { title: 'Governors and Chairs Coordinate a Field Push', text: 'Governors and party chairs are ready to coordinate staff across several campaigns. Choose the first deployment.', options: [
        { label: 'Coordinate a four-state field push', detail: 'Improve the presidential map and downballot support in battlegrounds.', outcome: 'Party organizations combine staff and voter lists in the most competitive states.', effects: { states: { AZ: 0.35, GA: 0.35, NC: 0.35, PA: 0.35 }, db: { AZ: 0.7, GA: 0.7, NC: 0.7, PA: 0.7 }, freeVolunteerOps: 1 } },
        { label: 'Protect the Senate and House ticket', detail: 'Concentrate the coordination benefit on downballot races.', outcome: 'The state organizations concentrate staff and shared lists on downballot races.', effects: { db: { AZ: 1, GA: 1, NC: 1, PA: 1, WI: 0.7 }, funds: 2 } },
      ] },
    },
    donors: {
      groupIds: [], states: ['AZ', 'GA', 'NC', 'PA'],
      atZero: { title: 'The Bundlers Close Their Books', text: 'Major Republican bundlers stop hosting events. The campaign loses money immediately and weekly income remains sharply lower until support returns.', cashPenalty: 10, crisis: { incomeMul: 0.6 } },
      atHundred: { title: 'The Finance Committee Opens Its Network', text: 'The finance committee has hit its target and can fund the next phase. Choose how to use the commitment.', options: [
        { label: 'Bank the short-term income boost', detail: 'Take a cash infusion and additional weekly income for three turns.', outcome: 'The committee makes a one-time contribution and commits to a capped three-week income boost.', effects: { funds: 15, incomeBonus: { amount: 2, weeks: 3 } } },
        { label: 'Fund a battleground media blitz', detail: 'Take a smaller cash infusion and reserve a free ad buy.', outcome: 'The committee puts its money into a battleground ad package and campaign cash.', effects: { funds: 10, freeAds: 1, mom: 0.6 } },
      ] },
    },
  },
  lib: {
    activists: {
      groupIds: ['libertarian'], states: ['AZ', 'NV', 'NH'],
      atZero: { title: 'Local Chapters Stop Canvassing', text: 'Libertarian chapters stop canvassing and sharing volunteer lists. Liberty-supporter turnout falls where the party is most competitive.', groupPenalty: 1.8, turnoutPenalty: 2.2, crisis: { actionMul: 0.84 } },
      atHundred: { title: 'Libertarian Chapters Mobilize Nationwide', text: 'Local chapters have built a coordinated voter-contact network. Choose whether to concentrate or spread the surge.', options: [
        { label: 'Concentrate on competitive states', detail: 'Improve turnout and support in Arizona, Nevada, and New Hampshire.', outcome: 'Chapter volunteers concentrate on states where a stronger field operation can matter.', effects: { groups: { libertarian: 1.5 }, turnout: { AZ: 3, NV: 3, NH: 2.5 }, freeVolunteerOps: 1 } },
        { label: 'Spread the liberty message across the West', detail: 'Take a regional turnout lift and national momentum.', outcome: 'Libertarian organizers extend their voter-contact work across the West.', effects: { groups: { libertarian: 1.8 }, region: { west: 1.4 }, mom: 1.1 } },
      ] },
    },
    students: {
      groupIds: ['under30', 'libertarian'], states: ['AZ', 'MI', 'NV', 'WI'],
      atZero: { title: 'Campus Groups Withdraw', text: 'Student groups withdraw their organizers and digital reach. Youth turnout and the campaign’s online field operation weaken.', groupPenalty: 1.6, turnoutPenalty: 2, crisis: { actionMul: 0.9, momentumDrift: -0.25 } },
      atHundred: { title: 'Campus Organizers Launch a Youth Surge', text: 'Campus organizers can turn their list and digital reach into a focused youth turnout effort. Choose where to concentrate.', options: [
        { label: 'Run a battleground campus drive', detail: 'Mobilize younger and libertarian voters in four competitive states.', outcome: 'Campus chapters hold coordinated registration and turnout drives in key states.', effects: { groups: { under30: 1.4, libertarian: 0.8 }, turnout: { AZ: 2.5, MI: 2.5, NV: 2.5, WI: 2.5 } } },
        { label: 'Fund a digital reach surge', detail: 'Build momentum and add a small national lift among younger voters.', outcome: 'Student groups use their digital network to carry the campaign’s message beyond campus.', effects: { groups: { under30: 1.8 }, states: { AZ: 0.25, MI: 0.25, NV: 0.25, WI: 0.25 }, mom: 1 } },
      ] },
    },
    officials: {
      groupIds: ['libertarian', 'moderate'], states: ['AZ', 'NV', 'NH'],
      atZero: { title: 'Ballot Officers Warn of a Costly Deadline', text: 'Libertarian officers lose the staff and resources needed to protect ballot access. The campaign takes a setback in vulnerable states and loses local coordination.', groupPenalty: 0.8, statePenalty: 0.6, crisis: { actionMul: 0.9, downballotPenalty: 0.25 } },
      atHundred: { title: 'State Officers Secure Ballot Access', text: 'State officers have completed their ballot-access work and can supply a field and filing package. Choose where to use it.', options: [
        { label: 'Protect the competitive-state operation', detail: 'Improve the map and turnout in Arizona, Nevada, and New Hampshire.', outcome: 'State officers secure campaign presence and coordinate local turnout work in competitive states.', effects: { states: { AZ: 0.55, NV: 0.55, NH: 0.45 }, turnout: { AZ: 1.7, NV: 1.7, NH: 1.5 }, funds: 2 } },
        { label: 'Invest in the next ballot deadline', detail: 'Put a filing package behind the campaign and strengthen its local network.', outcome: 'The party reserves filing support and builds a stronger local network for the next deadline.', effects: { groups: { libertarian: 1.3 }, states: { AZ: 0.3, NV: 0.3, NH: 0.3 }, freeVolunteerOps: 1 } },
      ] },
    },
    donors: {
      groupIds: [], states: ['AZ', 'NV', 'NH'],
      atZero: { title: 'Recurring Donors Stop Giving', text: 'Small recurring donations dry up. The campaign loses immediate cash and future income until supporters return.', cashPenalty: 6, crisis: { incomeMul: 0.68 } },
      atHundred: { title: 'Small Donors Fund a Media Push', text: 'Recurring donors have built a strong reserve. Choose between a media buy and a short-term income stream.', options: [
        { label: 'Buy targeted media', detail: 'Take cash for the campaign and reserve one free ad in a competitive state.', outcome: 'Small donors fund a targeted media buy and provide the cash to put it on air.', effects: { funds: 7, freeAds: 1, groups: { libertarian: 0.8 } } },
        { label: 'Grow recurring income', detail: 'Take a smaller cash contribution and add income for three turns.', outcome: 'The donor network turns its support into a capped short-term income increase.', effects: { funds: 4, incomeBonus: { amount: 1.5, weeks: 3 }, mom: 0.5 } },
      ] },
    },
  },
  grn: {
    activists: {
      groupIds: ['far left'], states: ['MI', 'MN', 'PA'],
      atZero: { title: 'Movement Organizers Suspend Field Work', text: 'Green movement organizers suspend canvassing. Base turnout and volunteer capacity fall in states with active field operations.', groupPenalty: 1.8, turnoutPenalty: 2.3, crisis: { actionMul: 0.84 } },
      atHundred: { title: 'The Green Movement Turns Out Its Network', text: 'Movement organizers are ready for a national mobilization. Choose where to put the canvass first.', options: [
        { label: 'Build the Midwest field operation', detail: 'Boost progressive turnout and fund an enhanced volunteer action.', outcome: 'Movement organizers mobilize aligned voters across the Midwest and reserve one enhanced volunteer operation.', effects: { groups: { 'far left': 1.4 }, turnout: { MI: 3, MN: 2.5, WI: 3 }, freeVolunteerOps: 1 } },
        { label: 'Expand the movement’s regional reach', detail: 'Spread turnout and momentum across the Northeast.', outcome: 'Green organizers carry their voter-contact program to nearby states.', effects: { groups: { 'far left': 1.7 }, region: { northeast: 1.4 }, mom: 1 } },
      ] },
    },
    climate: {
      groupIds: ['far left', 'under30'], states: ['MI', 'MN', 'PA', 'WI'],
      atZero: { title: 'Climate Organizations Withdraw Their Staff', text: 'Climate organizations withdraw field staff and endorsements. Climate-message persuasion weakens among aligned voters.', groupPenalty: 1.7, crisis: { moderatePersuasionMul: 0.82 } },
      atHundred: { title: 'Climate Groups Back a Coalition Push', text: 'Climate organizations are ready to bring their staff and endorsements into the campaign. Choose how to focus their support.', options: [
        { label: 'Put organizers in the Great Lakes states', detail: 'Improve aligned support and turnout in four states with climate field staff.', outcome: 'Climate organizers focus their voter-contact operation in the Great Lakes region.', effects: { groups: { 'far left': 1.1, under30: 0.7 }, turnout: { MI: 2, MN: 2, PA: 2, WI: 2 }, states: { MI: 0.25, MN: 0.25, PA: 0.25, WI: 0.25 } } },
        { label: 'Feature the coalition endorsement', detail: 'Raise campaign momentum and improve aligned voter support nationally.', outcome: 'The campaign features the endorsement and its climate-policy alignment.', effects: { groups: { 'far left': 1.5, under30: 0.9 }, mom: 1.2, funds: 2 } },
      ] },
    },
    officials: {
      groupIds: ['far left', 'moderate'], states: ['AZ', 'MI', 'PA', 'WI'],
      atZero: { title: 'Local Green Organizations End Joint Operations', text: 'Local Green organizations abandon joint operations. Field capacity and local ballot support weaken in competitive states.', groupPenalty: 0.8, statePenalty: 0.45, crisis: { actionMul: 0.9, downballotPenalty: 0.25 } },
      atHundred: { title: 'Local Officials Coordinate the State Campaign', text: 'Green local officials can coordinate organizing and ballot work. Choose the states that get the first push.', options: [
        { label: 'Build a multi-state field operation', detail: 'Boost turnout and local support in four competitive states.', outcome: 'Local officials coordinate volunteer operations and ballot support across the target states.', effects: { groups: { 'far left': 0.8 }, turnout: { AZ: 1.7, MI: 1.7, PA: 1.7, WI: 1.7 }, states: { AZ: 0.3, MI: 0.3, PA: 0.3, WI: 0.3 }, freeVolunteerOps: 1 } },
        { label: 'Protect local ballot and downballot work', detail: 'Prioritize local coordination in the states with the strongest organizations.', outcome: 'Local officials put their shared lists and coordination behind downballot races.', effects: { db: { AZ: 0.65, MI: 0.65, PA: 0.65, WI: 0.65 }, funds: 2, mom: 0.5 } },
      ] },
    },
    donors: {
      groupIds: [], states: ['AZ', 'MI', 'PA', 'WI'],
      atZero: { title: 'Small Donors Stop Opening Their Emails', text: 'Recurring Green donors stop responding. The campaign loses immediate cash and future income until supporters return.', cashPenalty: 5, crisis: { incomeMul: 0.68 } },
      atHundred: { title: 'Grassroots Donors Fund the Next Phase', text: 'Small donors have created a reserve for the campaign. Choose between immediate field money and a short income increase.', options: [
        { label: 'Put cash into the field now', detail: 'Take a larger one-time contribution and fund an enhanced volunteer operation.', outcome: 'Grassroots donors put their reserve into campaign cash and a field operation.', effects: { funds: 8, freeVolunteerOps: 1, groups: { 'far left': 0.6 } } },
        { label: 'Sustain the small-donor program', detail: 'Take a smaller immediate contribution and add income for three weeks.', outcome: 'The donor network converts its support into a capped short-term income bonus.', effects: { funds: 4, incomeBonus: { amount: 1.5, weeks: 3 }, mom: 0.5 } },
      ] },
    },
  },
};