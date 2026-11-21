import { STATE_BY_ABBR } from './states.js';
import { validRivalInterruptionSource } from '../lib/rivalInterruptionRules.js';

// Catalog specs are drawn from docs/triggered-events-design.md. Enabled
// definitions activate from committed receipts with specific evidence.
const SPECS = [
  {
    "choices": [
      {
        "detail": "and steady trust at a short-term momentum cost",
        "label": "Own the mistake"
      },
      {
        "detail": "and rally the base while giving reporters a second day of coverage",
        "label": "Call the clip unfair"
      },
      {
        "detail": "and protect the candidate while risking a perception of avoidance",
        "label": "Send the running mate"
      }
    ],
    "trigger": "A risky answer resolves into an actual debate scandal; the recap displays the answer and recorded scandal severity.",
    "id": "interrupt-001-gaffe-clip",
    "title": "The Clip Before Breakfast",
    "number": "001",
    "sourceTypes": [
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "to limit long-term damage",
        "label": "Release the source and correction"
      },
      {
        "detail": "to preserve the original message but raise scandal risk",
        "label": "Defend the number"
      },
      {
        "detail": "to regain credibility while giving the opponent an easy contrast",
        "label": "Drop the claim"
      }
    ],
    "trigger": "A selected debate answer cites a statistic; the debate recap records the statistic and a fact-check result flags it as unsupported.",
    "id": "interrupt-002-answer-receipts",
    "title": "They Want the Source",
    "number": "002",
    "sourceTypes": [
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "to convert attention into state momentum at a funds cost",
        "label": "Buy local airtime"
      },
      {
        "detail": "for a smaller, safer lift",
        "label": "Let it travel organically"
      },
      {
        "detail": "for a larger lift that may tire voters of the line",
        "label": "Build the whole week around it"
      }
    ],
    "trigger": "A debate answer earns a high response result and its recap marks a clip as widely shared.",
    "id": "interrupt-003-viral-answer",
    "title": "The Answer They Keep Replaying",
    "number": "003",
    "sourceTypes": [
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "for a targeted advantage but risk looking opportunistic",
        "label": "Quote the correction"
      },
      {
        "detail": "to keep focus on your own performance",
        "label": "Move on"
      },
      {
        "detail": "to spread the message with a modest faction tradeoff",
        "label": "Ask the running mate to respond"
      }
    ],
    "trigger": "Add a visible opponent answer during debate resolution; record its factual misstatement and the moderator’s correction before this response is queued.",
    "id": "interrupt-004-opponent-gaffe",
    "title": "The Other Candidate’s Bad Answer",
    "number": "004",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "to repair trust but reopen the issue",
        "label": "Answer it plainly now"
      },
      {
        "detail": "to defend the strategy with a smaller, uneven response",
        "label": "Explain the pivot"
      },
      {
        "detail": "to save time while adding press scrutiny",
        "label": "Keep pivoting"
      }
    ],
    "trigger": "The player selects a debate answer tagged evasive; the transcript recap shows the unanswered question and the opponent’s reply.",
    "id": "interrupt-005-debate-evasion",
    "title": "The Question You Didn’t Answer",
    "number": "005",
    "sourceTypes": [
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "to gain credibility and expose budget risk",
        "label": "Publish a costed outline"
      },
      {
        "detail": "to reduce the commitment and disappoint some supporters",
        "label": "Clarify the pledge"
      },
      {
        "detail": "to preserve the applause while increasing future broken-promise risk",
        "label": "Leave it alone"
      }
    ],
    "trigger": "A debate answer contains a specific pledge; store the exact pledge in the promise ledger and show it in the recap.",
    "id": "interrupt-006-debate-promise",
    "title": "A Promise in the Transcript",
    "number": "006",
    "sourceTypes": [
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "to strengthen one group and lose ground with the other",
        "label": "Reaffirm the answer"
      },
      {
        "detail": "for a smaller compromise",
        "label": "Explain the nuance"
      },
      {
        "detail": "to spend an action and hold both relationships near current levels",
        "label": "Meet each group separately"
      }
    ],
    "trigger": "A debate answer shifts support in opposite directions for two tracked groups; show both group reactions in the post-debate report.",
    "id": "interrupt-007-debate-coalition-split",
    "title": "Two Wings Heard Two Things",
    "number": "007",
    "sourceTypes": [
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "to show ticket unity but share some damage",
        "label": "Stand beside the running mate"
      },
      {
        "detail": "to build their credibility while risking an awkward exchange",
        "label": "Let them correct it directly"
      },
      {
        "detail": "to limit airtime and lose trust with the party faction most invested in the issue",
        "label": "Change the subject"
      }
    ],
    "trigger": "During the running-mate debate, an answer actually records a scandal or factual correction; the debate recap names it.",
    "id": "interrupt-008-vp-debate-gaffe",
    "title": "The Number Two Problem",
    "number": "008",
    "sourceTypes": [
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "to show discipline and invite another question",
        "label": "Correct the briefing publicly"
      },
      {
        "detail": "to reduce future risk without restoring current trust",
        "label": "Quietly replace the page"
      },
      {
        "detail": "to protect leadership while inviting a competence story",
        "label": "Blame the research vendor"
      }
    ],
    "trigger": "A debate answer selects an issue briefing, and the answer result shows the cited detail contradicted the campaign’s saved platform or earlier promise.",
    "id": "interrupt-009-debate-prep-miss",
    "title": "The Briefing Book Was Wrong",
    "number": "009",
    "sourceTypes": [
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "for a modest momentum lift",
        "label": "Claim a narrow win"
      },
      {
        "detail": "to avoid overclaiming",
        "label": "Focus on one specific answer"
      },
      {
        "detail": "to regain candor at the cost of a tough news cycle. Branch text must use the stored verdict, not a generic “you won” line",
        "label": "Concede the weak moment"
      }
    ],
    "trigger": "The debate completes and records a `win`, `edge`, `draw`, or `loss` verdict with its answer picks.",
    "id": "interrupt-010-debate-verdict",
    "title": "The Morning-After Verdict",
    "number": "010",
    "sourceTypes": [
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "to reinforce it locally",
        "label": "Repeat the answer"
      },
      {
        "detail": "to reach a second group while muddying the original line",
        "label": "Add context"
      },
      {
        "detail": "to protect accuracy but risk escalating a minor story",
        "label": "Ask the reporter to correct a detail"
      }
    ],
    "trigger": "A town hall or state visit records a specific unscripted exchange in the action recap; a local reporter quotes it accurately.",
    "id": "interrupt-011-local-reporter",
    "title": "The Reporter Who Was There",
    "number": "011",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to rebuild trust",
        "label": "Put the source on record"
      },
      {
        "detail": "to contain the damage but trigger a follow-up",
        "label": "Correct the wording"
      },
      {
        "detail": "to hold the base while raising scrutiny and faction costs",
        "label": "Stand by the original"
      }
    ],
    "trigger": "The player chooses a press spin; the game records the factual claim and a later news result confirms or contradicts it.",
    "id": "interrupt-012-source-check",
    "title": "The Second Source Calls Back",
    "number": "012",
    "sourceTypes": [
      "press-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for transparency with legal and donor risk",
        "label": "Release the full memo",
        "effects": { "funds": -2, "mom": 0.35, "staff": { "communications": { "morale": 2, "burnout": 1 } } },
        "outcome": "The full text gives reporters context and gives staff a clear record to work from. The legal review costs $2M, and the communications director takes on another day of cleanup."
      },
      {
        "detail": "to calm staff while keeping the story alive",
        "label": "Explain the line at a staff briefing",
        "effects": { "mom": 0.2, "staff": { "communications": { "morale": 3, "burnout": 1 }, "chief": { "morale": 1 }, "tension": { "value": -2 } } },
        "outcome": "The briefing gives staff a consistent explanation and lowers internal tension. The underlying memo remains part of the story."
      },
      {
        "detail": "to protect the candidate and damage staff morale",
        "label": "Disavow the author",
        "effects": { "mom": -0.15, "staff": { "communications": { "morale": -8, "burnout": 2 }, "chief": { "morale": -3 }, "tension": { "value": 6 } } },
        "outcome": "The candidate creates distance from the memo's author, but staff morale falls and internal tension rises as the team sees the response as scapegoating."
      }
    ],
    "trigger": "The existing leaked-memo event resolves and stores the memo’s specific criticized line; the first leak card remains the initiating event.",
    "id": "interrupt-013-memo-leak-reaction",
    "title": "The Memo Has a Second Page",
    "number": "013",
    "sourceTypes": [
      "event-choice"
    ]
  },
  {
    "choices": [
      {
        "detail": "to restore trust and lose the original persuasion lift",
        "label": "Correct all versions"
      },
      {
        "detail": "for a chance to narrow the damage",
        "label": "Challenge the rating with evidence"
      },
      {
        "detail": "to preserve message discipline while risking repeat coverage",
        "label": "Ignore the update"
      }
    ],
    "trigger": "An ad, speech, or spin claim receives a visible fact-check marked partly or wholly false.",
    "id": "interrupt-014-fact-check-correction",
    "title": "The Correction Is in the Update",
    "number": "014",
    "sourceTypes": [
      "advertisement",
      "campaign-action",
      "press-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to give context and let viewers judge the complete exchange",
        "label": "Share the full Q&A record",
        "effects": { "mom": 0.2 },
        "outcome": "The campaign shares all three prompts and the response approaches recorded in the recap. The exchange gains a small credibility lift without changing the audience result."
      },
      {
        "detail": "for stronger immediate reach with a risk that the edit changes the exchange’s meaning",
        "label": "Post a short excerpt",
        "effects": { "mom": 0.45, "risk": 0.025 },
        "outcome": "The campaign shares only part of the recorded Q&A. It reaches more people quickly, with a small chance that viewers or reporters challenge the missing context."
      },
      {
        "detail": "to avoid overproducing a genuine interaction and spend the campaign’s attention elsewhere",
        "label": "Let the moment stand",
        "effects": { "mom": 0.1 },
        "outcome": "The campaign leaves the complete Q&A as recorded and does not recut or amplify it. The moment retains its original audience response."
      }
    ],
    "trigger": "During a recorded public stop, a factual action is logged: the candidate helps, refuses, arrives late, or answers a constituent. The clip is shown in the recap.",
    "id": "interrupt-015-press-pool-moment",
    "title": "The Pool Camera Caught It",
    "number": "015",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to repay access and spend time",
        "label": "Take extra questions"
      },
      {
        "detail": "to control facts but invite criticism",
        "label": "Give a written briefing"
      },
      {
        "detail": "to protect the candidate and worsen press relations",
        "label": "Keep the schedule closed"
      }
    ],
    "trigger": "The player uses a campaign action that explicitly cancels or skips a scheduled press availability; the action log says so.",
    "id": "interrupt-016-availability-skipped",
    "title": "No Questions Today",
    "number": "016",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for accuracy with a smaller audience",
        "label": "Post the full answer"
      },
      {
        "detail": "for reach but amplify it",
        "label": "Use the opponent’s clip in a contrast ad"
      },
      {
        "detail": "to protect the record and risk a second story about the dispute",
        "label": "Ask the outlet for a correction"
      }
    ],
    "trigger": "A campaign quote is clipped in an actual media story; both the clip and full answer are visible in the news panel.",
    "id": "interrupt-017-quote-context",
    "title": "The Full Answer Is Longer",
    "number": "017",
    "sourceTypes": [
      "press-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "and stay on plan",
        "label": "Trust the trend average"
      },
      {
        "detail": "by spending actions in its state",
        "label": "Chase the alarming poll"
      },
      {
        "detail": "to rally supporters but weaken confidence among persuadable voters",
        "label": "Challenge the methodology"
      }
    ],
    "trigger": "Two published polls enter the game with materially different samples or margins; both appear in polling history.",
    "id": "interrupt-018-polling-mismatch",
    "title": "Two Polls, Two Stories",
    "number": "018",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to reset the frame while giving communications staff time to prepare",
        "label": "Give a new answer",
        "effects": { "mom": 0.2, "staff": { "communications": { "morale": 2, "burnout": 1 } } },
        "outcome": "The candidate addresses the lingering story once, then returns to the campaign’s agenda. Communications staff gain a clear response but take on another day of work."
      },
      {
        "detail": "to lower candidate exposure and spend $1M on a supporting appearance",
        "label": "Use a surrogate",
        "effects": { "funds": -1, "mom": 0.15 },
        "outcome": "A trusted surrogate carries the response, keeping the candidate on schedule. The appearance costs $1M and gives the story another brief mention."
      },
      {
        "detail": "to move the campaign while accepting one more day of the same headlines",
        "label": "Return to policy",
        "effects": { "mom": 0.1 },
        "outcome": "The campaign returns to its policy agenda and stops feeding the same story. Coverage fades on its own schedule, leaving the team’s attention available for other work."
      }
    ],
    "trigger": "A campaign story’s salience remains high for multiple recorded updates, and the player has already responded once.",
    "id": "interrupt-019-news-cycle-fatigue",
    "title": "The Story Has Taken Over",
    "number": "019",
    "sourceTypes": [
      "press-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to repair trust",
        "label": "Thank the person who corrected you"
      },
      {
        "detail": "to defend the campaign while extending the news cycle",
        "label": "Explain the disagreement"
      },
      {
        "detail": "to limit the story but preserve lingering voter-group penalties",
        "label": "Move on without comment"
      }
    ],
    "trigger": "A false or inaccurate campaign claim is corrected in public and the correction itself earns a recorded high-salience story.",
    "id": "interrupt-020-correction-goes-viral",
    "title": "The Correction Outruns the Claim",
    "number": "020",
    "sourceTypes": [
      "press-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to consolidate turnout in the state at a $2M cost",
        "label": "Repeat the spot",
        "effects": { "funds": -2, "mom": 0.3 },
        "outcome": "The campaign backs the ad with another round of local attention. It costs $2M and gives the field team a modest momentum lift; the ad’s measured turnout movement remains the original recorded result."
      },
      {
        "detail": "for a smaller, uncertain lift and a $1M production cost",
        "label": "Adapt it for a neighboring state",
        "effects": { "funds": -1, "mom": 0.15, "risk": 0.01 },
        "outcome": "The campaign adapts the message for another market. The $1M production cost buys a smaller possible lift, with a little risk that the line does not travel well."
      },
      {
        "detail": "to keep the turnout gain without further spending",
        "label": "Bank the win",
        "effects": { "mom": 0.1 },
        "outcome": "The campaign keeps the turnout movement already recorded and moves its money to another need. No new polling or turnout bonus is added by this response."
      }
    ],
    "trigger": "A paid ad runs in a named state and its post-buy report records a favorable turnout change there.",
    "id": "interrupt-021-ad-works",
    "title": "The Ad That Moved the Number",
    "number": "021",
    "sourceTypes": [
      "advertisement"
    ]
  },
  {
    "choices": [
      {
        "detail": "to stop further exposure and lose sunk cost",
        "label": "Pull the ad"
      },
      {
        "detail": "to preserve the intended coalition and raise risk",
        "label": "Defend the argument"
      },
      {
        "detail": "to regain control with a new production cost",
        "label": "Replace it with a contrast ad"
      }
    ],
    "trigger": "`adBackfire` records a negative response after an ad actually runs, and the player sees the backfire report.",
    "id": "interrupt-022-ad-backfire-review",
    "title": "The Ad You Have to Explain",
    "number": "022",
    "sourceTypes": [
      "advertisement"
    ]
  },
  {
    "choices": [
      {
        "detail": "for durable ground support",
        "label": "Move it to field offices"
      },
      {
        "detail": "for more impressions with diminishing returns",
        "label": "Extend the buy"
      },
      {
        "detail": "for flexibility and no immediate poll lift",
        "label": "Keep it in reserve"
      }
    ],
    "trigger": "An executed ad purchase returns a recorded lower-than-expected spend while keeping the planned reach.",
    "id": "interrupt-023-ad-budget-surplus",
    "title": "The Buy Came in Under Budget",
    "number": "023",
    "sourceTypes": [
      "advertisement"
    ]
  },
  {
    "choices": [
      {
        "detail": "to fit the group and risk alienating another",
        "label": "Change the messenger"
      },
      {
        "detail": "for a more credible appeal but lower reach",
        "label": "Change the issue frame"
      },
      {
        "detail": "to finish the contracted buy and accept low returns",
        "label": "Leave it running"
      }
    ],
    "trigger": "A completed ad reports strong reach but low response among its named target group.",
    "id": "interrupt-024-targeting-missed",
    "title": "The People You Meant to Reach",
    "number": "024",
    "sourceTypes": [
      "advertisement"
    ]
  },
  {
    "choices": [
      {
        "detail": "for credibility at a schedule cost",
        "label": "Pause and re-record"
      },
      {
        "detail": "to reduce confusion",
        "label": "Keep the ad and add subtitles"
      },
      {
        "detail": "to enlist trusted messengers while spending goodwill",
        "label": "Ask local leaders to explain it"
      }
    ],
    "trigger": "A translated campaign ad runs, then a recorded local response flags an inaccurate phrase or tone.",
    "id": "interrupt-025-translation-feedback",
    "title": "The Translation Does Not Land",
    "number": "025",
    "sourceTypes": [
      "advertisement"
    ]
  },
  {
    "choices": [
      {
        "detail": "to limit damage",
        "label": "Withdraw and correct"
      },
      {
        "detail": "to keep the contrast with reduced impact",
        "label": "Narrow the claim"
      },
      {
        "detail": "to preserve attack momentum while increasing legal and press scrutiny",
        "label": "Keep the spot"
      }
    ],
    "trigger": "A rapid-response ad airs and an on-screen fact-check finds that it claims more than the source supports.",
    "id": "interrupt-026-rapid-response-overreach",
    "title": "The Counter-Ad Overstates It",
    "number": "026",
    "sourceTypes": [
      "advertisement"
    ]
  },
  {
    "choices": [
      {
        "detail": "and accept a delayed window",
        "label": "Take equivalent time later"
      },
      {
        "detail": "for immediate but less certain reach",
        "label": "Move the money to digital"
      },
      {
        "detail": "to protect funds and forgo the slot",
        "label": "Demand a refund"
      }
    ],
    "trigger": "A booked ad is confirmed as pre-empted or undelivered in the media report.",
    "id": "interrupt-027-ad-not-delivered",
    "title": "The Spot Never Made Air",
    "number": "027",
    "sourceTypes": [
      "advertisement"
    ]
  },
  {
    "choices": [
      {
        "detail": "for precision and lower volume",
        "label": "Retarget tightly"
      },
      {
        "detail": "to keep the surprise audience without losing the original",
        "label": "Broaden the message"
      },
      {
        "detail": "to reduce visible conflict but miss a response window",
        "label": "Turn off comments and wait"
      }
    ],
    "trigger": "A digital ad reaches a recorded audience outside its intended segment and comments show an unexpected issue reaction.",
    "id": "interrupt-028-streaming-audience",
    "title": "The Wrong Audience Saw It First",
    "number": "028",
    "sourceTypes": [
      "advertisement"
    ]
  },
  {
    "choices": [
      {
        "detail": "to reward volunteers and risk lower production control",
        "label": "Share it with permission"
      },
      {
        "detail": "to improve reach but blunt its authenticity",
        "label": "Ask for a polished cut"
      },
      {
        "detail": "to preserve trust and accept uneven distribution",
        "label": "Leave it grassroots"
      }
    ],
    "trigger": "A volunteer-produced campaign clip is posted, then reaches a recorded sharing threshold without a paid boost.",
    "id": "interrupt-029-volunteer-video",
    "title": "A Volunteer Made the Better Ad",
    "number": "029",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to protect consistency and anger the group",
        "label": "Disavow it clearly"
      },
      {
        "detail": "to keep the money and absorb a contradiction",
        "label": "Accept the help"
      },
      {
        "detail": "to preserve the relationship at the cost of delay",
        "label": "Ask the group to change the spot"
      }
    ],
    "trigger": "An outside group’s ad runs in the game and its recorded content conflicts with the candidate’s stated position.",
    "id": "interrupt-030-outside-ad",
    "title": "An Ally Bought the Wrong Message",
    "number": "030",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for better data at a one-action cost",
        "label": "Rebuild the walk list"
      },
      {
        "detail": "for broader but weaker contact",
        "label": "Shift volunteers to phones"
      },
      {
        "detail": "to finish the planned turf and waste some volunteer hours",
        "label": "Keep the canvass"
      }
    ],
    "trigger": "A canvass action completes and field staff report low contact rates in the named precincts.",
    "id": "interrupt-031-empty-canvass",
    "title": "The Doors Were Not There",
    "number": "031",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for durable capacity at a funds cost",
        "label": "Open a temporary office"
      },
      {
        "detail": "for quick reach and lower coordination",
        "label": "Send teams to nearby counties"
      },
      {
        "detail": "to contact more voters but lose the local event opportunity",
        "label": "Use them for phone banking"
      }
    ],
    "trigger": "An organizing action records an unexpected volunteer sign-up surge in one state.",
    "id": "interrupt-032-volunteer-surge",
    "title": "They Came Without Being Asked",
    "number": "032",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to gain intimacy with limited reach",
        "label": "Hold the town hall anyway"
      },
      {
        "detail": "to protect energy and look evasive",
        "label": "Move to a volunteer event"
      },
      {
        "detail": "to shift responsibility and invite local criticism",
        "label": "Blame the venue"
      }
    ],
    "trigger": "A campaign visit logs turnout below the announced attendance estimate.",
    "id": "interrupt-033-small-rally",
    "title": "The Room Was Half Full",
    "number": "033",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to reach the crowd but risk safety and message control",
        "label": "Move outside and speak"
      },
      {
        "detail": "for more listening and schedule cost",
        "label": "Split into two events"
      },
      {
        "detail": "to follow rules and disappoint attendees",
        "label": "Keep the room closed"
      }
    ],
    "trigger": "A campaign visit logs attendance above venue capacity and a visible overflow line.",
    "id": "interrupt-034-overflow-crowd",
    "title": "They Could Not Get Everyone Inside",
    "number": "034",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to reduce fatigue",
        "label": "Take a week away"
      },
      {
        "detail": "to maintain contact with less candidate lift",
        "label": "Send the running mate"
      },
      {
        "detail": "to justify the return at a higher risk of diminishing returns",
        "label": "Make one substantive stop"
      }
    ],
    "trigger": "Repeated player visits in one state cause a logged drop in local event engagement, distinct from the general fatigue threshold card.",
    "id": "interrupt-035-local-overexposure",
    "title": "The Local Anchor Is Tired of the Motorcade",
    "number": "035",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to regain access slowly",
        "label": "Negotiate data safeguards"
      },
      {
        "detail": "for independence and a substantial action cost",
        "label": "Build a volunteer list from scratch"
      },
      {
        "detail": "to force a meeting while damaging party relationships",
        "label": "Publicly pressure the chair"
      }
    ],
    "trigger": "A local party chair refuses to share a voter-contact list during an actual field operation; the refusal is written to the action log.",
    "id": "interrupt-036-county-list-refused",
    "title": "The County Chair Keeps the List",
    "number": "036",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for a smaller event with permit risk",
        "label": "Use a nearby public space"
      },
      {
        "detail": "to preserve attendance but reduce reach",
        "label": "Move indoors with the local party"
      },
      {
        "detail": "to save resources and lose earned media",
        "label": "Cancel and call supporters online"
      }
    ],
    "trigger": "A booked campaign venue formally cancels; the cancellation and reason are shown before the response.",
    "id": "interrupt-037-venue-canceled",
    "title": "The Venue Pulled the Permit",
    "number": "037",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to improve future contacts at a short-term cost",
        "label": "Reverify the file"
      },
      {
        "detail": "for a narrower operation",
        "label": "Switch to doors with reliable addresses"
      },
      {
        "detail": "to protect local staff and leave the bad file unresolved",
        "label": "Blame the vendor"
      }
    ],
    "trigger": "A canvass report records a material address or voter-file error in a named district.",
    "id": "interrupt-038-canvass-data-error",
    "title": "The Walk List Has Bad Addresses",
    "number": "038",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to turn out supporters with compliance cost",
        "label": "Deploy poll greeters and rides"
      },
      {
        "detail": "to fill the gap",
        "label": "Move staff to low-turnout counties"
      },
      {
        "detail": "to avoid overreacting and risk missing the early-vote window",
        "label": "Hold the plan"
      }
    ],
    "trigger": "A public early-vote update shows turnout ahead of the game’s projected pace in a targeted state.",
    "id": "interrupt-039-early-vote-spike",
    "title": "The Lines Are Already Long",
    "number": "039",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to build trust and lose other stops",
        "label": "Stay and help locally"
      },
      {
        "detail": "to protect the map but look detached",
        "label": "Leave on schedule"
      },
      {
        "detail": "to keep the message and accept lower local response",
        "label": "Go remote"
      }
    ],
    "trigger": "Weather actually cancels or moves a scheduled state event; the revised itinerary appears in the campaign recap.",
    "id": "interrupt-040-weather-stop",
    "title": "The Storm Rewrote the Schedule",
    "number": "040",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to regain labor support and bind policy",
        "label": "Put a written jobs guarantee on the table"
      },
      {
        "detail": "to reassure moderates and accept weaker field support",
        "label": "Keep the current plan"
      },
      {
        "detail": "to buy time with uncertain results",
        "label": "Offer a listening session"
      }
    ],
    "trigger": "A recorded policy promise or debate answer conflicts with a labor faction priority; the faction’s standing falls and its leader publicly delays endorsement.",
    "id": "interrupt-041-union-endorsement-held",
    "title": "Labor Wants the Written Version",
    "number": "041",
    "sourceTypes": [
      "policy-position",
      "endorsement-request"
    ]
  },
  {
    "choices": [
      {
        "detail": "to cool tensions without changing policy",
        "label": "Meet privately"
      },
      {
        "detail": "to strengthen aligned voters and widen the split",
        "label": "Defend the policy publicly"
      },
      {
        "detail": "to keep the campaign’s distance from the dispute",
        "label": "Ask a friendly faith leader to respond"
      }
    ],
    "trigger": "A policy choice produces a recorded public criticism from a religious-conservative organization relevant to the player’s party.",
    "id": "interrupt-042-faith-leader-rebuke",
    "title": "The Faith Leaders’ Statement",
    "number": "042",
    "sourceTypes": [
      "policy-position"
    ]
  },
  {
    "choices": [
      {
        "detail": "to reassure donors and constrain policy",
        "label": "Issue a narrow commitment"
      },
      {
        "detail": "to protect flexibility and risk lower fundraising",
        "label": "Decline to pre-commit"
      },
      {
        "detail": "to seek a compromise at an action cost",
        "label": "Host a policy roundtable"
      }
    ],
    "trigger": "The candidate gives a recorded fiscal or regulatory answer that leaves a key donor faction uncertain; the faction requests a guarantee.",
    "id": "interrupt-043-business-wing-guarantee",
    "title": "The Business Coalition Wants Certainty",
    "number": "043",
    "sourceTypes": [
      "policy-position"
    ]
  },
  {
    "choices": [
      {
        "detail": "to protect swing-state support",
        "label": "Repeat the bipartisan frame"
      },
      {
        "detail": "to satisfy the base but risk the gain",
        "label": "Add a sharper contrast"
      },
      {
        "detail": "to share credit and reduce candidate exposure",
        "label": "Let the official carry it"
      }
    ],
    "trigger": "A debate or campaign answer records a positive response from persuadable voters and moderate faction support rises.",
    "id": "interrupt-044-moderate-praise",
    "title": "The Quiet Moderates Want Another One",
    "number": "044",
    "sourceTypes": [
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "and negotiate a change",
        "label": "Meet the signers"
      },
      {
        "detail": "to show respect while keeping the policy",
        "label": "Answer the letter publicly"
      },
      {
        "detail": "to protect focus and risk volunteer disengagement",
        "label": "Ignore it"
      }
    ],
    "trigger": "A campaign policy or vote produces a recorded faction statement signed by organizers; the incident ledger captures its demand.",
    "id": "interrupt-045-activist-letter",
    "title": "The Open Letter Has Signatures",
    "number": "045",
    "sourceTypes": [
      "policy-position"
    ]
  },
  {
    "choices": [
      {
        "detail": "and spend time",
        "label": "Repair the relationship privately"
      },
      {
        "detail": "to show independence and lose party machinery",
        "label": "Proceed without them"
      },
      {
        "detail": "to fill the stage with uncertain faction reaction",
        "label": "Invite a rival local official"
      }
    ],
    "trigger": "Party officials decline a scheduled joint appearance after a recorded broken promise or public dispute.",
    "id": "interrupt-046-party-officials-snub",
    "title": "The Chair Is Not Coming",
    "number": "046",
    "sourceTypes": [
      "event-choice"
    ]
  },
  {
    "choices": [
      {
        "detail": "to retain the volunteers and alienate a conflicting group",
        "label": "Accept one request"
      },
      {
        "detail": "to keep the policy with some volunteer loss",
        "label": "Decline and explain why"
      },
      {
        "detail": "to preserve the candidate’s schedule but weaken direct trust",
        "label": "Let the running mate negotiate"
      }
    ],
    "trigger": "Student volunteers actually complete a recruitment drive, then submit a specific policy or scheduling request logged in the field report.",
    "id": "interrupt-047-student-organizers-demand",
    "title": "The Campus Coalition Sets a Condition",
    "number": "047",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to protect ballot access",
        "label": "Send staff and money"
      },
      {
        "detail": "to save funds but divert field time",
        "label": "Recruit allied volunteers"
      },
      {
        "detail": "and accept the risk of losing the line. Hide this event for parties not facing ballot-access rules",
        "label": "Prioritize the presidential map"
      }
    ],
    "trigger": "In a Green Party run, a state signature drive records a shortfall against the game’s ballot-access threshold.",
    "id": "interrupt-048-green-ballot-access",
    "title": "The Petition Team Needs Help",
    "number": "048",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for broader reach and one faction’s resentment",
        "label": "Attend the larger event"
      },
      {
        "detail": "for partial credit",
        "label": "Split the evening with a surrogate"
      },
      {
        "detail": "to preserve both relationships at a credibility cost",
        "label": "Reschedule one leader"
      }
    ],
    "trigger": "Two faction leaders schedule competing events after separate recorded campaign commitments.",
    "id": "interrupt-049-faction-competing-rallies",
    "title": "Two Factions Booked the Same Night",
    "number": "049",
    "sourceTypes": [
      "event-choice"
    ]
  },
  {
    "choices": [
      {
        "detail": "for the promised resource and reduced flexibility",
        "label": "Accept in writing"
      },
      {
        "detail": "for smaller support and lower risk",
        "label": "Counter with a pilot program"
      },
      {
        "detail": "to protect independence and lower the faction standing",
        "label": "Decline clearly"
      }
    ],
    "trigger": "A faction makes a specific offer after a recorded policy discussion: volunteer hours, fundraising, or endorsements in return for a platform commitment.",
    "id": "interrupt-050-faction-policy-trade",
    "title": "A Deal with a Price Tag",
    "number": "050",
    "sourceTypes": [
      "policy-position"
    ]
  },
  {
    "choices": [
      {
        "detail": "to deepen trust",
        "label": "Return for a listening session"
      },
      {
        "detail": "to answer questions with less candidate lift",
        "label": "Send a policy adviser"
      },
      {
        "detail": "to broaden the map and let the relationship cool",
        "label": "Move to another community"
      }
    ],
    "trigger": "A faith-community visit is completed and the recorded voter-group tracker shows a measurable change among that group in the state.",
    "id": "interrupt-051-church-visit-response",
    "title": "The Congregation Heard You",
    "number": "051",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for a stronger local effect and a cost with urban groups",
        "label": "Repeat the new line"
      },
      {
        "detail": "to earn credibility slowly",
        "label": "Explain the policy detail"
      },
      {
        "detail": "to limit coalition tradeoffs and risk looking inconsistent",
        "label": "Return to the prior message"
      }
    ],
    "trigger": "A campaign action changes the candidate’s message in a rural state and the tracker records a response among rural voters.",
    "id": "interrupt-052-rural-pivot-reaction",
    "title": "The Rural Audience Heard the New Line",
    "number": "052",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for a trust gain and high exposure",
        "label": "Answer in Spanish with the candidate"
      },
      {
        "detail": "for credibility and less candidate control",
        "label": "Use a local spokesperson"
      },
      {
        "detail": "to avoid a rushed answer and miss the immediate moment",
        "label": "Revise the ad first"
      }
    ],
    "trigger": "A Spanish-language ad actually runs and the local response ledger records a specific question from the audience.",
    "id": "interrupt-053-spanish-ad-response",
    "title": "The Spanish-Language Spot Gets a Reply",
    "number": "053",
    "sourceTypes": [
      "advertisement"
    ]
  },
  {
    "choices": [
      {
        "detail": "for a chance to repair trust",
        "label": "Take questions without a script"
      },
      {
        "detail": "for detail and less personal connection",
        "label": "Bring a veteran policy lead"
      },
      {
        "detail": "to avoid a bad exchange and lose local goodwill",
        "label": "Decline the event"
      }
    ],
    "trigger": "A debate answer or visit about veterans’ services is shown, then a veterans’ group submits a recorded critique or endorsement.",
    "id": "interrupt-054-veterans-response",
    "title": "Veterans at the VFW Have a Follow-Up",
    "number": "054",
    "sourceTypes": [
      "campaign-action",
      "debate-answer"
    ]
  },
  {
    "choices": [
      {
        "detail": "to support labor and risk employer backlash",
        "label": "Visit the picket line"
      },
      {
        "detail": "for a slower, balanced response",
        "label": "Meet workers and management separately"
      },
      {
        "detail": "to control details and sacrifice a visible moment",
        "label": "Release a written plan"
      }
    ],
    "trigger": "After the existing strike news event or a recorded labor action, an in-state event logs a direct question from affected workers.",
    "id": "interrupt-055-strike-households",
    "title": "The Shift Change Wants an Answer",
    "number": "055",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for trust and message risk",
        "label": "Hold an open Q&A"
      },
      {
        "detail": "for reach with less authenticity",
        "label": "Publish answers online"
      },
      {
        "detail": "for local credibility and reduced candidate control",
        "label": "Ask a student organizer to moderate"
      }
    ],
    "trigger": "A campaign post or campus stop actually draws recorded questions from young voters; the issue and state are logged.",
    "id": "interrupt-056-young-voters-reply",
    "title": "The Student Questions Keep Coming",
    "number": "056",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to reassure some families and polarize others",
        "label": "State the policy clearly"
      },
      {
        "detail": "to build trust without immediate polling gain",
        "label": "Listen before proposing a fix"
      },
      {
        "detail": "to handle detail and limit the candidate’s exposure",
        "label": "Send an education adviser"
      }
    ],
    "trigger": "A school or community event occurs, and the recap records a specific education issue raised by parents.",
    "id": "interrupt-057-suburban-school-board",
    "title": "Parents Ask About the Meeting You Attended",
    "number": "057",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for a human moment and risk",
        "label": "Speak with them on camera"
      },
      {
        "detail": "for a more candid conversation without a media lift",
        "label": "Continue off camera"
      },
      {
        "detail": "to protect schedule and risk appearing distant",
        "label": "Ask staff to follow up"
      }
    ],
    "trigger": "A town-hall question and answer are recorded, then the questioner requests a follow-up at the venue exit or campaign office.",
    "id": "interrupt-058-town-hall-question",
    "title": "The Questioner Followed You Outside",
    "number": "058",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for durable trust and a policy tradeoff",
        "label": "Revise the draft with them"
      },
      {
        "detail": "to widen input and delay the decision",
        "label": "Publish the draft for public comment"
      },
      {
        "detail": "to protect schedule and damage the relationship",
        "label": "Keep the original framework"
      }
    ],
    "trigger": "A water, land, or infrastructure meeting is held and a tribal or local government representative requests changes to the recorded framework.",
    "id": "interrupt-059-tribal-water-meeting",
    "title": "The Water Users Want the Draft",
    "number": "059",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for inclusion at a schedule cost",
        "label": "Move or retrofit the event"
      },
      {
        "detail": "for wider access but less direct contact",
        "label": "Provide an accessible remote option"
      },
      {
        "detail": "to limit disruption while risking lasting criticism",
        "label": "Apologize and continue"
      }
    ],
    "trigger": "A campaign event actually excludes attendees because the selected venue or broadcast lacks an accessibility feature; staff log the barrier.",
    "id": "interrupt-060-disability-access",
    "title": "The Venue Was Not Accessible",
    "number": "060",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to gain credibility and expose tradeoffs",
        "label": "Publish the estimate with a funding source"
      },
      {
        "detail": "to reduce risk and upset supporters",
        "label": "Scale the pledge back"
      },
      {
        "detail": "to preserve the applause and raise broken-promise risk",
        "label": "Keep the original language"
      }
    ],
    "trigger": "A specific promise enters `promiseLedger`; a later policy review records a cost or implementation warning.",
    "id": "interrupt-061-promise-costing",
    "title": "The Promise Meets the Budget Office",
    "number": "061",
    "sourceTypes": [
      "campaign-promise"
    ]
  },
  {
    "choices": [
      {
        "detail": "to restore some trust and keep the new stance",
        "label": "Explain what changed"
      },
      {
        "detail": "to satisfy its supporters and undo the shift",
        "label": "Reaffirm the old pledge"
      },
      {
        "detail": "to rally allies and make the contradiction the story",
        "label": "Attack the timing of the clip"
      }
    ],
    "trigger": "A stance change marks one or more promises broken; the opponent or press actually publishes the saved quote comparison.",
    "id": "interrupt-062-broken-promise-receipt",
    "title": "They Put Your Old Words Side by Side",
    "number": "062",
    "sourceTypes": [
      "policy-position",
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "to turn the pledge into competence",
        "label": "Release the plan"
      },
      {
        "detail": "for a smaller, measurable benefit",
        "label": "Pilot it in the state"
      },
      {
        "detail": "to maximize attention and risk losing the local partner’s confidence",
        "label": "Hold it for the convention"
      }
    ],
    "trigger": "A campaign promise receives a recorded implementation plan from policy staff or a state partner.",
    "id": "interrupt-063-promise-delivery",
    "title": "The Local Plan Is Ready",
    "number": "063",
    "sourceTypes": [
      "campaign-promise"
    ]
  },
  {
    "choices": [
      {
        "detail": "to preserve trust with a short-term poll cost",
        "label": "Clarify the limit now"
      },
      {
        "detail": "and carry implementation risk",
        "label": "Keep the broad promise"
      },
      {
        "detail": "to retain progress without claiming the whole result",
        "label": "Offer a narrower first step"
      }
    ],
    "trigger": "The player makes a promise and the next policy review identifies a material limitation absent from the public pledge.",
    "id": "interrupt-064-promise-oversold",
    "title": "The Fine Print Is Doing the Talking",
    "number": "064",
    "sourceTypes": [
      "campaign-promise"
    ]
  },
  {
    "choices": [
      {
        "detail": "to protect accuracy",
        "label": "Delay the rollout for reconciliation"
      },
      {
        "detail": "for candor but invite attack ads",
        "label": "Publish the range"
      },
      {
        "detail": "to keep the message and increase later correction risk",
        "label": "Choose the lower estimate"
      }
    ],
    "trigger": "Two saved policy estimates conflict after the campaign publishes or discusses a plan; both numbers are present in the briefing.",
    "id": "interrupt-065-cost-estimate-conflict",
    "title": "Two Teams, Two Price Tags",
    "number": "065",
    "sourceTypes": [
      "campaign-promise"
    ]
  },
  {
    "choices": [
      {
        "detail": "to hold the endorsement and change the platform",
        "label": "Accept the amendment"
      },
      {
        "detail": "to protect policy and risk the group’s support",
        "label": "Reject it with reasons"
      },
      {
        "detail": "as a temporary bridge with uncertain trust",
        "label": "Offer a sunset review"
      }
    ],
    "trigger": "A group endorses a policy, then submits a written amendment that would alter the player’s recorded platform.",
    "id": "interrupt-066-advocacy-amendment",
    "title": "The Coalition Wants One Clause Changed",
    "number": "066",
    "sourceTypes": [
      "endorsement-request",
      "policy-position"
    ]
  },
  {
    "choices": [
      {
        "detail": "for credibility and a smaller immediate lift",
        "label": "Revise the timeline"
      },
      {
        "detail": "for ambition and a larger fiscal risk",
        "label": "Keep the target and add resources"
      },
      {
        "detail": "to share the decision and invite more scrutiny",
        "label": "Ask for a public hearing"
      }
    ],
    "trigger": "A policy proposal gets a recorded feasibility review identifying a staffing, timeline, or authority constraint.",
    "id": "interrupt-067-policy-implementation",
    "title": "The Agency Staff Have Questions",
    "number": "067",
    "sourceTypes": [
      "policy-position"
    ]
  },
  {
    "choices": [
      {
        "detail": "to restore consistency and lose supporters of the other",
        "label": "Choose one position"
      },
      {
        "detail": "for broad but less clear support",
        "label": "Publish a compromise"
      },
      {
        "detail": "to defer conflict and make future gaffe triggers more likely",
        "label": "Leave both in place"
      }
    ],
    "trigger": "Two active platform entries contradict each other; the contradiction appears in the campaign’s saved issue brief.",
    "id": "interrupt-068-platform-ambiguity",
    "title": "The Platform Says Two Different Things",
    "number": "068",
    "sourceTypes": [
      "policy-position"
    ]
  },
  {
    "choices": [
      {
        "detail": "to clarify values and polarize local voters",
        "label": "Take a public position"
      },
      {
        "detail": "to avoid a false promise and look evasive",
        "label": "Explain federal limits"
      },
      {
        "detail": "to reduce candidate risk and share the credit",
        "label": "Ask local supporters to lead"
      }
    ],
    "trigger": "A state ballot measure enters the game and its effects conflict with a recorded candidate pledge.",
    "id": "interrupt-069-ballot-measure-conflict",
    "title": "The State Measure Is on Your Desk",
    "number": "069",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to gain the endorsement and bind the platform",
        "label": "Make the commitment"
      },
      {
        "detail": "for partial support and message risk",
        "label": "Use narrower language"
      },
      {
        "detail": "to preserve independence and lose the endorsement opportunity",
        "label": "Decline the condition"
      }
    ],
    "trigger": "An organization offers an endorsement after a recorded policy meeting and specifies a public commitment it wants.",
    "id": "interrupt-070-policy-endorsement",
    "title": "The Endorsement Depends on One Sentence",
    "number": "070",
    "sourceTypes": [
      "endorsement-request"
    ]
  },
  {
    "choices": [
      {
        "detail": "to repair trust",
        "label": "Release the full context"
      },
      {
        "detail": "to turn it into a biography moment",
        "label": "Use the same clip to explain growth"
      },
      {
        "detail": "to change the subject and raise risk",
        "label": "Counterattack on the opponent’s record"
      }
    ],
    "trigger": "The opponent airs a clip of a prior recorded candidate statement; the ad report shows its state and reach.",
    "id": "interrupt-071-opponent-archive-ad",
    "title": "They Found the Old Footage",
    "number": "071",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "for a high-cost response",
        "label": "Counter with a candidate visit"
      },
      {
        "detail": "for a lower-cost field fight",
        "label": "Send the running mate and organizers"
      },
      {
        "detail": "and accept the rival’s short-term advantage",
        "label": "Protect another state"
      }
    ],
    "trigger": "Opponent strategy records a campaign stop or paid buy in a state the player has neglected; the rival log shows it.",
    "id": "interrupt-072-opponent-enters-state",
    "title": "The Rival Took the Empty Stage",
    "number": "072",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "to gain issue advantage",
        "label": "Quote the correction"
      },
      {
        "detail": "to keep the candidate above the fight",
        "label": "Let a trusted surrogate respond"
      },
      {
        "detail": "to maintain message discipline and let the correction travel slowly",
        "label": "Avoid the story"
      }
    ],
    "trigger": "The opponent makes a factual claim in a recorded event; a visible correction verifies it is wrong.",
    "id": "interrupt-073-opponent-misstatement",
    "title": "The Rival’s Claim Is Wrong",
    "number": "073",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "to secure credit and invite a detail comparison",
        "label": "Claim the original idea"
      },
      {
        "detail": "to appear pragmatic and share ownership",
        "label": "Welcome the agreement"
      },
      {
        "detail": "to keep contrast while defending the policy",
        "label": "Show the differences"
      }
    ],
    "trigger": "The opponent announces a policy that the player already proposed; the news log records both release dates.",
    "id": "interrupt-074-rival-copies-policy",
    "title": "They Borrowed Your Proposal",
    "number": "074",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "to look disciplined",
        "label": "Stay out of it"
      },
      {
        "detail": "and prepare for a rival strategy change",
        "label": "Ask what the departure signals"
      },
      {
        "detail": "to gain attention and risk sympathy for the opponent",
        "label": "Mock the rival’s management"
      }
    ],
    "trigger": "The rival log records a senior staff departure and the departing adviser gives a public explanation.",
    "id": "interrupt-075-opponent-staffer-exit",
    "title": "A Rival Adviser Leaves",
    "number": "075",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "for clarity and attack risk",
        "label": "Compare the plans on one key point"
      },
      {
        "detail": "to answer a real weakness and frustrate prior supporters",
        "label": "Update your proposal"
      },
      {
        "detail": "and make implementation the contrast",
        "label": "Keep the original"
      }
    ],
    "trigger": "After the player publishes a policy, the opponent releases a named counterproposal; both plans appear in the issue briefing.",
    "id": "interrupt-076-rival-policy-counter",
    "title": "They Wrote a Counterproposal Overnight",
    "number": "076",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "to restore accuracy",
        "label": "Correct the record with documentation"
      },
      {
        "detail": "to raise pressure and extend the story",
        "label": "Ask the opponent to disavow it"
      },
      {
        "detail": "to avoid amplifying a weak claim",
        "label": "Ignore the surrogate"
      }
    ],
    "trigger": "An opponent surrogate repeats a claim already logged and corrected by a credible source.",
    "id": "interrupt-077-surrogate-misinformation",
    "title": "Their Surrogate Repeats the Rumor",
    "number": "077",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "and pivot to your policy",
        "label": "Concede the answer was strong"
      },
      {
        "detail": "while preparing a substantive response",
        "label": "Challenge the poll sample"
      },
      {
        "detail": "to regain attention with a risk of another poor exchange",
        "label": "Book a follow-up interview"
      }
    ],
    "trigger": "Opponent debate resolution records a strong answer and an immediate snap-poll gain.",
    "id": "interrupt-078-opponent-debate-snap",
    "title": "The Snap Poll Gives Them the Night",
    "number": "078",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "and focus on your own event",
        "label": "Do not pile on"
      },
      {
        "detail": "to claim competence",
        "label": "Contrast your field operation"
      },
      {
        "detail": "to convert attention without mocking attendees",
        "label": "Invite local voters to your event"
      }
    ],
    "trigger": "Rival log records a low-attendance stop; local coverage confirms the turnout rather than campaign speculation.",
    "id": "interrupt-079-rival-empty-stop",
    "title": "The Opponent’s Event Fell Flat",
    "number": "079",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "to defend the state",
        "label": "Match their investment"
      },
      {
        "detail": "for a calculated counter",
        "label": "Exploit the state they left"
      },
      {
        "detail": "to avoid chasing noise and risk losing initiative",
        "label": "Wait for another poll"
      }
    ],
    "trigger": "The opponent shifts spending or actions toward a state and the campaign dashboard shows the move.",
    "id": "interrupt-080-opponent-map-pivot",
    "title": "The Rival Changed the Map",
    "number": "080",
    "sourceTypes": [
      "opponent-plan"
    ]
  },
  {
    "choices": [
      {
        "detail": "to show ownership",
        "label": "Let the running mate correct it directly"
      },
      {
        "detail": "to share the heat and show unity",
        "label": "Make a joint appearance"
      },
      {
        "detail": "to reduce exposure but look managed",
        "label": "Use the next speech to pivot"
      }
    ],
    "trigger": "A running-mate travel event records a mistaken name, place, or answer; the recap shows the actual clip before any response.",
    "id": "interrupt-081-vp-airport-gaffe",
    "title": "The Airport Clip",
    "number": "081",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to use the momentum",
        "label": "Give the running mate a larger role"
      },
      {
        "detail": "to protect ticket balance",
        "label": "Keep the focus on the nominee"
      },
      {
        "detail": "for a local lift and travel cost",
        "label": "Send them to a target state"
      }
    ],
    "trigger": "A running-mate debate or interview answer records a high-response result and a replayable clip.",
    "id": "interrupt-082-vp-strong-answer",
    "title": "The Running Mate Had the Best Line",
    "number": "082",
    "sourceTypes": [
      "debate-answer",
      "press-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to restore unity and narrow policy language",
        "label": "Clarify the shared position"
      },
      {
        "detail": "to appeal to a wider coalition and invite attacks",
        "label": "Allow a principled difference"
      },
      {
        "detail": "to preserve consistency and risk resentment",
        "label": "Ask the running mate to walk it back"
      }
    ],
    "trigger": "The running mate publicly states a position that conflicts with the candidate’s saved platform; both lines are shown in the news recap.",
    "id": "interrupt-083-vp-platform-split",
    "title": "Your Ticket Disagrees on Camera",
    "number": "083",
    "sourceTypes": [
      "press-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to reward candor and own the line",
        "label": "Stand by the surrogate"
      },
      {
        "detail": "to limit drift",
        "label": "Clarify the campaign position"
      },
      {
        "detail": "to lower risk while damaging surrogate trust",
        "label": "Pause future interviews"
      }
    ],
    "trigger": "An approved surrogate interview includes a recorded unscripted statement that differs from the briefing.",
    "id": "interrupt-084-surrogate-book-interview",
    "title": "The Interview Was Not in the Brief",
    "number": "084",
    "sourceTypes": [
      "press-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for a legitimacy boost and association risk",
        "label": "Share the stage"
      },
      {
        "detail": "for modest reach",
        "label": "Accept the endorsement without an event"
      },
      {
        "detail": "to preserve independence and disappoint party leaders",
        "label": "Keep distance"
      }
    ],
    "trigger": "A former officeholder endorses the ticket in a visible news update; their party and state ties are recorded.",
    "id": "interrupt-085-former-president-endorsement",
    "title": "A Former President Calls",
    "number": "085",
    "sourceTypes": [
      "endorsement-request"
    ]
  },
  {
    "choices": [
      {
        "detail": "to reconcile with schedule cost",
        "label": "Bring them into one room"
      },
      {
        "detail": "to preserve local relationships and widen the story",
        "label": "Let each explain their view"
      },
      {
        "detail": "to restore clarity and lose the other ally’s support",
        "label": "Choose one message"
      }
    ],
    "trigger": "A running mate and an elected official make conflicting recorded statements at separate events.",
    "id": "interrupt-086-vp-and-governor-clash",
    "title": "Two Allies Disagree in Public",
    "number": "086",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to reward the surrogate and expand the platform",
        "label": "Adopt the pledge"
      },
      {
        "detail": "to protect feasibility and cause a short-term trust hit",
        "label": "Correct it promptly"
      },
      {
        "detail": "to leave room for review and draw skepticism",
        "label": "Call it a proposal"
      }
    ],
    "trigger": "A surrogate makes a specific pledge at an event and the campaign log shows it is absent from the candidate’s platform.",
    "id": "interrupt-087-surrogate-overpromise",
    "title": "The Surrogate Promised More Than the Platform",
    "number": "087",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for transparency",
        "label": "Release the relevant documents"
      },
      {
        "detail": "for a personal response with risk",
        "label": "Explain the context in an interview"
      },
      {
        "detail": "to protect privacy and prolong speculation",
        "label": "Decline further comment"
      }
    ],
    "trigger": "A previously approved public record or biography detail is surfaced in a real story and matched to the candidate file; do not invent criminal or private allegations.",
    "id": "interrupt-088-vp-vetting-detail",
    "title": "A Vetting Detail Becomes Public",
    "number": "088",
    "sourceTypes": [
      "press-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to consolidate support",
        "label": "Return with the surrogate"
      },
      {
        "detail": "to stretch resources and share control",
        "label": "Let the surrogate continue alone"
      },
      {
        "detail": "to broaden coverage and leave the local group waiting",
        "label": "Move the nominee to another state"
      }
    ],
    "trigger": "A surrogate visit records unusually strong local response among a named voter group.",
    "id": "interrupt-089-surrogate-wins-district",
    "title": "The Local Surrogate Owns the Room",
    "number": "089",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to show competence and invite policy scrutiny",
        "label": "Describe a joint transition plan"
      },
      {
        "detail": "for warmth and limited detail",
        "label": "Tell a personal story of teamwork"
      },
      {
        "detail": "to defend the ticket and risk seeming evasive",
        "label": "Reject the premise"
      }
    ],
    "trigger": "A debate answer or public event creates a recorded question about whether the ticket is prepared to govern together.",
    "id": "interrupt-090-ticket-security-question",
    "title": "The Second Question Is About Readiness",
    "number": "090",
    "sourceTypes": [
      "debate-answer",
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to preserve funds with a relationship cost",
        "label": "Find a replacement host"
      },
      {
        "detail": "for less immediate money and broader support",
        "label": "Turn it into a small-donor event"
      },
      {
        "detail": "and save the candidate’s time",
        "label": "Cancel the stop"
      }
    ],
    "trigger": "A scheduled fundraiser is canceled by its host and the finance log records the expected amount and state.",
    "id": "interrupt-091-fundraiser-canceled",
    "title": "The Host Had to Cancel",
    "number": "091",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to deepen donor trust at an action cost",
        "label": "Send a thank-you video"
      },
      {
        "detail": "for visible follow-through",
        "label": "Use the funds in the state that drove it"
      },
      {
        "detail": "for later flexibility and risk supporter disappointment",
        "label": "Hold the money"
      }
    ],
    "trigger": "A recorded speech or story produces a verified small-donor spike in the finance ledger.",
    "id": "interrupt-092-small-dollar-surge",
    "title": "The Donations Came in Ten Dollars at a Time",
    "number": "092",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to recover the endorsement with policy cost",
        "label": "Meet their stated concern"
      },
      {
        "detail": "to show independence and harden opposition",
        "label": "Make the disagreement public"
      },
      {
        "detail": "and campaign without the endorsement",
        "label": "Let the deadline pass"
      }
    ],
    "trigger": "A group or elected official publicly delays an expected endorsement after a specific recorded disagreement.",
    "id": "interrupt-093-endorsement-withheld",
    "title": "The Endorsement Is Still Pending",
    "number": "093",
    "sourceTypes": [
      "endorsement-request"
    ]
  },
  {
    "choices": [
      {
        "detail": "for resources and scrutiny",
        "label": "Accept with a public firewall"
      },
      {
        "detail": "for immediate benefit and higher scandal risk",
        "label": "Accept privately"
      },
      {
        "detail": "to protect independence and lose capacity",
        "label": "Decline"
      }
    ],
    "trigger": "A donor or aligned group offers a recorded in-kind contribution tied to a message or policy condition.",
    "id": "interrupt-094-in-kind-condition",
    "title": "The Gift Comes with a Script",
    "number": "094",
    "sourceTypes": [
      "endorsement-request"
    ]
  },
  {
    "choices": [
      {
        "detail": "to build trust",
        "label": "Explain the largest item"
      },
      {
        "detail": "for transparency and opponent research risk",
        "label": "Release a fuller report"
      },
      {
        "detail": "to contain the story and leave unanswered questions",
        "label": "Keep the response narrow"
      }
    ],
    "trigger": "A campaign finance report is filed and the game exposes a real concentration, gap, or unusual spending line.",
    "id": "interrupt-095-finance-report",
    "title": "The Filing Is Public Now",
    "number": "095",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to finish signatures at a cost to the map",
        "label": "Send organizers"
      },
      {
        "detail": "for lower funds cost and uncertain speed",
        "label": "Recruit a legal volunteer team"
      },
      {
        "detail": "to preserve resources and lose ballot access in that state",
        "label": "Drop the filing effort"
      }
    ],
    "trigger": "A third-party or independent campaign’s state petition report records a count below the filing threshold; the shortfall is shown in the state dashboard.",
    "id": "interrupt-096-petition-shortfall",
    "title": "The Signature Count Is Short",
    "number": "096",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to protect access with money and attention cost",
        "label": "Contest it in court"
      },
      {
        "detail": "to settle quickly with volunteer diversion",
        "label": "Correct the challenged signatures"
      },
      {
        "detail": "to reduce risk and accept a smaller presence",
        "label": "Negotiate a narrowed filing"
      }
    ],
    "trigger": "A filed petition faces a documented legal challenge; the state and claim appear in the election update.",
    "id": "interrupt-097-ballot-challenge",
    "title": "The Filing Is Being Challenged",
    "number": "097",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to address the gap and pause persuasion",
        "label": "Move staff to turnout work"
      },
      {
        "detail": "for a narrower mobilization",
        "label": "Contact low-propensity supporters"
      },
      {
        "detail": "to preserve the message and risk leaving supporters home",
        "label": "Stay on persuasion"
      }
    ],
    "trigger": "An early-vote report shows turnout in a targeted state or group below the campaign’s recorded field target.",
    "id": "interrupt-098-early-vote-field-gap",
    "title": "The Returns Do Not Match the Plan",
    "number": "098",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "for broad help and compliance review",
        "label": "Send a neutral voter-information notice"
      },
      {
        "detail": "for trust and less control",
        "label": "Ask local organizations to distribute it"
      },
      {
        "detail": "to avoid partisan optics and risk lower turnout among your supporters",
        "label": "Do nothing"
      }
    ],
    "trigger": "Election officials publicly change a polling location or hours in a named area; the game’s election update shows the affected precinct.",
    "id": "interrupt-099-polling-place-change",
    "title": "The Polling Place Moved",
    "number": "099",
    "sourceTypes": [
      "campaign-action"
    ]
  },
  {
    "choices": [
      {
        "detail": "to protect access and give up message time",
        "label": "Share the official correction"
      },
      {
        "detail": "for broad credibility and coordination cost",
        "label": "Ask bipartisan local officials to explain"
      },
      {
        "detail": "while directing supporters to official sources, limiting amplification but slowing correction",
        "label": "Avoid repeating the rumor"
      }
    ],
    "trigger": "A false claim about voting procedures appears in a recorded local story; the official election source is already visible in the game and contradicts it.",
    "id": "interrupt-100-election-admin-rumor",
    "title": "The Rumor Is Spreading Faster Than the Update",
    "number": "100",
    "sourceTypes": [
      "campaign-action"
    ]
  }
];

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const isVerdict = (value) => ['win', 'edge', 'draw', 'loss'].includes(value);

