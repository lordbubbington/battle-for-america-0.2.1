// Official Delaware general election, November 5, 2024. Null means no major-party opponent.
// Votes are the official candidate totals. Baselines use two-party presidential votes.
export const DELAWARE_2024_SOURCE = Object.freeze({
  title: 'Delaware official 2024 general election results',
  url: 'https://elections.delaware.gov/reports/GE2024.html',
  checkedOn: '2026-11-11', status: 'official', year: 2024,
});
export const DELAWARE_DISTRICT_SOURCE = Object.freeze({
  title: 'Delaware General Assembly, 2022 final House district maps',
  url: 'https://legis.delaware.gov/Redistricting/2022FinalHouseDistricts', year: 2022,
});
export const DELAWARE_SENATE_DISTRICT_SOURCE = Object.freeze({
  title: 'Delaware General Assembly, 2022 final Senate district maps',
  url: 'https://www.legis.delaware.gov/Redistricting/2022FinalSenateDistricts', year: 2022,
});
export const DELAWARE_SENATE_SCHEDULE_SOURCE = Object.freeze({
  title: 'Delaware Code, Title 29, Chapter 8',
  url: 'https://delcode.delaware.gov/title29/c008/sc01/index.html',
});
export const DELAWARE_PRESIDENT_2024 = Object.freeze({ dem: 289758, rep: 214351 });

