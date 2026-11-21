// Iowa 2024 district winners and party labels come from the Secretary of
// State's certified canvass summary; the official winner list independently
// confirms each district's named winner.
export const IOWA_2024_SOURCE = Object.freeze({
  title: 'Iowa Secretary of State, 2024 General Election Canvass Summary',
  url: 'https://sos.iowa.gov/elections/pdf/2024/general/canvsummary.pdf',
  status: 'official-certified-winner-roster', year: 2024,
});

export const IOWA_WINNER_LIST_SOURCE = Object.freeze({
  title: 'Iowa Secretary of State, 2024 General Election Winner List',
  url: 'https://sos.iowa.gov/elections/pdf/2024/general/Winnerlist.pdf',
  status: 'official-certified', year: 2024,
});

export const IOWA_DISTRICT_SOURCE = Object.freeze({
  title: 'Iowa Legislative Services Agency, 2021 Redistricting Plan 2, effective beginning with 2022 elections',
  url: 'https://www.legis.iowa.gov/docs/publications/REDST/2022/Plan2Statewide22x34.pdf',
  year: 2021,
});

// [district, winner party, certified winner]
export const IOWA_HOUSE_2024 = Object.freeze([
  [1, 'dem', 'J.D. Scholten'], [2, 'rep', 'Robert Henderson'],
  [3, 'rep', 'Thomas Jeneary'], [4, 'rep', 'Skyler Wheeler'],
  [5, 'rep', 'Zachary M. Dieken'], [6, 'rep', 'Megan Jones'],
  [7, 'rep', 'Mike Sexton'], [8, 'rep', 'Ann Meyer'],
  [9, 'rep', 'Henry Stone'], [10, 'rep', 'John H. Wills'],
  [11, 'rep', 'Craig Steven Williams'], [12, 'rep', 'Steven Holt'],
  [13, 'rep', 'Travis M Sitzmann'], [14, 'rep', 'Jacob Bossman'],
  [15, 'rep', 'Matt W. Windschitl'], [16, 'rep', 'David Sieck'],
  [17, 'rep', 'Devon Wood'], [18, 'rep', 'Thomas Jay Moore'],
  [19, 'rep', 'Brent Siegrist'], [20, 'dem', 'Josh Turek'],
  [21, 'rep', 'Brooke Boden'], [22, 'rep', 'Samantha Fett'],
  [23, 'rep', 'Ray Bubba Sorensen'], [24, 'rep', 'Sam Wengryn'],
  [25, 'rep', 'Hans Wilz'], [26, 'rep', 'Austin Harris'],
  [27, 'dem', 'Kenan Judge'], [28, 'rep', 'David Young'],
  [29, 'dem', 'Brian Meyer'], [30, 'dem', 'Megan L. Srinivas'],
  [31, 'dem', 'Mary Lee Madison'], [32, 'dem', 'Jennifer Konfrst'],
  [33, 'dem', 'Ruth Ann Gaines'], [34, 'dem', 'Rob Johnson'],
  [35, 'dem', 'Sean Bagniewski'], [36, 'dem', 'Austin Baeth'],
  [37, 'rep', 'Barb Kniff McCulla'], [38, 'rep', 'Jon Dunwell'],
  [39, 'dem', 'Rick L. Olson'], [40, 'rep', 'Bill Gustoff'],
  [41, 'rep', 'Ryan Weldon'], [42, 'dem', 'Heather Matson'],
  [43, 'rep', 'Eddie Andrews'], [44, 'dem', 'Larry McBurney'],
  [45, 'rep', 'Brian K. Lohse'], [46, 'rep', 'Dan Gehlbach'],
  [47, 'rep', 'Carter Nordman'], [48, 'rep', 'Chad Behn'],
  [49, 'dem', 'Beth Wessel-Kroeschell'], [50, 'dem', 'Ross Wilburn'],
  [51, 'rep', 'Brett Barker'], [52, 'rep', 'David Blom'],
  [53, 'rep', 'Dean Fisher'], [54, 'rep', 'Joshua Meggers'],
  [55, 'rep', 'Shannon Latham'], [56, 'rep', 'Mark I. Thompson'],
  [57, 'rep', 'Pat Grassley'], [58, 'rep', 'Charley Thomson'],
  [59, 'rep', 'Christian Hermanson'], [60, 'rep', 'Jane E. Bloomingdale'],
  [61, 'dem', 'Timi Brown-Powers'], [62, 'dem', 'Jerome Amos Jr'],
  [63, 'rep', 'Michael R. Bergan'], [64, 'rep', 'Jason Gearhart'],
  [65, 'rep', 'Shannon Lundgren'], [66, 'rep', 'Steven P Bradley'],
  [67, 'rep', 'Craig Johnson'], [68, 'rep', 'Chad Ingels'],
  [69, 'rep', 'Tom Determann'], [70, 'rep', 'Norlin Mommsen'],
  [71, 'dem', 'Lindsay James'], [72, 'rep', 'Jennifer J. Smith'],
  [73, 'dem', 'Elizabeth Wilson'], [74, 'dem', 'Eric Gjerde'],
  [75, 'dem', 'Bob Kressig'], [76, 'rep', 'Derek Wulf'],
  [77, 'dem', 'Jeff Cooling'], [78, 'dem', 'Sami Scheetz'],
  [79, 'dem', 'Tracy Ehlert'], [80, 'dem', 'Aime J. Wichtendahl'],
  [81, 'dem', 'Daniel Gosa'], [82, 'rep', 'Bobby Kaufmann'],
  [83, 'rep', 'Cindy Golding'], [84, 'rep', 'Thomas Gerhold'],
  [85, 'dem', 'Amy Nielsen'], [86, 'dem', 'Dave Jacoby'],
  [87, 'rep', 'Jeff Shipley'], [88, 'rep', 'Helena Hayes'],
  [89, 'dem', 'Elinor A. Levin'], [90, 'dem', 'Adam Zabner'],
  [91, 'rep', 'Judd Lawler'], [92, 'rep', 'Heather Hora'],
  [93, 'rep', 'Gary Mohr'], [94, 'rep', 'Mike Vondran'],
  [95, 'rep', 'Taylor Collins'], [96, 'rep', 'Mark Cisneros'],
  [97, 'dem', 'Ken Croken'], [98, 'dem', 'Monica Kurth'],
  [99, 'rep', 'Matthew Rinker'], [100, 'rep', 'Martin L. Graber'],
]);