function currentEvidenceMatches(receipt, game, spec) {
  const p = receipt.payload || {};
  if (spec.number === '001') {
    return receipt.sourceType === 'debate-answer'
      && hasText(p.answer)
      && hasText(p.reply)
      && isObject(p.scandal)
      && hasText(p.scandal.level);
  }
  if (spec.number === '003') {
    return receipt.sourceType === 'debate-answer'
      && Number.isFinite(p.answerScore)
      && p.answerScore >= 1.5
      && p.clip?.status === 'widely-shared'
      && p.clip.minimumMomentum <= p.answerScore;
  }
  if (spec.number === '005') {
    return receipt.sourceType === 'debate-answer'
      && p.evasive === true
      && hasText(p.question)
      && hasText(p.answer)
      && hasText(p.reply);
  }
  if (spec.number === '006') {
    return receipt.sourceType === 'debate-answer'
      && isObject(p.promise)
      && hasText(p.promise.id)
      && hasText(p.promise.text)
      && hasText(p.promise.issueId)
      && hasText(p.answer)
      && p.promiseLedgerId === p.promise.id;
  }
  if (spec.number === '007') {
    const shifts = Object.values(isObject(p.groupShifts) ? p.groupShifts : {}).filter(Number.isFinite);
    return receipt.sourceType === 'debate-answer'
      && shifts.some((shift) => shift > 0)
      && shifts.some((shift) => shift < 0);
  }
  if (spec.number === '010') {
    return receipt.sourceType === 'debate-answer'
      && isVerdict(p.verdict)
      && hasText(p.answer);
  }
  if (spec.number === '013') {
    return receipt.sourceType === 'event-choice'
      && p.eventId === 'leak'
      && p.eventTitle === 'The Internal Memo Leaks'
      && hasText(p.eventText)
      && p.eventText.includes('our candidate cannot be trusted with an unscripted lunch')
      && hasText(p.choice)
      && hasText(p.text);
  }
  if (spec.number === '015') {
    const moment = p.actionReceipt?.publicStopMoment;
    return receipt.sourceType === 'campaign-action'
      && p.actionReceipt?.actionId === 'townhall'
      && p.actionReceipt?.abbr === receipt.state
      && isObject(moment)
      && moment.kind === 'answered-attendees'
      && moment.clipShown === true
      && Array.isArray(moment.answers)
      && moment.answers.length === 3
      && moment.answers.every((answer) => hasText(answer.issueId) && hasText(answer.issue) && hasText(answer.question) && hasText(answer.response) && hasText(answer.responseApproach))
      && hasText(moment.text);
  }
  if (spec.number === '019') {
    const spin = p.storySpin;
    return receipt.sourceType === 'press-action'
      && isObject(spin)
      && hasText(spin.storyId)
      && hasText(spin.storyHeadline)
      && hasText(spin.mode)
      && Number.isFinite(spin.salienceBefore)
      && Number.isFinite(spin.salienceAfter)
      && spin.salienceAfter >= 60
      && Number.isFinite(spin.storyUpdates)
      && spin.storyUpdates >= 2
      && Number.isFinite(spin.responseCount)
      && spin.responseCount >= 1
      && spin.remainsProminent === true;
  }
  if (spec.number === '021') {
    const ad = p.result;
    return receipt.sourceType === 'advertisement'
      && isObject(ad)
      && hasText(ad.abbr)
      && ad.abbr === receipt.state
      && hasText(p.issueId)
      && ['pro', 'attack'].includes(ad.kind)
      && Number.isFinite(ad.swing)
      && ad.swing > 0
      && Number.isFinite(ad.points)
      && ad.points > 0
      && !ad.backfire
      && Array.isArray(p.states)
      && p.states.includes(ad.abbr);
  }
  if (spec.number === '022') {
    const backfire = p.result?.backfire;
    return receipt.sourceType === 'advertisement'
      && isObject(p.result)
      && isObject(backfire)
      && backfire.abbr === receipt.state
      && ((Number(backfire.stateHit) || 0) > 0 || (Number(backfire.localVote) || 0) > 0)
      && hasText(p.issueId)
      && hasText(p.result.verdict)
      && hasText(receipt.state)
      && p.result.abbr === receipt.state;
  }
  if (spec.number === '035') {
    const action = p.actionReceipt;
    return receipt.sourceType === 'campaign-action'
      && isObject(action)
      && ['visit', 'townhall'].includes(action.actionId)
      && hasText(action.abbr)
      && action.abbr === receipt.state
      && hasText(action.stateName)
      && hasText(action.text)
      && Number.isFinite(action.stopFatigueBefore)
      && action.stopFatigueBefore >= 2
      && Number.isFinite(action.playerAttention)
      && action.playerAttention >= 2
      && Number.isFinite(action.engagementDrop)
      && action.engagementDrop >= 10
      && Number.isFinite(action.engagementMultiplier)
      && action.engagementMultiplier <= 0.9;
  }
  if (spec.number === '062') {
    const attack = p.promiseAttack;
    const promise = (game.promiseLedger || []).find((item) => item.id === attack?.promiseLedgerId);
    return receipt.sourceType === 'opponent-plan'
      && isObject(attack)
      && attack.broken === true
      && attack.effectApplied === true
      && hasText(attack.promiseLedgerId)
      && hasText(attack.issueId)
      && hasText(attack.pledgedPosition)
      && hasText(attack.currentPosition)
      && hasText(attack.attackText)
      && hasText(attack.abbr)
      && hasText(attack.stateName)
      && Object.hasOwn(STATE_BY_ABBR, attack.abbr)
      && (attack.abbr === receipt.state || receipt.payload?.neglectedStateMove?.abbr === receipt.state)
      && Number.isFinite(attack.stateHit)
      && attack.stateHit > 0
      && attack.exploitedWeek === receipt.week
      && promise?.broken === true
      && promise.exploitedWeek === receipt.week;
  }
  if (spec.number === '093') {
    const request = p.endorsementRequest;
    const concern = request?.policyConcern;
    return receipt.sourceType === 'endorsement-request'
      && isObject(request)
      && request.accepted === false
      && request.status === 'critical'
      && request.delayedForPolicy === true
      && hasText(request.leaderId)
      && hasText(request.leaderName)
      && hasText(request.message)
      && isObject(concern)
      && concern.reaction === 'concern'
      && hasText(concern.issueId)
      && hasText(concern.issue)
      && Number.isFinite(request.fit)
      && Number.isFinite(request.minimumFit)
      && request.fit < request.minimumFit;
  }
  if (spec.number === '073') {
    const story = p.rivalNewsIncident;
    const published = game?.rivalIncidentNewsCard;
    const correctionStory = isObject(story)
      && ['fact-check-reversal', 'corrected-accusation'].includes(story.storyId || story.id)
      && ['published fact check', 'correction notice'].includes(story.evidenceType)
      && hasText(story.evidence)
      && hasText(story.eventTitle);
    return receipt.sourceType === 'opponent-plan'
      && correctionStory
      && published?.receiptId === receipt.id
      && published.rivalStoryId === (story.storyId || story.id)
      && hasText(published.headline)
      && published.effectApplied === true
      && (game.rivalIncidentNewsReceiptIds || []).includes(receipt.id);
  }
  if (spec.number === '072') return validRivalInterruptionSource(receipt, game);
  return false;
}

