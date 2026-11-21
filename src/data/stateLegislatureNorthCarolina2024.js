// Certified 2024 North Carolina results. Values are candidate vote totals.
// Four contests omitted from the Nov. 26 state canvass use later certified/recount records.
export const NORTH_CAROLINA_SOURCES = Object.freeze({
  certified: { title: 'NCSBE 2024 general election results by contest, November 26 canvass', url: 'https://s3.amazonaws.com/dl.ncsbe.gov/State_Board_Meeting_Docs/2024-11-26/Canvass/Certification%20of%20State%20Jurisdiction%20Contests%20112624.pdf', status: 'official-certified', year: 2024 },
  supplemental: { title: 'NCSBE December 11 supplemental state canvass', url: 'https://s3.amazonaws.com/dl.ncsbe.gov/State_Board_Meeting_Docs/2024-12-11/Supplemental%20Canvass/Supplemental%20State_Abstract_Report-Contest%28State%29.pdf', status: 'official-certified', year: 2024 },
  'recount-order': { title: 'NCSBE order recording final canvassed post-recount results', url: 'https://s3.amazonaws.com/dl.ncsbe.gov/State_Board_Meeting_Docs/Orders/Protest%20Appeals/Griffin-Adams-McGinn-Sossamon%20II_2024.pdf', status: 'official-final-canvass', year: 2024 },
  mecklenburg: { title: 'NCSBE official Mecklenburg County 2024 contest results', url: 'https://er.ncsbe.gov/?contest=0&county_id=60&election_dt=11%2F05%2F2024&office=NCH', status: 'official-final-county', year: 2024 },
});
export const NORTH_CAROLINA_DISTRICT_SOURCE = Object.freeze({
  title: 'North Carolina General Assembly 2023 enacted legislative maps',
  url: 'https://www.ncleg.gov/Redistricting/Process2023', year: 2023,
});
export const NORTH_CAROLINA_PRESIDENT_2024 = Object.freeze({ dem: 2715378, rep: 2898424 });
// District, Democratic votes, Republican votes, winner party, winner name, source key.
// Null vote totals mean a major-party candidate was not on the ballot.
export const NORTH_CAROLINA_SENATE_2024 = Object.freeze([
  [
    1,
    46979,
    62805,
    "rep",
    "Bobby Hanig",
    "certified"
  ],
  [
    2,
    47001,
    63006,
    "rep",
    "Norman W. Sanderson",
    "certified"
  ],
  [
    3,
    42704,
    64025,
    "rep",
    "Bob Brinson",
    "certified"
  ],
  [
    4,
    45096,
    55389,
    "rep",
    "Buck Newton",
    "certified"
  ],
  [
    5,
    59440,
    48469,
    "dem",
    "Kandie D. Smith",
    "certified"
  ],
  [
    6,
    23519,
    53923,
    "rep",
    "Michael A. Lazzara",
    "certified"
  ],
  [
    7,
    52953,
    63217,
    "rep",
    "Michael Lee",
    "certified"
  ],
  [
    8,
    58259,
    87026,
    "rep",
    "Bill Rabon",
    "certified"
  ],
  [
    9,
    36900,
    68632,
    "rep",
    "Brent Jackson",
    "certified"
  ],
  [
    10,
    45346,
    70773,
    "rep",
    "Benton Sawrey",
    "certified"
  ],
  [
    11,
    54806,
    57713,
    "rep",
    "Lisa Stone Barnes",
    "certified"
  ],
  [
    12,
    35611,
    57151,
    "rep",
    "Jim Burgin",
    "certified"
  ],
  [
    13,
    64074,
    59829,
    "dem",
    "Lisa Grafstein",
    "certified"
  ],
  [
    14,
    74519,
    23978,
    "dem",
    "Dan Blue",
    "certified"
  ],
  [
    15,
    67355,
    30867,
    "dem",
    "Jay J. Chaudhuri",
    "certified"
  ],
  [
    16,
    84424,
    null,
    "dem",
    "Gale Adcock",
    "certified"
  ],
  [
    17,
    71610,
    null,
    "dem",
    "Mrs. Sydney Batch",
    "certified"
  ],
  [
    18,
    59667,
    59539,
    "dem",
    "Terence Everitt",
    "supplemental"
  ],
  [
    19,
    55697,
    30005,
    "dem",
    "Val Applewhite",
    "certified"
  ],
  [
    20,
    90128,
    34570,
    "dem",
    "Natalie S. Murdock",
    "certified"
  ],
  [
    21,
    40052,
    67494,
    "rep",
    "Tom McInnis",
    "certified"
  ],
  [
    22,
    83844,
    null,
    "dem",
    "Sophia Chitlik",
    "certified"
  ],
  [
    23,
    77146,
    40011,
    "dem",
    "Graig R. Meyer",
    "certified"
  ],
  [
    24,
    33387,
    47538,
    "rep",
    "Danny Earl Britt, Jr.",
    "certified"
  ],
  [
    25,
    44711,
    67762,
    "rep",
    "Amy Scott Galey",
    "certified"
  ],
  [
    26,
    51007,
    67081,
    "rep",
    "Philip E. (Phil) Berger",
    "certified"
  ],
  [
    27,
    65146,
    42011,
    "dem",
    "Michael K. Garrett",
    "certified"
  ],
  [
    28,
    78876,
    null,
    "dem",
    "Gladys A. Robinson",
    "certified"
  ],
  [
    29,
    32519,
    70881,
    "rep",
    "Dave Craven, Jr.",
    "certified"
  ],
  [
    30,
    29294,
    86181,
    "rep",
    "Steve Jarvis",
    "certified"
  ],
  [
    31,
    47035,
    78429,
    "rep",
    "Dana Caudill Jones",
    "certified"
  ],
  [
    32,
    67131,
    27442,
    "dem",
    "Paul Lowe",
    "certified"
  ],
  [
    33,
    31509,
    77115,
    "rep",
    "Carl Ford",
    "certified"
  ],
  [
    34,
    48558,
    58166,
    "rep",
    "Paul Newton",
    "certified"
  ],
  [
    35,
    47486,
    82030,
    "rep",
    "Todd Johnson",
    "certified"
  ],
  [
    36,
    23444,
    88102,
    "rep",
    "Eddie Settle",
    "certified"
  ],
  [
    37,
    45129,
    82832,
    "rep",
    "Vickie Sawyer",
    "certified"
  ],
  [
    38,
    94162,
    null,
    "dem",
    "Mujtaba A. Mohammed",
    "certified"
  ],
  [
    39,
    88183,
    null,
    "dem",
    "DeAndrea Salvador",
    "certified"
  ],
  [
    40,
    67654,
    null,
    "dem",
    "Joyce Waddell",
    "certified"
  ],
  [
    41,
    95805,
    null,
    "dem",
    "Caleb Theodros",
    "certified"
  ],
  [
    42,
    62260,
    62051,
    "dem",
    "Mrs. Woodson Bradley",
    "recount-order"
  ],
  [
    43,
    40893,
    66112,
    "rep",
    "Brad Overcash",
    "certified"
  ],
  [
    44,
    31033,
    81809,
    "rep",
    "Ted Alexander",
    "certified"
  ],
  [
    45,
    33840,
    80033,
    "rep",
    "Mark Hollo",
    "certified"
  ],
  [
    46,
    36604,
    68675,
    "rep",
    "Warren Daniel",
    "certified"
  ],
  [
    47,
    42250,
    75608,
    "rep",
    "Ralph Hise",
    "certified"
  ],
  [
    48,
    41399,
    73373,
    "rep",
    "Tim Moffitt",
    "certified"
  ],
  [
    49,
    81037,
    36288,
    "dem",
    "Julie Mayfield",
    "certified"
  ],
  [
    50,
    41939,
    83381,
    "rep",
    "Kevin Corbin",
    "certified"
  ]
]);
export const NORTH_CAROLINA_HOUSE_2024 = Object.freeze([
  [
    1,
    17160,
    31950,
    "rep",
    "Edward C. Goodwin",
    "certified"
  ],
  [
    2,
    28332,
    20874,
    "dem",
    "Ray Jeffers",
    "certified"
  ],
  [
    3,
    18530,
    29825,
    "rep",
    "Steve Tyson",
    "certified"
  ],
  [
    4,
    12961,
    22093,
    "rep",
    "Jimmy Dixon",
    "certified"
  ],
  [
    5,
    18924,
    22357,
    "rep",
    "Bill Ward",
    "certified"
  ],
  [
    6,
    15704,
    24190,
    "rep",
    "Joe Pike",
    "certified"
  ],
  [
    7,
    20655,
    27099,
    "rep",
    "Matthew Winslow",
    "certified"
  ],
  [
    8,
    22722,
    12764,
    "dem",
    "Gloristine Brown",
    "certified"
  ],
  [
    9,
    21173,
    26888,
    "rep",
    "Timothy Reeder",
    "certified"
  ],
  [
    10,
    15789,
    24475,
    "rep",
    "John Bell",
    "certified"
  ],
  [
    11,
    31688,
    15910,
    "dem",
    "Allison A. Dahle",
    "certified"
  ],
  [
    12,
    16696,
    23116,
    "rep",
    "Chris Humphrey",
    "certified"
  ],
  [
    13,
    15158,
    35181,
    "rep",
    "Celeste Cairns",
    "certified"
  ],
  [
    14,
    8639,
    16859,
    "rep",
    "Wyatt Gable",
    "certified"
  ],
  [
    15,
    11799,
    24184,
    "rep",
    "Phillip Shepard",
    "certified"
  ],
  [
    16,
    14892,
    36170,
    "rep",
    "Carson Smith",
    "certified"
  ],
  [
    17,
    25491,
    42078,
    "rep",
    "Frank Iler",
    "certified"
  ],
  [
    18,
    33008,
    null,
    "dem",
    "Deb Butler",
    "certified"
  ],
  [
    19,
    25882,
    41266,
    "rep",
    "Charlie Miller",
    "certified"
  ],
  [
    20,
    25319,
    31964,
    "rep",
    "Ted Davis, Jr.",
    "certified"
  ],
  [
    21,
    30580,
    18153,
    "dem",
    "Ya Liu",
    "certified"
  ],
  [
    22,
    16729,
    26176,
    "rep",
    "William Brisson",
    "certified"
  ],
  [
    23,
    25140,
    19390,
    "dem",
    "Shelly Willingham",
    "certified"
  ],
  [
    24,
    21343,
    20425,
    "dem",
    "Dante Pittman",
    "certified"
  ],
  [
    25,
    23407,
    23868,
    "rep",
    "Allen Chesser",
    "certified"
  ],
  [
    26,
    22671,
    29943,
    "rep",
    "Donna McDowell White",
    "certified"
  ],
  [
    27,
    31914,
    null,
    "dem",
    "Rodney D. Pierce",
    "certified"
  ],
  [
    28,
    13065,
    28915,
    "rep",
    "Larry C. Strickland",
    "certified"
  ],
  [
    29,
    47945,
    null,
    "dem",
    "Vernetta Alston",
    "certified"
  ],
  [
    30,
    41916,
    null,
    "dem",
    "Marcia Morey",
    "certified"
  ],
  [
    31,
    43291,
    null,
    "dem",
    "Zack Hawkins",
    "certified"
  ],
  [
    32,
    21215,
    20987,
    "dem",
    "Bryan Cohn",
    "supplemental"
  ],
  [
    33,
    33771,
    null,
    "dem",
    "Monika Johnson-Hostler",
    "certified"
  ],
  [
    34,
    33839,
    null,
    "dem",
    "Tim Longest",
    "certified"
  ],
  [
    35,
    26831,
    28651,
    "rep",
    "Mike Schietzelt",
    "certified"
  ],
  [
    36,
    28629,
    22364,
    "dem",
    "Julie von Haefen",
    "certified"
  ],
  [
    37,
    27137,
    30784,
    "rep",
    "Erin Pare",
    "certified"
  ],
  [
    38,
    32854,
    null,
    "dem",
    "Abe Jones",
    "certified"
  ],
  [
    39,
    36730,
    null,
    "dem",
    "James Roberson",
    "certified"
  ],
  [
    40,
    32983,
    18332,
    "dem",
    "Joe John",
    "certified"
  ],
  [
    41,
    31576,
    null,
    "dem",
    "Maria Cervania",
    "certified"
  ],
  [
    42,
    18301,
    6332,
    "dem",
    "Mike Colvin",
    "certified"
  ],
  [
    43,
    18422,
    24753,
    "rep",
    "Diane Wheatley",
    "certified"
  ],
  [
    44,
    20941,
    12683,
    "dem",
    "Charles Smith",
    "certified"
  ],
  [
    45,
    25090,
    null,
    "dem",
    "Frances Vinell Jackson",
    "certified"
  ],
  [
    46,
    null,
    29064,
    "rep",
    "Brenden H. Jones",
    "certified"
  ],
  [
    47,
    11182,
    20428,
    "rep",
    "Jarrod Lowery",
    "certified"
  ],
  [
    48,
    18845,
    17453,
    "dem",
    "Garland E. Pierce",
    "certified"
  ],
  [
    49,
    32814,
    null,
    "dem",
    "Cynthia Ball",
    "certified"
  ],
  [
    50,
    35367,
    null,
    "dem",
    "Renee A. Price",
    "certified"
  ],
  [
    51,
    14339,
    25829,
    "rep",
    "John Sauls",
    "certified"
  ],
  [
    52,
    16466,
    25835,
    "rep",
    "Ben Moss, Jr.",
    "certified"
  ],
  [
    53,
    17007,
    28867,
    "rep",
    "Howard Penny, Jr.",
    "certified"
  ],
  [
    54,
    29910,
    24714,
    "dem",
    "Robert T. Reives II",
    "certified"
  ],
  [
    55,
    14373,
    24474,
    "rep",
    "Mark Brody",
    "certified"
  ],
  [
    56,
    39459,
    6267,
    "dem",
    "Allen Buansi",
    "certified"
  ],
  [
    57,
    31986,
    14955,
    "dem",
    "Tracy Clark",
    "certified"
  ],
  [
    58,
    32379,
    null,
    "dem",
    "Amos Quick",
    "certified"
  ],
  [
    59,
    24859,
    30609,
    "rep",
    "Alan Branson",
    "certified"
  ],
  [
    60,
    23899,
    13928,
    "dem",
    "Cecil Brockman",
    "certified"
  ],
  [
    61,
    33804,
    9058,
    "dem",
    "Mary Price (Pricey) Harrison",
    "certified"
  ],
  [
    62,
    25597,
    29389,
    "rep",
    "John M. Blust",
    "certified"
  ],
  [
    63,
    19460,
    23812,
    "rep",
    "Stephen Ross",
    "certified"
  ],
  [
    64,
    20212,
    24541,
    "rep",
    "Dennis Riddell",
    "certified"
  ],
  [
    65,
    null,
    37457,
    "rep",
    "Reece Pyrtle",
    "certified"
  ],
  [
    66,
    33224,
    null,
    "dem",
    "Sarah Crawford",
    "certified"
  ],
  [
    67,
    12099,
    36358,
    "rep",
    "Cody Huneycutt",
    "certified"
  ],
  [
    68,
    20290,
    33807,
    "rep",
    "David Willis",
    "certified"
  ],
  [
    69,
    19091,
    32796,
    "rep",
    "Dean Arp",
    "certified"
  ],
  [
    70,
    10520,
    33617,
    "rep",
    "Brian Biggs",
    "certified"
  ],
  [
    71,
    31755,
    null,
    "dem",
    "Kanika Brown",
    "certified"
  ],
  [
    72,
    31479,
    null,
    "dem",
    "Amber M. Baker",
    "certified"
  ],
  [
    73,
    20577,
    23400,
    "rep",
    "Jonathan Almond",
    "certified"
  ],
  [
    74,
    25015,
    26908,
    "rep",
    "Jeffrey (Jeff) Zenger",
    "certified"
  ],
  [
    75,
    19743,
    26118,
    "rep",
    "Donny C. Lambeth",
    "certified"
  ],
  [
    76,
    16329,
    27060,
    "rep",
    "Harry Warren",
    "certified"
  ],
  [
    77,
    10907,
    41240,
    "rep",
    "Julia Craven Howard",
    "certified"
  ],
  [
    78,
    11985,
    38928,
    "rep",
    "Neal Jackson",
    "certified"
  ],
  [
    79,
    18667,
    32111,
    "rep",
    "Keith Kidwell",
    "certified"
  ],
  [
    80,
    10884,
    33897,
    "rep",
    "Sam Watford",
    "certified"
  ],
  [
    81,
    13293,
    33971,
    "rep",
    "Larry W. Potts",
    "certified"
  ],
  [
    82,
    22649,
    26965,
    "rep",
    "Brian Echevarria",
    "certified"
  ],
  [
    83,
    15825,
    30279,
    "rep",
    "Grant Campbell",
    "certified"
  ],
  [
    84,
    13424,
    31180,
    "rep",
    "Jeffrey C. McNeely",
    "certified"
  ],
  [
    85,
    12576,
    36147,
    "rep",
    "Dudley Greene",
    "certified"
  ],
  [
    86,
    12467,
    32134,
    "rep",
    "Hugh Blackwell",
    "certified"
  ],
  [
    87,
    11142,
    34187,
    "rep",
    "Destin Hall",
    "certified"
  ],
  [
    88,
    33555,
    null,
    "dem",
    "Mary Belk",
    "certified"
  ],
  [
    89,
    12044,
    38122,
    "rep",
    "Mitchell Smith Setzer",
    "certified"
  ],
  [
    90,
    10119,
    35674,
    "rep",
    "Sarah Stevens",
    "certified"
  ],
  [
    91,
    14583,
    29819,
    "rep",
    "Kyle Hall",
    "certified"
  ],
  [
    92,
    37214,
    null,
    "dem",
    "Terry Brown",
    "certified"
  ],
  [
    93,
    21841,
    28752,
    "rep",
    "Ray Pickett",
    "certified"
  ],
  [
    94,
    10573,
    35329,
    "rep",
    "Blair Eddins",
    "certified"
  ],
  [
    95,
    17855,
    32402,
    "rep",
    "Richard (Todd) Carver",
    "certified"
  ],
  [
    96,
    15629,
    28037,
    "rep",
    "Jay Adams",
    "certified"
  ],
  [
    97,
    null,
    43332,
    "rep",
    "Heather Rhyne",
    "certified"
  ],
  [
    98,
    27083,
    24800,
    "dem",
    "Beth Gardner Helfrich",
    "certified"
  ],
  [
    99,
    27772,
    null,
    "dem",
    "Nasif Majeed",
    "certified"
  ],
  [
    100,
    28937,
    null,
    "dem",
    "Julia Greenfield",
    "certified"
  ],
  [
    101,
    34424,
    null,
    "dem",
    "Carolyn G. Logan",
    "certified"
  ],
  [
    102,
    39811,
    null,
    "dem",
    "Becky Carney",
    "certified"
  ],
  [
    103,
    25772,
    18609,
    "dem",
    "Laura Budd",
    "certified"
  ],
  [
    104,
    27629,
    21748,
    "dem",
    "Brandon Lofton",
    "certified"
  ],
  [
    105,
    27086,
    27299,
    "rep",
    "Tricia Ann Cotham",
    "mecklenburg"
  ],
  [
    106,
    40633,
    null,
    "dem",
    "Carla Cunningham",
    "certified"
  ],
  [
    107,
    38603,
    null,
    "dem",
    "Aisha O. Dew",
    "certified"
  ],
  [
    108,
    15892,
    28982,
    "rep",
    "John A. Torbett",
    "certified"
  ],
  [
    109,
    20374,
    28167,
    "rep",
    "Donnie Loftis",
    "certified"
  ],
  [
    110,
    14268,
    28418,
    "rep",
    "Kelly Hastings",
    "certified"
  ],
  [
    111,
    11110,
    31434,
    "rep",
    "Paul Scott",
    "certified"
  ],
  [
    112,
    32721,
    null,
    "dem",
    "Jordan Lopez",
    "certified"
  ],
  [
    113,
    17223,
    34467,
    "rep",
    "Jake Johnson",
    "certified"
  ],
  [
    114,
    32441,
    21905,
    "dem",
    "Eric Ager",
    "certified"
  ],
  [
    115,
    26203,
    24720,
    "dem",
    "Lindsey Prather",
    "certified"
  ],
  [
    116,
    42815,
    null,
    "dem",
    "Brian Turner",
    "certified"
  ],
  [
    117,
    22390,
    30603,
    "rep",
    "Jennifer Capps Balkcom",
    "certified"
  ],
  [
    118,
    19480,
    30807,
    "rep",
    "Mark Pless",
    "certified"
  ],
  [
    119,
    21641,
    26871,
    "rep",
    "Mike Clampitt",
    "certified"
  ],
  [
    120,
    12572,
    38040,
    "rep",
    "Karl Gillespie",
    "certified"
  ]
]);