// Odd-numbered Senate districts were elected in 2022. The 25 even-numbered
// districts elected in 2024 form Iowa's Senate class returning in 2028.
export const IOWA_SENATE_2024 = Object.freeze([
  [2, 'rep', 'Jeff Taylor'], [4, 'rep', 'Tim Kraayenbrink'],
  [6, 'rep', 'Jason Schultz'], [8, 'rep', 'Mark Costello'],
  [10, 'rep', 'Dan Dawson'], [12, 'rep', 'Amy Sinclair'],
  [14, 'dem', 'Sarah Trone Garriott'], [16, 'dem', 'Claire Celsi'],
  [18, 'dem', 'Janet Petersen'], [20, 'rep', 'Mike Pike'],
  [22, 'dem', 'Matt Blake'], [24, 'rep', 'Jesse Green'],
  [26, 'rep', 'Kara Warme'], [28, 'rep', 'Dennis Guth'],
  [30, 'rep', 'Doug Campbell'], [32, 'rep', 'Mike Klimesh'],
  [34, 'rep', 'Dan Zumbach'], [36, 'rep', 'Thomas Townsend'],
  [38, 'rep', 'Dave Sires'], [40, 'dem', 'Art Staed'],
  [42, 'rep', 'Charlie McClintock'], [44, 'rep', 'Adrian Dickey'],
  [46, 'rep', 'Dawn Driscoll'], [48, 'rep', 'Mark S. Lofgren'],
  [50, 'rep', 'Jeff Reichman'],
]);