function effectsForChoice(choice, index) {
  const words = (choice.label + ' ' + choice.detail).toLowerCase();
  const effects = {};
  if (/\b(cost|spend|money|fund|budget)\b/.test(words)) effects.funds = -0.25;
  if (/\b(risk|damage|lose|weaken|worsen|disappoint|scrutiny|sacrifice|forgo|miss)\b/.test(words)) effects.risk = 0.01;
  if (/\b(trust|support|strengthen|repair|credibility|momentum|rally|protect|reach|lift|win)\b/.test(words)) effects.mom = 0.15;
  if (!Object.keys(effects).length) effects.mom = index === 0 ? 0.15 : -0.1;
  return effects;
}

const INCIDENT_BACKED = Object.freeze({
  '001': { predicateId: 'debate-scandal-recorded', sourceType: 'debate-answer', sourceActionTypes: ['debate'], receiptField: 'payload.scandal.level', evidenceFields: ['payload.answer', 'payload.reply', 'payload.scandal.level'] },
  '003': { predicateId: 'debate-viral-clip', sourceType: 'debate-answer', sourceActionTypes: ['debate'], receiptField: 'payload.clip.status', evidenceFields: ['payload.answer', 'payload.answerScore', 'payload.clip.status'] },
  '005': { predicateId: 'debate-evasion-recorded', sourceType: 'debate-answer', sourceActionTypes: ['debate'], receiptField: 'payload.evasive', evidenceFields: ['payload.question', 'payload.answer', 'payload.reply', 'payload.evasive'] },
  '006': { predicateId: 'debate-promise-recorded', sourceType: 'debate-answer', sourceActionTypes: ['debate'], receiptField: 'payload.promise.id', evidenceFields: ['payload.promise.text', 'payload.promise.issueId', 'payload.answer'] },
  '007': { predicateId: 'debate-coalition-impact', sourceType: 'debate-answer', sourceActionTypes: ['debate'], receiptField: 'payload.groupShifts', evidenceFields: ['payload.groupShifts'] },
  '010': { predicateId: 'debate-verdict-committed', sourceType: 'debate-answer', sourceActionTypes: ['debate'], receiptField: 'payload.verdict', evidenceFields: ['payload.verdict', 'payload.answer'] },
  '013': { predicateId: 'leaked-memo-choice', sourceType: 'event-choice', sourceActionTypes: ['resolve-event-choice:leak'], receiptField: 'payload.eventText', evidenceFields: ['payload.eventTitle', 'payload.eventText', 'payload.choice', 'payload.text'] },
  '015': { predicateId: 'townhall-public-moment', sourceType: 'campaign-action', sourceActionTypes: ['townhall'], receiptField: 'payload.actionReceipt.publicStopMoment', evidenceFields: ['payload.actionReceipt.stateName', 'payload.actionReceipt.publicStopMoment'] },
  '019': { predicateId: 'story-spin-persistent-salience', sourceType: 'press-action', sourceActionTypes: ['press-spin'], receiptField: 'payload.storySpin.remainsProminent', evidenceFields: ['payload.storySpin.storyHeadline', 'payload.storySpin.salienceAfter', 'payload.storySpin.storyUpdates', 'payload.storySpin.mode'] },
  '021': { predicateId: 'ad-favorable-turnout-receipt', sourceType: 'advertisement', sourceActionTypes: ['ad-buy'], receiptField: 'payload.result.points', evidenceFields: ['payload.issueId', 'payload.result.kind', 'payload.result.points', 'payload.result.abbr'] },
  '022': { predicateId: 'ad-backfire-receipt', sourceType: 'advertisement', sourceActionTypes: ['ad-buy'], receiptField: 'payload.result.backfire', evidenceFields: ['payload.issueId', 'payload.result.verdict', 'payload.result.backfire'] },
  '035': { predicateId: 'repeated-stop-fatigue', sourceType: 'campaign-action', sourceActionTypes: ['visit', 'townhall'], receiptField: 'payload.actionReceipt.engagementDrop', evidenceFields: ['payload.actionReceipt.stateName', 'payload.actionReceipt.stopFatigueBefore', 'payload.actionReceipt.playerAttention', 'payload.actionReceipt.engagementDrop'] },
  '062': { predicateId: 'broken-promise-attack-applied', sourceType: 'opponent-plan', sourceActionTypes: ['opponent-plan'], receiptField: 'payload.promiseAttack.effectApplied', evidenceFields: ['payload.promiseAttack.attackText', 'payload.promiseAttack.pledgedPosition', 'payload.promiseAttack.currentPosition', 'payload.promiseAttack.stateHit'] },
  '072': { predicateId: 'opponent-neglected-state-activity', sourceType: 'opponent-plan', sourceActionTypes: ['opponent-plan'], receiptField: 'payload.neglectedStateMove.effectApplied', evidenceFields: ['payload.neglectedStateMove.stateName', 'payload.neglectedStateMove.moveText', 'payload.neglectedStateMove.effectMagnitude', 'payload.neglectedStateMove.playerAttention', 'payload.neglectedStateMove.sourceMargin', 'payload.neglectedStateMove.persuasion'] },
  '073': { predicateId: 'rival-correction-published', sourceType: 'opponent-plan', sourceActionTypes: ['opponent-plan', 'publish-rival-correction'], receiptField: 'payload.rivalNewsIncident', evidenceFields: ['payload.rivalNewsIncident.evidenceType', 'payload.rivalNewsIncident.evidence', 'game.rivalIncidentNewsCard.receiptId', 'game.rivalIncidentNewsCard.rivalStoryId', 'game.rivalIncidentNewsCard.headline', 'game.rivalIncidentNewsCard.effectApplied'] },
  '093': { predicateId: 'endorsement-delayed-for-policy', sourceType: 'endorsement-request', sourceActionTypes: ['endorsement-request'], receiptField: 'payload.endorsementRequest.policyConcern', evidenceFields: ['payload.endorsementRequest.leaderName', 'payload.endorsementRequest.message', 'payload.endorsementRequest.policyConcern.issue', 'payload.endorsementRequest.fit', 'payload.endorsementRequest.minimumFit'] },
});

