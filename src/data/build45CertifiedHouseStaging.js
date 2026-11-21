// Official district vote facts staged for review, not substituted into the
// current House input. A complete compatible national baseline is still needed.
export const BUILD45_CERTIFIED_HOUSE_STAGING = Object.freeze([
  Object.freeze({ id: 'WY-01', stateAbbr: 'WY', districtNumber: 1, sourceYear: 2026,
    demCandidate: 'Lisa Kinney', demVotes: 61689, repCandidate: 'Chuck Gray', repVotes: 99906,
    otherVotes: Object.freeze({ libertarian: 13667, constitution: 7961, writeIns: 1031 }),
    overvotes: 1231, undervotes: 6228,
    resultMarginDMinusR: 100 * (61689 - 99906) / (61689 + 99906),
    boundaryVintage: 2026, boundaryStatus: 'single-statewide-at-large-congressional-district',
    sourceTitle: 'Wyoming General Election November 3 2026, Statewide Candidates Official Summary, U.S. Representative, PDF page3',
    sourceUrl: 'https://sos.wyo.gov/Elections/Docs/2026/Results/General/2026_General_Statewide_Candidates_Summary.pdf',
    officialIndexUrl: 'https://sos.wyo.gov/Elections/Docs/2026/2026GeneralResults.aspx',
    certificationDocumentUrl: 'https://sos.wyo.gov/Elections/Docs/2026/Results/General/2026_General_State_Canvassing_Board_Minutes.pdf',
    retrievedOn: '2026-11-17', status: 'official-state-published-summary', certificationDate: null,
    certificationDateStatus: 'official-index-and-summary-confirm-official-status; minutes-file-not-parsed-due-size',
    nationalGenericMarginDMinusR: null, districtLeanDMinusR: null,
    eligibleForSubstitution: false,
    remainingDependency: 'Complete compatible same-cycle official national two-party House baseline. CA certification scheduled2026-12-11; no complete certified national denominator accepted.',
  }),
]);
