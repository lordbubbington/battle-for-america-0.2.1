// Alaska's 2024 winners are taken from the certified legislative results in
// the January 21, 2025 House and Senate Journals. Ballot-party labels are
// transcribed from the Division of Elections official 2024 summary report.
export const ALASKA_2024_SOURCE = Object.freeze({
  title: 'Alaska Division of Elections, 2024 General Election Official Results',
  url: 'https://www.elections.alaska.gov/results/24GENR/ElectionSummaryReport.pdf',
  status: 'official-certified-winner-roster', year: 2024,
});

export const ALASKA_HOUSE_CERTIFICATE_SOURCE = Object.freeze({
  title: 'Alaska Legislature, House Journal, January 21, 2025, Certificate of Election',
  url: 'https://www.akleg.gov/pdf/34/J/H2025-01-21.PDF',
  status: 'official-certified-winner-roster', year: 2024,
});

export const ALASKA_SENATE_CERTIFICATE_SOURCE = Object.freeze({
  title: 'Alaska Legislature, Senate Journal, January 21, 2025, Certificate of Election',
  url: 'https://www.akleg.gov/pdf/34/J/S2025-01-21.PDF',
  status: 'official-certified-winner-roster', year: 2024,
});

export const ALASKA_DISTRICT_SOURCE = Object.freeze({
  title: 'Alaska Division of Elections, 2022 House and Senate District Designations',
  url: 'https://www.elections.alaska.gov/research/district-maps/',
  year: 2022,
});

// [district, ballot party, certified winner]
export const ALASKA_HOUSE_2024 = Object.freeze([
  [1, 'rep', 'Jeremy T. Bynum'], [2, 'other', 'Rebecca Himschoot'],
  [3, 'dem', 'Andrea "Andi" Story'], [4, 'dem', 'Sara Hannan'],
  [5, 'rep', 'Louise B. Stutes'], [6, 'rep', 'Sarah L. Vance'],
  [7, 'rep', 'Justin Ruffridge'], [8, 'rep', 'Bill Elam'],
  [9, 'other', 'Ky Holland'], [10, 'rep', 'Charles "Chuck" Kopp'],
  [11, 'rep', 'Julie Coulombe'], [12, 'other', 'Calvin R. Schrage'],
  [13, 'dem', 'Andy Josephson'], [14, 'other', 'Alyse S. Galvin'],
  [15, 'rep', 'Mia Costello'], [16, 'dem', 'Carolyn Hall'],
  [17, 'dem', 'William Z. "Zack" Fields'], [18, 'rep', 'David Nelson'],
  [19, 'dem', 'Genevieve G. Mina'], [20, 'dem', 'Andrew T. Gray'],
  [21, 'dem', 'Donna C. Mears'], [22, 'dem', 'Ted J. Eischeid'],
  [23, 'rep', 'Jamie Allard'], [24, 'rep', 'Dan Saddler'],
  [25, 'rep', 'DeLena M. Johnson'], [26, 'rep', 'Cathy L. Tilton'],
  [27, 'rep', 'Jubilee L. Underwood'], [28, 'rep', 'Elexie Moore'],
  [29, 'rep', 'George Rauscher'], [30, 'rep', 'Kevin J. McCabe'],
  [31, 'dem', 'Maxine L. Dibert'], [32, 'rep', 'Will Stapp'],
  [33, 'rep', 'Glenn "Mike" Prax'], [34, 'rep', 'Frank Tomaszewski'],
  [35, 'dem', 'Ashley E. Carrick'], [36, 'rep', 'Rebecca A. Schwanke'],
  [37, 'other', 'Bryce Edgmon'], [38, 'dem', 'Nellie D. "Unangik" Jimmie'],
  [39, 'dem', 'Neal W. Foster'], [40, 'dem', 'Robyn "Niayuq" Burke'],
]);

// Alaska's 20 Senate districts are lettered A–T. Even-numbered indexes
// (districts B, D, ... T) were on the 2024 ballot and return in 2028.
// The other class is deliberately left unassigned in this 2024 roster.
export const ALASKA_SENATE_2024 = Object.freeze([
  [2, 'rep', 'Jesse J. Bjorkman'], [4, 'rep', 'James D. Kaufman'],
  [6, 'dem', 'Matt Claman'], [8, 'dem', 'Forrest Dunbar'],
  [10, 'rep', 'Kelly R. Merrick'], [12, 'rep', 'Robert Yundt'],
  [14, 'dem', 'Scott Kawasaki'], [16, 'rep', 'Mike Cronk'],
  [18, 'dem', 'Donald C. "Donny" Olson'], [20, 'dem', 'Jesse Kiehl'],
]);