const REFERENCE_DATA_GATES = Object.freeze({
  '048': 'Requires a validated official state ballot-access deadline, route, threshold, and committed petition report.',
  '069': 'Requires a validated official ballot-measure record and a committed qualification/effect receipt.',
  '096': 'Requires a validated official state petition route, filing threshold, and committed petition report.',
  '097': 'Requires a validated official ballot-access filing and a committed legal challenge record.',
  '099': 'Requires a validated election-official polling-place update committed to campaign news.',
  '100': 'Requires a validated election-administration source and a committed correction/news receipt.',
});

const DISABLED_REASONS = Object.freeze({
  '002': 'No saved debate fact-check receipt currently records the statistic and its verified status.',
  '004': 'Debate resolution does not yet save the opponent answer and moderator correction as a committed receipt.',
  '008': 'Running-mate debate receipts do not yet preserve the required answer-level evidence.',
  '009': 'Debate receipts do not yet compare cited details against a saved platform or promise snapshot.',
  '011': 'Campaign action receipts do not yet contain a committed local reporter quote.',
  '012': 'The press-spin resolver does not yet commit a later source-check receipt.',
  '014': 'No shared fact-check producer commits a verified claim result for ads, speeches, or press actions.',
  '016': 'Campaign actions do not yet save a skipped-availability receipt.',
  '017': 'Published news does not yet commit both the clipped quote and full-answer source.',
  '018': 'Poll publication does not yet save a comparable two-poll mismatch receipt.',
  '020': 'The correction-news producer does not yet save a high-salience correction receipt.',
  '023': 'Ad purchase receipts do not yet preserve planned and actual spend for this predicate.',
  '024': 'Ad receipts do not yet preserve named target-group response evidence.',
  '025': 'Translated ad receipts do not yet link a validated local response report.',
  '026': 'Ad receipts do not yet link a committed fact-check result.',
  '027': 'The media resolver does not yet commit booked-versus-delivered placement status.',
  '028': 'Digital ad receipts do not yet commit audience and comment evidence.',
  '029': 'Campaign actions do not yet commit organic-video posting and sharing-threshold receipts.',
  '030': 'Outside-ad resolution does not yet save ad content and a conflicting platform snapshot.',
  '031': 'Field actions do not yet commit precinct-level contact-rate evidence.',
  '032': 'Organizing actions do not yet commit a volunteer-signup surge receipt.',
  '033': 'Visit receipts do not yet store announced attendance and verified turnout.',
  '034': 'Visit receipts do not yet store venue capacity and verified overflow attendance.',
  '036': 'Field operations do not yet record a local party chair refusal receipt.',
  '037': 'Campaign scheduling does not yet commit venue cancellation and reason.',
  '038': 'Canvass reports do not yet commit a validated voter-file error receipt.',
  '039': 'The early-vote update is not currently committed as a source receipt.',
  '040': 'Campaign scheduling does not yet commit a weather cancellation and revised itinerary.',
  '041': 'Policy and endorsement records do not yet produce the required joined labor-delay receipt.',
  '042': 'Policy changes do not yet commit a source-backed organizational statement.',
  '043': 'Policy records do not yet commit the specified donor-faction guarantee request.',
  '044': 'Debate receipts do not yet record both persuadable response and moderate-faction support movement.',
  '045': 'Policy changes do not yet commit a signed organizer statement.',
  '046': 'Event-choice receipts do not yet record a later party-official cancellation.',
  '047': 'Field actions do not yet commit recruitment-drive results and the resulting request.',
  '049': 'Event-choice receipts do not yet link both commitments and a saved competing-event schedule.',
  '050': 'Policy actions do not yet commit a faction offer with verifiable terms.',
  '051': 'Campaign actions do not yet commit a faith-community visit and group response record.',
  '052': 'Campaign actions do not yet snapshot the rural-message change and matching voter response.',
  '053': 'Translated ad receipts do not yet link a committed audience-question record.',
  '054': 'Debate and visit receipts do not yet link a committed veterans-group response.',
  '055': 'Campaign actions do not yet link the strike news receipt and an affected-worker question.',
  '056': 'Campaign actions do not yet commit campus/post questions with issue and state evidence.',
  '057': 'Campaign actions do not yet commit a parent-raised education issue.',
  '058': 'Town hall receipts do not yet record a questioner follow-up request.',
  '059': 'Meeting receipts do not yet commit a representative request linked to the discussed framework.',
  '060': 'Event operations do not yet commit an accessibility barrier report.',
  '061': 'Promise receipts do not yet link a later policy-review warning.',
  '063': 'Promise receipts do not yet link a committed implementation plan.',
  '064': 'Promise receipts do not yet link a later policy limitation review.',
  '065': 'Policy review does not yet save and compare two source-backed cost estimates.',
  '066': 'Endorsement receipts do not yet link a written policy amendment.',
  '067': 'Policy review does not yet commit a feasibility constraint receipt.',
  '068': 'Issue briefing does not yet commit a detected platform contradiction.',
  '070': 'Endorsement outreach does not yet commit a policy-conditioned endorsement offer.',
  '071': 'Opponent ad receipts do not yet link a prior candidate statement and delivered reach report.',
  '074': 'Opponent policy announcements do not yet save comparable proposal dates and text.',
  '075': 'Rival campaign data does not yet commit a staff departure and public explanation.',
  '076': 'Opponent news does not yet commit a named counterproposal linked to the prior player proposal.',
  '077': 'Opponent actions do not yet link a previously corrected claim to a surrogate statement.',
  '078': 'Opponent debate resolution does not yet commit both the answer and snap-poll receipt.',
  '079': 'Opponent stops do not yet commit verified attendance and local coverage.',
  '080': 'Opponent strategy does not yet commit an auditable spending/action map pivot.',
  '081': 'Running-mate travel actions do not yet save the required clip-level evidence.',
  '082': 'Running-mate debate/interview receipts do not yet commit a high-response clip.',
  '083': 'Running-mate news does not yet snapshot the public statement and candidate platform version.',
  '084': 'Surrogate interviews do not yet commit approved briefing and unscripted statement records.',
  '085': 'Endorsement news does not yet commit the former officeholder and relationship evidence.',
  '086': 'Campaign actions do not yet link two saved conflicting public statements.',
  '087': 'Campaign actions do not yet commit surrogate pledges and the candidate platform snapshot.',
  '088': 'Public-record news does not yet commit a source-validated biography detail.',
  '089': 'Surrogate visits do not yet commit named voter-group response evidence.',
  '090': 'Debate/public-event receipts do not yet preserve the ticket-governance question and response.',
  '091': 'Fundraising actions do not yet commit host cancellation and expected amount/state.',
  '092': 'Finance records do not yet verify and commit a small-donor surge receipt.',
  '094': 'Endorsement records do not yet commit an in-kind offer and its condition.',
  '095': 'Campaign actions do not yet link a filed finance report and validated anomaly.',
  '098': 'The early-vote update and field target are not currently committed as linked source receipts.',
});

