// Regular 2028 election classes only. Holder parties, current vacancies,
// appointments and future special-election orders remain separate inputs.
const sequence = (size) => Array.from({ length: size }, (_, index) => index + 1);
const source = (title, url, detail, retrieval = 'direct-official-page-or-PDF', supportingUrls = []) => Object.freeze({
  title, url, detail, authority: 'state-government', checkedOn: '2026-11-17', retrieval,
  status: 'official-regular-class-source; current-composition-and-specials-not-established', supportingUrls,
  regularElectionYear: 2028,
});
const florida = source('Florida Constitution, Article III section 15; 40 districts', 'https://www.flsenate.gov/Laws/Constitution', 'Odd-numbered four-year Senate class runs in years divisible by four; even class runs in other even years.');
const hawaii = source('Hawaii 2024 Election Proclamation and 2026 Proclamation', 'https://elections.hawaii.gov/main/2024-proclamation/', 'Regular four-year 2024 class: 1,3,4,6,7,12,16,18,19,22,23,24. The 2026 district-19 vacancy election expires in 2028 and does not change class.', 'official-search-index-excerpts; direct-page-403', ['https://elections.hawaii.gov/2026-proclamation/', 'https://elections.hawaii.gov/voting/contest-schedule/2024-contest-schedule/']);
const illinois = source('Illinois Legislative Research Unit, Preface 2023 p23; 10 ILCS 5/29C-5,10,15', 'https://ilga.gov/commission/lru/Preface2023.pdf', 'Districts1mod3: 2022/2026/2030 terms4/4/2. Districts0mod3:2022/2026/2028 terms4/2/4. Remaining districts2mod3:2022/2024/2028 terms2/4/4. Thus39 seats return in2028, not the complement of2026.', 'official-search-index-excerpts; direct-PDF-502', ['https://ilga.gov/documents/legislation/ilcs/documents/001000050K29C-10.htm', 'https://www.ilga.gov/legislation/ILCS/details?ActID=170&ActName=Election+Code.&ChapAct=10+ILCS+5%2F&Chapter=&ChapterID=3&MajorTopic=&Print=True&SeqEnd=101100000&SeqStart=100700000']);
const montana = source('Montana SOS, 2024 Offices Qualifications and Fees, p2', 'https://sosmt.gov/wp-content/uploads/wpfd/preview_files/2024-Offices-Qualifications-and-Fees(550730a8ac07ca5a875783e526529bfb).pdf', '25 specifically listed Senate districts elect four-year terms in2024; their regular class returns in2028.');
const northDakota = source('North Dakota 69th Assembly and official2024returns', 'https://ndlegis.gov/assembly/69-2025/regular', 'Even districts elected four-year terms2024. Odd districts elected2022/2026. Official2024returns identify9/15as unexpired2yearterms, not new2028classes. NDCC54-03 still prints9A/9B, but2024officialreturns show district9vote-for2; preserve in-game48district structure and leave operative-boundary/current-holder revalidation separate.', 'direct-official-page-or-PDF', ['https://ndlegis.gov/cencode/t54c03.pdf', 'https://results.sos.nd.gov/resultsSW.aspx?map=DIST&text=Race&type=LG']);
const ohio = source('Ohio Constitution II-2; official 2024 election and district33 special term', 'https://codes.ohio.gov/ohio-constitution/section-2.2', 'Regular16even districts elected2024 for4years. District33 special2024 term ends2026 per official county ballot; it remains a2026/2030 class, not2028.', 'direct-official-page-and-official-ballot-index', ['https://lookup.boe.ohio.gov/vtrapp/mahoning/getballot.aspx?bpty=X&elect=20241105g_webeix0&prsid=0127__1', 'https://www.ohiosos.gov/data']);
const oklahoma = source('Oklahoma14-80.35.14; 2024 filing packet', 'https://www.oklegislature.gov/OK_Statutes/CompleteTitles/os14.pdf', 'Even districts elected2022 to2026 then4years; odd districts elected2024 then4years. District46 special2024 unexpired term does not turn it into2028class.');
const utah = source('Utah36-1-102, legislative districts chapter p1', 'https://le.utah.gov/xcode/Title36/Chapter1/C36-1_1800010118000101.pdf', 'Explicit14district2024four-year class:2,3,4,8,10,15,16,17,22,24,25,26,27,29. Districts12/21belong to2022class despite special result rows.');
const westVirginia = source('West Virginia1-2-1(c),(d), 2021 redistricting', 'https://code.wvlegislature.gov/1-2-1/', '34Senators; one of each district’s two seats elected every2years for4year term. Existing2024winner slot remains2028class; paired2022slot remainsheld.');
const wisconsin = source('Wisconsin ConstitutionIV-5, court reproduction; Dunn County current map/election guide', 'https://dunncountywi.gov/index.asp?SEC=%7BB41EADC4-59F9-4E33-823A-EC2FA3A95CC9%7D', 'Official county confirms4year terms, odd23/31elections2026 and even10election2028. Constitution requires alternating odd/even classes.', 'direct-official-page-or-PDF', ['https://acefiling.wicourts.gov/document/uploaded/2023AP001399/748914']);
const nebraska = source('Nebraska32-508', 'https://nebraskalegislature.gov/laws/statutes.php?statute=32-508', '49nonpartisan districts. Odd class anchored1996 every4years; even1994 every4years.');

