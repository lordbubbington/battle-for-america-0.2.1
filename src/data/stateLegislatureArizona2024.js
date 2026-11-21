// Arizona district winners transcribed from the Secretary of State's signed
// 2024 Official Canvass. House winner order follows the report; Arizona does
// not number the two block-vote seats within each legislative district.
export const ARIZONA_2024_SOURCE = Object.freeze({
  title: 'Arizona Secretary of State, 2024 General Election Official Canvass',
  url: 'https://apps.azsos.gov/election/2024/ge/canvass/20241105_GeneralCanvass_Signed.pdf',
  status: 'official-certified', year: 2024,
});

export const ARIZONA_DISTRICT_SOURCE = Object.freeze({
  title: 'Arizona Independent Redistricting Commission, Approved and Certified Official Legislative Map Version 17.0',
  url: 'https://irc.az.gov/maps',
  year: 2022,
});

export const ARIZONA_PRESIDENT_2024_SOURCE = Object.freeze({
  title: 'Federal Election Commission, Official 2024 Presidential General Election Results, sourced from state election offices',
  url: 'https://www.fec.gov/resources/cms-content/documents/2024presgeresults.pdf',
  status: 'official-certified', year: 2024,
});

export const ARIZONA_PRESIDENT_2024 = Object.freeze({ dem: 1582860, rep: 1770242 });

// [district, Democratic votes, Republican votes, winner's party, winner]
// A null vote total means that party did not appear in the certified return,
// or that the candidate total was not transcribed into this seat-level file.
export const ARIZONA_SENATE_2024 = Object.freeze([
  [1, 49108, 94947, 'rep', 'Mark Finchem'],
  [2, 48333, 52100, 'rep', 'Shawna Bolick'],
  [3, null, 110048, 'rep', 'John Kavanagh'],
  [4, 70614, 76079, 'rep', 'Carine Werner'],
  [5, 67425, 31296, 'dem', 'Lela Alston'],
  [6, 72721, null, 'dem', 'Theresa Hatathlie'],
  [7, 43406, 80750, 'rep', 'Wendy Rogers'],
  [8, 53111, 34528, 'dem', 'Lauren Kuby'],
  [9, 42072, 39261, 'dem', 'Eva Burch'],
  [10, 44170, 70561, 'rep', 'David Christian Farnsworth'],
  [11, 52106, 20095, 'dem', 'Catherine Miranda'],
  [12, 70499, 50796, 'dem', 'Denise "Mitzi" Epstein'],
  [13, 55287, 62670, 'rep', 'J.D. Mesnard'],
  [14, 50554, 76251, 'rep', 'Warren Petersen'],
  [15, 43769, 87580, 'rep', 'Jake Hoffman'],
  [16, 45888, 58386, 'rep', 'Thomas "T.J." Shope Jr.'],
  [17, 74669, 77714, 'rep', 'Venden "Vince" Leach'],
  [18, 89003, null, 'dem', 'Priya Sundareshan'],
  [19, 42555, 71192, 'rep', 'David Gowan'],
  [20, 65214, null, 'dem', 'Sally Ann Gonzales'],
  [21, 64282, null, 'dem', 'Rosanna Gabaldón'],
  [22, 45253, 24812, 'dem', 'Eva Diaz'],
  [23, 42658, 36602, 'dem', 'Brian Fernandez'],
  [24, 38436, null, 'dem', 'Analise Ortiz'],
  [25, null, 88531, 'rep', 'Timothy "Tim" Dunn'],
  [26, 31198, 15826, 'dem', 'Flavio Bravo'],
  [27, null, 67274, 'rep', 'Kevin Payne'],
  [28, 1112, 97174, 'rep', 'Frank Carroll'],
  [29, 48608, 70924, 'rep', 'Janae Shamp'],
  [30, 25295, 92213, 'rep', 'Hildy Angius'],
]);