// Previous contested races use the 2022 statewide U.S. House election as baseline.
// The 2023 special election in House District 37 is intentionally excluded.
export const DELAWARE_2022_SOURCE = Object.freeze({
  title: 'Delaware official 2022 general election results',
  url: 'https://elections.delaware.gov/reports/GE2022.html',
  checkedOn: '2026-11-11', status: 'official', year: 2022,
});
export const DELAWARE_ELECTION_ARCHIVE_SOURCE = Object.freeze({
  title: 'Delaware Department of Elections results archive',
  url: 'https://elections.delaware.gov/elections/election_archive.html',
});
export const DELAWARE_HOUSE_STATEWIDE_2022 = Object.freeze({ dem: 178416, rep: 138201 });
export const DELAWARE_HOUSE_CONTESTED_2022 = Object.freeze([
  [
    1,
    5514,
    746,
    "dem",
    "NNAMDI O. CHUKWUOCHA"
  ],
  [
    5,
    4223,
    1008,
    "dem",
    "KENDRA JOHNSON"
  ],
  [
    15,
    5086,
    2301,
    "dem",
    "VALERIE LONGHURST"
  ],
  [
    18,
    4060,
    1619,
    "dem",
    "SOPHIE PHILLIPS"
  ],
  [
    23,
    4823,
    3016,
    "dem",
    "PAUL BAUMBACH"
  ],
  [
    26,
    3610,
    1512,
    "dem",
    "MADINAH WILSON-ANTON"
  ],
  [
    31,
    3689,
    1942,
    "dem",
    "SEAN M. LYNN"
  ],
  [
    39,
    1818,
    4343,
    "rep",
    "DANIEL B. SHORT"
  ]
]);
export const DELAWARE_SENATE_2022 = Object.freeze([
  [
    1,
    13204,
    null,
    "dem",
    "SARAH MCBRIDE"
  ],
  [
    2,
    7689,
    null,
    "dem",
    "DARIUS J. BROWN"
  ],
  [
    3,
    5714,
    null,
    "dem",
    "S. ELIZABETH LOCKMAN"
  ],
  [
    4,
    10762,
    8259,
    "dem",
    "LAURA STURGEON"
  ],
  [
    5,
    10471,
    5328,
    "dem",
    "KYLE EVANS GAY"
  ],
  [
    6,
    14131,
    13048,
    "dem",
    "RUSS HUXTABLE"
  ],
  [
    7,
    7663,
    5394,
    "dem",
    "SPIROS MANTZAVINOS"
  ],
  [
    8,
    8462,
    4998,
    "dem",
    "DAVID P. SOKOLA"
  ],
  [
    9,
    7172,
    4490,
    "dem",
    "JACK WALSH"
  ],
  [
    10,
    10800,
    null,
    "dem",
    "STEPHANIE L. HANSEN"
  ],
  [
    11,
    8843,
    null,
    "dem",
    "BRYAN TOWNSEND"
  ],
  [
    12,
    10226,
    6228,
    "dem",
    "NICOLE POORE"
  ],
  [
    13,
    8611,
    null,
    "dem",
    "MARIE PINKNEY"
  ],
  [
    14,
    8404,
    7811,
    "dem",
    "KYRA HOFFNER"
  ],
  [
    15,
    null,
    11814,
    "rep",
    "DAVE LAWSON"
  ],
  [
    16,
    null,
    9577,
    "rep",
    "ERIC BUCKSON"
  ],
  [
    17,
    7551,
    4174,
    "dem",
    "TREY PARADEE"
  ],
  [
    18,
    4665,
    10867,
    "rep",
    "DAVE WILSON"
  ],
  [
    19,
    null,
    13142,
    "rep",
    "BRIAN G. PETTYJOHN"
  ],
  [
    20,
    null,
    17150,
    "rep",
    "GERALD W. HOCKER"
  ],
  [
    21,
    null,
    10013,
    "rep",
    "BRYANT L. RICHARDSON"
  ]
]);
// District, Democratic votes, Republican votes, winning party, winner.
export const DELAWARE_HOUSE_2024 = Object.freeze([
  [
    1,
    9252,
    null,
    "dem",
    "NNAMDI O. CHUKWUOCHA"
  ],
  [
    2,
    6590,
    null,
    "dem",
    "STEPHANIE T. BOLDEN"
  ],
  [
    3,
    6307,
    null,
    "dem",
    "JOSUE O. ORTEGA"
  ],
  [
    4,
    7630,
    10533,
    "rep",
    "JEFF HILOVSKY"
  ],
  [
    5,
    8214,
    null,
    "dem",
    "KENDRA JOHNSON"
  ],
  [
    6,
    8766,
    4586,
    "dem",
    "DEBRA J. HEFFERNAN"
  ],
  [
    7,
    7208,
    3047,
    "dem",
    "LARRY D. LAMBERT JR."
  ],
  [
    8,
    7945,
    5800,
    "dem",
    "SHERAE'A \"RAE\" MOORE"
  ],
  [
    9,
    7844,
    8762,
    "rep",
    "KEVIN S. HENSLEY"
  ],
  [
    10,
    7953,
    5208,
    "dem",
    "MELANIE ROSS LEVIN"
  ],
  [
    11,
    null,
    9896,
    "rep",
    "JEFFREY N. SPIEGELMAN"
  ],
  [
    12,
    10086,
    6364,
    "dem",
    "KRISTA GRIFFITH"
  ],
  [
    13,
    5516,
    4287,
    "dem",
    "DESHANNA NEAL"
  ],
  [
    14,
    9630,
    7995,
    "dem",
    "CLAIRE SNYDER-HALL"
  ],
  [
    15,
    9286,
    null,
    "dem",
    "KAMELA T. SMITH"
  ],
  [
    16,
    8092,
    null,
    "dem",
    "FRANKLIN D. COOKE JR."
  ],
  [
    17,
    7956,
    null,
    "dem",
    "MELISSA \"MIMI\" MINOR-BROWN"
  ],
  [
    18,
    7760,
    null,
    "dem",
    "SOPHIE PHILLIPS"
  ],
  [
    19,
    6964,
    4117,
    "dem",
    "KIM WILLIAMS"
  ],
  [
    20,
    8857,
    8612,
    "dem",
    "STELL PARKER SELBY"
  ],
  [
    21,
    7415,
    5397,
    "dem",
    "FRANK BURNS"
  ],
  [
    22,
    7103,
    8601,
    "rep",
    "MICHAEL FRANCIS SMITH"
  ],
  [
    23,
    7934,
    null,
    "dem",
    "MARA GORMAN"
  ],
  [
    24,
    6379,
    3172,
    "dem",
    "ED OSIENSKI"
  ],
  [
    25,
    5969,
    3225,
    "dem",
    "CYNDIE ROMER"
  ],
  [
    26,
    7123,
    null,
    "dem",
    "MADINAH WILSON-ANTON"
  ],
  [
    27,
    7766,
    6051,
    "dem",
    "ERIC MORRISON"
  ],
  [
    28,
    8620,
    null,
    "dem",
    "WILLIAM CARSON"
  ],
  [
    29,
    8746,
    5400,
    "dem",
    "WILLIAM BUSH"
  ],
  [
    30,
    null,
    10118,
    "rep",
    "WM SHANNON MORRIS"
  ],
  [
    31,
    7109,
    null,
    "dem",
    "SEAN M. LYNN"
  ],
  [
    32,
    4786,
    2945,
    "dem",
    "KERRI EVELYN HARRIS"
  ],
  [
    33,
    null,
    9101,
    "rep",
    "CHARLES S. POSTLES JR."
  ],
  [
    34,
    5782,
    7165,
    "rep",
    "LYNDON D. YEARICK"
  ],
  [
    35,
    null,
    9015,
    "rep",
    "JESSE R. VANDERWENDE"
  ],
  [
    36,
    4583,
    7757,
    "rep",
    "BRYAN WILLIAM SHUPE"
  ],
  [
    37,
    null,
    8250,
    "rep",
    "VALERIE JONES GILTNER"
  ],
  [
    38,
    null,
    15341,
    "rep",
    "RONALD E. GRAY"
  ],
  [
    39,
    null,
    7440,
    "rep",
    "DANIEL B. SHORT"
  ],
  [
    40,
    null,
    9086,
    "rep",
    "TIMOTHY D. DUKES"
  ],
  [
    41,
    5242,
    9490,
    "rep",
    "RICH COLLINS"
  ]
]);
export const DELAWARE_SENATE_2024 = Object.freeze([
  [
    2,
    14273,
    null,
    "dem",
    "DARIUS BROWN"
  ],
  [
    3,
    11831,
    null,
    "dem",
    "S. ELIZABETH LOCKMAN"
  ],
  [
    4,
    18984,
    null,
    "dem",
    "LAURA V. STURGEON"
  ],
  [
    6,
    20212,
    16976,
    "dem",
    "RUSS HUXTABLE"
  ],
  [
    10,
    19510,
    null,
    "dem",
    "STEPHANIE L. HANSEN"
  ],
  [
    11,
    15898,
    null,
    "dem",
    "BRYAN TOWNSEND"
  ],
  [
    16,
    null,
    16094,
    "rep",
    "ERIC L. BUCKSON"
  ],
  [
    17,
    14630,
    null,
    "dem",
    "TREY PARADEE"
  ],
  [
    18,
    null,
    18563,
    "rep",
    "DAVE WILSON"
  ],
  [
    21,
    null,
    17105,
    "rep",
    "BRYANT L. RICHARDSON"
  ]
]);