const PENDING_PRODUCER_OWNERS = Object.freeze({
  'debate-answer': 'debate-resolver',
  'opponent-plan': 'opponent-resolver',
  'campaign-action': 'campaign-action-resolver',
  'press-action': 'campaign-press-resolver',
  'event-choice': 'campaign-event-resolver',
  advertisement: 'campaign-ad-resolver',
  'policy-position': 'policy-resolver',
  'campaign-promise': 'promise-resolver',
  'endorsement-request': 'endorsement-resolver',
});

function auditFieldsForSpec(spec) {
  const incident = INCIDENT_BACKED[spec.number];
  if (incident) {
    return {
      enabled: true,
      status: 'incident-backed',
      reason: 'Enabled only when the registered predicate confirms the listed facts in the committed source receipt.',
      producerOwner: 'incident-ledger',
      trigger: {
        ...incident,
        minimumDelayActions: 0,
        maximumDelayWeeks: spec.number === '073' ? 2 : 1,
        oncePerCampaign: true,
        enabled: true,
      },
    };
  }
  const gateReason = REFERENCE_DATA_GATES[spec.number];
  const reason = gateReason || DISABLED_REASONS[spec.number] || 'No registered producer currently commits the source facts required by this definition.';
  return {
    enabled: false,
    status: gateReason ? 'reference-data-gated' : 'disabled-pending-producer',
    reason,
    producerOwner: gateReason ? 'integration-data-gate' : PENDING_PRODUCER_OWNERS[spec.sourceTypes[0]],
    trigger: {
      sourceType: spec.sourceTypes[0] || null,
      sourceActionTypes: [],
      receiptField: null,
      predicateId: null,
      minimumDelayActions: 0,
      maximumDelayWeeks: 1,
      oncePerCampaign: true,
      enabled: false,
      diagnostic: reason,
    },
  };
}