// [district, position-in-canvass-winner-order, party, winner]
// Position is a stable internal slot for the two winners in each block-vote
// district, not a numbered single-member race or a separately reported seat.
export const ARIZONA_HOUSE_2024 = Object.freeze([
  [1, 1, 'rep', 'Selina Bliss'], [1, 2, 'rep', 'Quang Nguyen'],
  [2, 1, 'rep', 'Justin Wilmeth'], [2, 2, 'dem', 'Stephanie Simacek'],
  [3, 1, 'rep', 'Joseph Chaplik'], [3, 2, 'rep', 'Alexander Kolodin'],
  [4, 1, 'rep', 'Pamela Carter'], [4, 2, 'rep', 'Matt Gress'],
  [5, 1, 'dem', 'Sarah Liguori'], [5, 2, 'dem', 'Aaron Márquez'],
  [6, 1, 'dem', 'Mae Peshlakai'], [6, 2, 'dem', 'Myron Tsosie'],
  [7, 1, 'rep', 'Walter "Walt" Blackman'], [7, 2, 'rep', 'David Marshall Sr.'],
  [8, 1, 'dem', 'Janeen Connolly'], [8, 2, 'dem', 'Brian Garcia'],
  [9, 1, 'dem', 'Lorena Austin'], [9, 2, 'dem', 'Seth Blattman'],
  [10, 1, 'rep', 'Ralph Heap'], [10, 2, 'rep', 'Justin Olson'],
  [11, 1, 'dem', 'Junelle Cavero'], [11, 2, 'dem', 'Oscar De Los Santos'],
  [12, 1, 'dem', 'Patricia "Patty" Contreras'], [12, 2, 'dem', 'Anastasia "Stacey" Travers'],
  [13, 1, 'rep', 'Jeff Weninger'], [13, 2, 'rep', 'Julie Willoughby'],
  [14, 1, 'rep', 'Laurin Hendrix'], [14, 2, 'rep', 'Khyl Powell'],
  [15, 1, 'rep', 'Neal Carter'], [15, 2, 'rep', 'Michael Way'],
  [16, 1, 'rep', 'Chris Lopez'], [16, 2, 'rep', 'Teresa Martinez'],
  [17, 1, 'rep', 'Rachel Jones'], [17, 2, 'dem', 'Kevin Volk'],
  [18, 1, 'dem', 'Nancy Gutierrez'], [18, 2, 'dem', 'Chris Mathis'],
  [19, 1, 'rep', 'Lupe Diaz'], [19, 2, 'rep', 'Gail Griffin'],
  [20, 1, 'dem', 'Alma Hernandez'], [20, 2, 'dem', 'Betty Villegas'],
  [21, 1, 'dem', 'Consuelo Hernandez'], [21, 2, 'dem', 'Stephanie Stahl Hamilton'],
  [22, 1, 'dem', 'Lupe Chavira Contreras'], [22, 2, 'dem', 'Elda Luna-Nájera'],
  [23, 1, 'rep', 'Michele Pena'], [23, 2, 'dem', 'Mariana Sandoval'],
  [24, 1, 'dem', 'Anna Abeytia'], [24, 2, 'dem', 'Lydia Hernandez'],
  [25, 1, 'rep', 'Michael Carbone'], [25, 2, 'rep', 'Nickolas "Nick" Kupper'],
  [26, 1, 'dem', 'Cesar Aguilar'], [26, 2, 'dem', 'Quantá Crews'],
  [27, 1, 'rep', 'Lisa Fink'], [27, 2, 'rep', 'Tony Rivero'],
  [28, 1, 'rep', 'David Livingston'], [28, 2, 'rep', 'Beverly Pingerelli'],
  [29, 1, 'rep', 'Steve Montenegro'], [29, 2, 'rep', 'James Taylor'],
  [30, 1, 'rep', 'Leo Biasiucci'], [30, 2, 'rep', 'John Gillette'],
]);
