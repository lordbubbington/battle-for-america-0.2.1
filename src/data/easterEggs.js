// The easter egg deck.
//
// Six cards that are not supposed to happen. Weight is set below the floor the
// draw uses (0.2), so each one is roughly a 1-in-300 chance of showing up in a
// given week and most campaigns will never see any of them at all.
//
// Effects are written from YOUR candidate's point of view, same as the main
// deck. Two keys only exist in this file:
//   nat     — a margin shift applied in every state at once
//   libSwap — the Republican and Libertarian tickets trade places in the polls
//
// A choice may carry `roll: [...]` instead of `effects`. One branch is picked at
// random on the night, and its effects and outcome are the ones that land.

export const EASTER_EGGS = [
  {
    id: 'egg_alien_endorsement',
    title: 'The Saucers Are Real and They Have a Preferred Candidate',
    icon: 'satellite',
    tone: 'egg',
    weight: 0.05,
    easterEgg: true,
    partyOnly: 'rep',
    kicker: 'Once in a civilization bulletin',
    text: 'At 3:14 on a Tuesday morning, forty-one objects hover over the Mall in a loose triangle and every network cuts to the same feed. A voice like a pipe organ explains that the visitors have observed this planet for nine hundred years and have concluded, with regret, that the Republican ticket is the correct one. Nobody can confirm what they want in exchange. The Pentagon says it is "monitoring the situation." Your campaign manager has already ordered the T-shirts and is not taking questions.',
    choices: [
      {
        label: 'Accept the endorsement',
        detail: 'Nothing about this is a normal decision. Nobody in the room can tell you which way it lands.',
        roll: [
          {
            w: 1,
            effects: { nat: 20, mom: 10 },
            outcome:
              'The ships lay one warm golden light across every media market in the country for eleven minutes and then leave without a word. Every poll in America moves twenty points in a single night. Your opponent’s press conference is attended by nine people and a folding chair.',
          },
          {
            w: 1,
            effects: { libSwap: true },
            outcome:
              'While your campaign sits in a secure briefing room waiting for a decision that never comes, the Libertarian nominee — who owns eleven air-to-air missile silos, a converted Cessna and a strong opinion about federal airspace — flies up and shoots the mothership down over the Panhandle, on camera, in a windbreaker. The country spends the week deciding he should be president. The polls swap your two tickets overnight and nobody asks you about the T-shirts again.',
          },
        ],
      },
      {
        label: 'Decline politely and thank them for their interest',
        detail: 'The dignified option. It polls well with people who own dictionaries.',
        effects: { mom: 4, funds: -6, region: { south: 0.8 } },
        outcome:
          'You release a three-sentence statement about the sanctity of the democratic process and the overwhelming competence of the human race. Editorial boards swoon. A billionaire who was going to fund a super PAC calls to say he has "gone a different direction," which turns out to mean the Libertarian.',
      },
      {
        label: 'Send the running mate to handle the briefing',
        detail: 'Delegate the extraterrestrials. What could go wrong.',
        effects: { mom: -3, funds: 7, risk: 0.2 },
        outcome:
          'Your running mate returns forty hours later with no memory of the meeting, a nosebleed, and a signed agreement nobody can read. Donors are thrilled by the fundraising email. Nobody can explain the agreement, which is now the only question anyone asks you.',
      },
    ],
  },
  {
    id: 'egg_simulation_seam',
    title: 'There Is a Seam in the Sky',
    icon: 'computer',
    tone: 'egg',
    weight: 0.05,
    easterEgg: true,
    kicker: 'Physics department, 2:40 a.m.',
    text: 'A graduate student aiming a telescope at the wrong degree finds a hairline seam in the sky over the Mojave, and behind the seam there is a shape the internet immediately identifies as a browser tab. There is a scoreboard. There is a small bar that reads "actions remaining." It takes seventy-two hours for half the country to conclude that everything is a rendering and the other half to conclude that this explains absolutely everything about the last ten years. Your mother calls twice.',
    choices: [
      {
        label: 'Tell the country the truth: none of this is real',
        detail: 'Radical honesty. The kind of thing that either makes a president or ends a career by Friday.',
        roll: [
          {
            w: 1,
            effects: { nat: 12, mom: 8 },
            outcome:
              'You stand at a podium, look directly into the camera, and say the quiet part at full volume. Something in the country unclenches. Turnout projections jump eleven points, every late-night host does a week of material about your courage, and people start showing up to rallies carrying little cardboard browser windows.',
          },
          {
            w: 1,
            effects: { nat: -10, mom: -10 },
            outcome:
              'The speech is perfect, which is the problem. Fourteen million people decide that if their vote is a rendered asset then there is no reason to render it, and the ones who do show up are mostly there to film the polling place for an audience they now believe is watching. Your numbers fall through the floor and the floor turns out to be a texture.',
          },
        ],
      },
      {
        label: 'Call it a weather balloon and change the subject',
        detail: 'Tested, reliable, and about forty years past its sell-by date.',
        effects: { mom: -2, funds: 5, risk: 0.3 },
        outcome:
          'Three sentences about atmospheric optics and then a pivot to insulin prices. It works for a day. Then a local anchor holds a weather balloon up to a photograph of the seam, live, for ninety seconds, in complete silence.',
      },
      {
        label: 'Announce a federal commission on the nature of reality',
        detail: 'Bipartisan. Well funded. Utterly unanswerable.',
        effects: { mom: 3, funds: -9, region: { west: 0.9 } },
        outcome:
          'The commission has fourteen members, two chairmen and no subpoena power. It produces a two-thousand-page report eight years later that concludes the sky is, quote, "likely load-bearing." The West loves you for taking it seriously.',
      },
    ],
  },
  {
    id: 'egg_bigfoot_filing',
    title: 'Something in the Woods Has Filed Paperwork',
    icon: 'community',
    tone: 'egg',
    weight: 0.05,
    easterEgg: true,
    kicker: 'Skamania County, Tuesday',
    text: 'A seven-foot figure walks into the county clerk’s office, fills out a candidate filing form in flawless cursive, pays the fee in cash, and leaves without a word. The signature reads "S. Quatch." The clerk, who has worked there thirty-one years and has seen everything twice, accepts it, because the form is complete and the fee is correct. He is now on the ballot in one congressional district and, in two separate surveys, leading.',
    choices: [
      {
        label: 'Ask him to co-chair the Washington campaign',
        detail: 'Nobody knows how he votes on anything. Nobody knows how he got a Social Security number.',
        roll: [
          {
            w: 1,
            effects: { states: { WA: 4 }, region: { west: 2.2 }, mom: 7 },
            outcome:
              'He appears at a rally outside Yakima, says exactly four words ("fix the roads"), and the crowd goes up like a struck match. There are forty thousand people on a hillside and none of them can explain afterward what happened. The Pacific Northwest is yours for the rest of the race.',
          },
          {
            w: 1,
            effects: { mom: -7, funds: -4 },
            outcome:
              'He eats the entire press-pool lunch, walks into a lake, and does not come back up. The photographs are all blurry and the story collapses into a two-day argument about whether the county clerk should be recalled. You spend eight thousand dollars on a wildlife consultant.',
          },
        ],
      },
      {
        label: 'Stay out of it entirely',
        detail: 'There is no upside here. There is only the photograph.',
        effects: { mom: 1, region: { west: -0.3 } },
        outcome:
          'You say nothing for six days, which turns out to be the correct amount of nothing. The filing is challenged, the signature is ruled illegible, and the whole thing becomes a beloved local legend that costs you exactly nothing.',
      },
      {
        label: 'Demand an investigation into the clerk',
        detail: 'A paperwork fight about a cryptid. This is what you want to be doing in October.',
        effects: { mom: -4, oppMom: 3, region: { west: -0.8 } },
        outcome:
          'The county commissioners hold a four-hour hearing that is carried live on three networks because nothing else is happening. You come across as the kind of person who would argue with a forest.',
      },
    ],
  },
  {
    id: 'egg_lincoln_ghost',
    title: 'The Lincoln Bedroom Is Occupied',
    icon: 'mystery',
    tone: 'egg',
    weight: 0.05,
    easterEgg: true,
    kicker: 'Residence staff, off the record',
    text: 'A night usher reports that a tall man in a frock coat has been walking the second-floor corridor for a week, and that he is extremely well informed about your tariff position, which he does not care for. He has notes on your posture. He has notes on your Treasury pick. He will not give a surname but keeps saying "four score" and gesturing at the furniture. There is a second set of footprints in the carpet and they are historically accurate.',
    choices: [
      {
        label: 'Take the ghost’s advice on the economy',
        detail: 'He has been right about this before. He has also been dead for a hundred and sixty years.',
        roll: [
          {
            w: 1,
            effects: { mom: 12, region: { northeast: 1.2 } },
            outcome:
              'You rewrite the tariff speech in one night and it is the best thing you have said all year — plain, generous, unafraid. The Northeast, which had written you off in July, comes back one county at a time. Nobody can explain where the language came from and you never tell them.',
          },
          {
            w: 1,
            effects: { mom: -6, risk: 0.75 },
            outcome:
              'A photographer catches you at 2 a.m. in the corridor, mid-argument, addressing a chandelier with considerable force. The photograph is not blurry. It is the most shared image of the entire campaign, and the caption writes itself in about four minutes.',
          },
        ],
      },
      {
        label: 'Have the residence quietly exorcised',
        detail: 'Discreet. Interfaith. Paid for out of a personal account.',
        effects: { mom: 2, funds: -3 },
        outcome:
          'Three clergy, one folklorist and a very expensive carpet cleaner spend a night on the second floor. The footsteps stop. The advice stops. Your poll numbers do not move at all, which is the best possible outcome for a story like this.',
      },
      {
        label: 'Leak it to a friendly reporter',
        detail: 'The country loves a haunted house. The country also loves a punchline.',
        roll: [
          {
            w: 1,
            effects: { mom: 7, funds: 4 },
            outcome:
              'The story runs above the fold with a floor plan and a séance transcript. It is charming, it is harmless, and for five days everyone in America is talking about you in the tone people use for a good dog.',
          },
          {
            w: 1,
            effects: { mom: -8 },
            outcome:
              'The reporter turns out to have the usher’s employment file, the payments, and the note where your chief of staff wrote "don’t let him talk to the second floor again." The story becomes about the cover-up of a ghost, which is somehow worse than the ghost.',
          },
        ],
      },
    ],
  },
  {
    id: 'egg_cow_union',
    title: 'The Cows Have Unionized',
    icon: 'agriculture',
    tone: 'egg',
    weight: 0.05,
    easterEgg: true,
    kicker: 'Dairy belt, 4:40 a.m.',
    text: 'At 4:40 in the morning, every dairy cow in Wisconsin, Minnesota and Iowa lies down and refuses to stand. There are demands, written in a hand no farmer recognizes: hay indexed to inflation, mandatory afternoon naps, a four-day week in July, and a formal apology for something that happened in the 1970s. Milk futures are halted by noon. A man from the USDA describes the situation as "unprecedented in the sense that it has never happened, and also in several other senses."',
    choices: [
      {
        label: 'Meet the cows halfway',
        detail: 'Nobody can tell you what a cow considers a fair offer.',
        roll: [
          {
            w: 1,
            effects: { region: { midwest: 1.8 }, mom: 6 },
            outcome:
              'You show up in a barn with a clipboard and negotiate for ninety minutes in front of eleven cameras. The cows stand up. It is treated, correctly, as the strangest and most effective piece of retail politics of the cycle, and the dairy belt decides you are the one who listens.',
          },
          {
            w: 1,
            effects: { region: { midwest: -1.2 }, mom: -8, funds: -5 },
            outcome:
              'You are photographed crouching in a stall, holding a document, explaining a subsidy schedule to an animal that has already fallen asleep. Milk prices double by Thursday. Every grocery store in the Midwest has your name on the receipt.',
          },
        ],
      },
      {
        label: 'Side with the farmers and the processors',
        detail: 'Cows do not donate. Cows do not vote. Cows are, in fact, cows.',
        effects: { funds: 8, region: { midwest: -0.7 } },
        outcome:
          'You give a firm, reassuring speech about the food supply and accept a large check from a cooperative in the same afternoon. The milk flows again by Monday. The gesture is not lost on anyone standing in a barn at five in the morning.',
      },
      {
        label: 'Promise cheaper cheese for every household in America',
        detail: 'Simple. Popular. Arguably not a federal power.',
        effects: { mom: 3, risk: 0.25, region: { midwest: 0.5 } },
        outcome:
          'The line gets enormous applause and a great local header: CHEESE FOR EVERY TABLE. Two policy shops point out you cannot do this. One points it out in a press release titled "No."',
      },
    ],
  },
  {
    id: 'egg_clone_reveal',
    title: 'There Are Two of Him Now',
    icon: 'brain',
    tone: 'egg',
    weight: 0.05,
    easterEgg: true,
    kicker: 'Facility outside Reno',
    text: 'A second, identical copy of your opponent walks out of a private facility outside Reno and claims, calmly and with documentation, to be the original. Same suit. Same answers. Same tax returns, to the decimal. The party has reviewed the situation and announced that it intends to keep both and let the voters sort it out. Both are now campaigning in Ohio. Neither will say which one is on the ballot.',
    choices: [
      {
        label: 'Challenge the clone to a debate',
        detail: 'Two of them, one of you. There is no rehearsal for this.',
        roll: [
          {
            w: 1,
            effects: { oppMom: -12, mom: 6 },
            outcome:
              'You spend seventy minutes taking apart a man who is standing next to the man you prepared for, and the second one keeps agreeing with you by accident. The clip of both of them nodding at your closing statement runs for a week. Their campaign cancels the next three events.',
          },
          {
            w: 1,
            effects: { mom: -9, oppMom: 4 },
            outcome:
              'The clone is faster, warmer, and better briefed, and when you bring up the voting record he recites it from memory with a sympathy that reads, on camera, as genuine. Your own team watches from the wings with their hands over their mouths.',
          },
        ],
      },
      {
        label: 'Insist, repeatedly, that there is only one of him',
        detail: 'Technically true. Strategically a trap.',
        effects: { mom: 1, risk: 0.2 },
        outcome:
          'You make the point in four separate interviews and each time it sounds more like a man insisting the hallway is empty. The story dies on its own. Some stories do that.',
      },
      {
        label: 'Try to hire the clone',
        detail: 'He has the same resume and none of the history. What could possibly go wrong.',
        roll: [
          {
            w: 1,
            effects: { funds: -10, oppMom: -8 },
            outcome:
              'He defects for a salary and a title, denounces the original at a press conference of his own, and takes eleven points of name recognition with him. Their operation never fully recovers the week.',
          },
          {
            w: 1,
            effects: { funds: -10, mom: -6 },
            outcome:
              'He takes the money, the title, and a photograph of your briefing book, then walks back across the street at the end of the week with all three. Your campaign manager describes the episode, accurately, as "the worst deal in the history of employment."',
          },
        ],
      },
    ],
  },
];