const PREDICATE_ID_BY_NUMBER = Object.freeze(Object.fromEntries(
  Object.entries(INCIDENT_BACKED).map(([number, entry]) => [number, entry.predicateId]),
));

export const TRIGGERED_EVENT_PREDICATES = Object.freeze(Object.fromEntries(
  Object.entries(INCIDENT_BACKED).map(([number, entry]) => [
    entry.predicateId,
    (receipt, game, definition) => definition?.number === number && currentEvidenceMatches(receipt, game, definition),
  ]),
));

function makeDefinition(spec) {
  const audit = auditFieldsForSpec(spec);
  const triggerDescription = spec.trigger;
  const enabledPredicate = audit.enabled ? TRIGGERED_EVENT_PREDICATES[audit.trigger.predicateId] : null;
  return {
    ...spec,
    triggerDescription,
    trigger: audit.trigger,
    enabled: audit.enabled,
    auditStatus: audit.status,
    auditReason: audit.reason,
    producerOwner: audit.producerOwner,
    incidentDisplay: {
      headline: spec.title,
      evidenceFields: [...(audit.enabled ? audit.trigger.evidenceFields : [])],
    },
    choices: spec.choices.map((choice, index) => ({
      ...choice,
      effects: choice.effects || effectsForChoice(choice, index),
    })),
    onceKey: 'triggered-event:' + spec.id,
    when(receipt, game) {
      if (!audit.enabled || !enabledPredicate || !receipt?.id || !game) return false;
      if (!spec.sourceTypes.includes(receipt.sourceType) || receipt.sourceType !== audit.trigger.sourceType) return false;
      if (!receipt.campaignId || receipt.campaignId !== (game.build34CampaignId || game.campaignId)) return false;
      if (receipt.provenanceVersion !== 2 || receipt.triggerEligible === false || !hasText(receipt.incidentId)) return false;
      if (receipt.sourceReceiptId !== receipt.id || !Number.isInteger(Number(receipt.week)) || !hasText(receipt.recap)) return false;
      const elapsedWeeks = Number(game.week) - Number(receipt.week);
      if (!Number.isInteger(Number(game.week)) || elapsedWeeks < 0 || elapsedWeeks > audit.trigger.maximumDelayWeeks) return false;
      return enabledPredicate(receipt, game, spec);
    },
  };
}