export const BUILD45_LEGISLATURE_CLASS_SPECS = Object.freeze([
  { state: 'FL', chamber: 'upper', total: 40, districtsUp: sequence(40).filter((n) => n % 2 === 1), source: florida },
  { state: 'HI', chamber: 'upper', total: 25, districtsUp: [1, 3, 4, 6, 7, 12, 16, 18, 19, 22, 23, 24], source: hawaii },
  { state: 'IL', chamber: 'upper', total: 59, districtsUp: sequence(59).filter((n) => n % 3 !== 1), source: illinois },
  { state: 'MT', chamber: 'upper', total: 50, districtsUp: [2, 3, 5, 7, 13, 15, 16, 17, 20, 21, 24, 26, 27, 30, 33, 35, 36, 37, 38, 39, 40, 44, 45, 46, 47], source: montana },
  { state: 'ND', chamber: 'upper', total: 47, districtsUp: sequence(47).filter((n) => n % 2 === 0), source: northDakota },
  { state: 'ND', chamber: 'lower', total: 94, membersPerDistrict: 2, districtsUp: sequence(47).filter((n) => n % 2 === 0), source: northDakota },
  { state: 'OH', chamber: 'upper', total: 33, districtsUp: sequence(33).filter((n) => n % 2 === 0), source: ohio },
  { state: 'OK', chamber: 'upper', total: 48, districtsUp: sequence(48).filter((n) => n % 2 === 1), source: oklahoma },
  { state: 'UT', chamber: 'upper', total: 29, districtsUp: [2, 3, 4, 8, 10, 15, 16, 17, 22, 24, 25, 26, 27, 29], source: utah },
  { state: 'WV', chamber: 'upper', total: 34, membersPerDistrict: 2, pairedClasses: true, districtsUp: sequence(17), source: westVirginia },
  { state: 'WI', chamber: 'upper', total: 33, districtsUp: sequence(33).filter((n) => n % 2 === 0), source: wisconsin },
  { state: 'NE', chamber: 'unicameral', total: 49, districtsUp: sequence(49).filter((n) => n % 2 === 1), nonpartisan: true, source: nebraska },
]);

export const BUILD45_LEGISLATURE_CLASSES = Object.freeze(BUILD45_LEGISLATURE_CLASS_SPECS.flatMap((spec) => sequence(spec.total).map((seatIndex) => {
  const number = Math.ceil(seatIndex / (spec.membersPerDistrict || 1));
  // The preserved2024operative return uses4A/4B but district9vote-for2.
  // Do not promote the conflicting statutory9A/9B text to current geometry.
  const split = spec.state === 'ND' && spec.chamber === 'lower' && number === 4;
  const districtId = String(number) + (split ? (seatIndex % 2 === 1 ? 'a' : 'b') : '');
  const seatUpIn2028 = spec.pairedClasses ? seatIndex % 2 === 1 : spec.districtsUp.includes(number);
  return Object.freeze({ seatId: spec.state + ':' + spec.chamber + ':seat-' + String(seatIndex).padStart(3, '0'),
    state: spec.state, chamber: spec.chamber, seatIndex, districtId, seatUpIn2028,
    seatUpStatus: 'official-regular-class-2028; specials-and-vacancies-separate', seatUpSource: spec.source,
    ballotPartisan: !spec.nonpartisan, regularNextElection: seatUpIn2028 ? 2028 : 2030 });
})));