export const TRIGGERED_EVENT_DEFINITIONS = SPECS.map(makeDefinition);
export const TRIGGERED_EVENT_BY_ID = Object.fromEntries(TRIGGERED_EVENT_DEFINITIONS.map((item) => [item.id, item]));
export const TRIGGERED_EVENT_AUDIT_COUNTS = Object.freeze(TRIGGERED_EVENT_DEFINITIONS.reduce((counts, definition) => {
  counts[definition.auditStatus] = (counts[definition.auditStatus] || 0) + 1;
  return counts;
}, {}));
export const TRIGGERED_EVENT_AUDIT = Object.freeze(TRIGGERED_EVENT_DEFINITIONS.map((definition) => Object.freeze({
  id: definition.id,
  number: definition.number,
  status: definition.auditStatus,
  enabled: definition.enabled,
  sourceTypes: [...definition.sourceTypes],
  predicateId: definition.trigger.predicateId,
  diagnostic: definition.enabled ? null : definition.auditReason,
  producerOwner: definition.producerOwner,
})));

export function validateTriggeredEventDefinitions(definitions = TRIGGERED_EVENT_DEFINITIONS) {
  const errors = [];
  const ids = new Set();
  const numbers = new Set();
  const onceKeys = new Set();
  const statuses = new Set(['incident-backed', 'reference-data-gated', 'disabled-pending-producer']);
  for (const definition of definitions || []) {
    if (!definition?.id || ids.has(definition.id)) errors.push(`Missing or duplicate event ID: ${definition?.id || '(missing)'}`);
    if (definition?.id) ids.add(definition.id);
    if (!definition?.number || numbers.has(definition.number)) errors.push(`Missing or duplicate event number: ${definition?.number || '(missing)'}`);
    if (definition?.number) numbers.add(definition.number);
    if (!definition?.onceKey || onceKeys.has(definition.onceKey)) errors.push(`Missing or duplicate once key: ${definition?.onceKey || '(missing)'}`);
    if (definition?.onceKey) onceKeys.add(definition.onceKey);
    if (!statuses.has(definition?.auditStatus)) errors.push(`${definition?.id || 'Event'} has an unknown audit status`);
    if (!definition?.trigger || typeof definition.trigger !== 'object') {
      errors.push(`${definition?.id || 'Event'} is missing its trigger block`);
      continue;
    }
    if (!definition.trigger.oncePerCampaign || !Array.isArray(definition.trigger.sourceActionTypes)) {
      errors.push(`${definition.id} has no once-only policy or source-action list`);
    }
    if (definition.enabled) {
      if (definition.auditStatus !== 'incident-backed') errors.push(`${definition.id} is enabled without incident-backed status`);
      if (!definition.trigger.sourceType || !definition.trigger.receiptField || !definition.trigger.predicateId) {
        errors.push(`${definition.id} is missing enabled trigger source/evidence/predicate metadata`);
      }
      if (!definition.sourceTypes.includes(definition.trigger.sourceType)) {
        errors.push(`${definition.id} trigger source does not match its declared source types`);
      }
      if (!Object.hasOwn(TRIGGERED_EVENT_PREDICATES, definition.trigger.predicateId)) {
        errors.push(`${definition.id} references unknown trigger predicate ${definition.trigger.predicateId}`);
      }
      if (PREDICATE_ID_BY_NUMBER[definition.number] !== definition.trigger.predicateId) {
        errors.push(`${definition.id} predicate does not match its registered event rule`);
      }
      const registered = INCIDENT_BACKED[definition.number];
      if (!registered || definition.trigger.receiptField !== registered.receiptField
        || definition.trigger.sourceType !== registered.sourceType) {
        errors.push(`${definition.id} does not match its registered receipt source`);
      }
      if (!Number.isInteger(definition.trigger.minimumDelayActions)
        || !Number.isInteger(definition.trigger.maximumDelayWeeks)
        || definition.trigger.maximumDelayWeeks < 0) {
        errors.push(`${definition.id} has an invalid trigger delay window`);
      }
      if (!Array.isArray(definition.incidentDisplay?.evidenceFields) || !definition.incidentDisplay.evidenceFields.length) {
        errors.push(`${definition.id} has no display evidence fields`);
      } else if (!registered || definition.incidentDisplay.evidenceFields.length !== registered.evidenceFields.length
        || definition.incidentDisplay.evidenceFields.some((field) => !registered.evidenceFields.includes(field))) {
        errors.push(`${definition.id} requests evidence its registered producer cannot provide`);
      }
    } else if (!definition.auditReason || !definition.producerOwner || !definition.trigger.diagnostic || definition.trigger.predicateId) {
      errors.push(`${definition.id} is disabled without a clear diagnostic`);
    }
  }
  if (definitions?.length !== 100) errors.push(`Expected 100 triggered-event definitions, found ${definitions?.length || 0}`);
  return {
    valid: errors.length === 0,
    errors,
    total: definitions?.length || 0,
    counts: (definitions || []).reduce((counts, definition) => {
      counts[definition.auditStatus] = (counts[definition.auditStatus] || 0) + 1;
      return counts;
    }, {}),
  };
}
