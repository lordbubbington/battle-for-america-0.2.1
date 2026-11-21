// Projects the real state boundaries in src/data/us-geo.json into one SVG
// canvas. The lower 48 use an Albers equal-area conic (the projection the US
// Geological Survey uses for the country), Alaska and Hawaii get their own
// Albers grids and are inset bottom-left, so their shapes stay recognisable.

import GEO from '@/data/us-geo.json';
import { CITIES } from '@/data/cities';

const RAD = Math.PI / 180;

const CONUS = { p1: 29.5, p2: 45.5, lat0: 37.5, lon0: -96 };
const ALASKA = { p1: 55, p2: 65, lat0: 58.5, lon0: -152 };
const HAWAII = { p1: 8, p2: 18, lat0: 19.9, lon0: -157 };

const WIDTH = 960;
const HEIGHT = 620;
const BOX = {
  conus: { x: 0, y: 0, w: 960, h: 470 },
  ak: { x: 6, y: 478, w: 158, h: 128 },
  hi: { x: 182, y: 500, w: 118, h: 98 },
};

// The northeast callouts share the same coordinates in every map. These
// offsets only place ink. State paths and their selection points stay put.
const CALLOUTS = {
  RI: { x: 858, y: 135, elbowX: 834 },
  CT: { x: 858, y: 149, elbowX: 827 },
  NJ: { x: 835, y: 186, elbowX: 806 },
  DE: { x: 835, y: 201, elbowX: 801 },
  MD: { x: 835, y: 216, elbowX: 794, from: [768, 209] },
};

const HIDDEN_CITY_MARKERS = new Set(['Indianapolis', 'Little Rock']);

function buildLabels(states, cities) {
  const city = Object.fromEntries(cities.map((point) => [point.name, point]));
  const positions = {
    CA: { x: city.Sacramento.x, align: 'first-glyph', fontSize: 10 },
    AK: { x: city.Anchorage.x, y: city.Honolulu.y, align: 'glyph-gap', fontSize: 10 },
    LA: { x: states.AR.cx, fontSize: 10 },
    ID: { y: city.Boise.y, fontSize: 10 },
    FL: { x: states.SC.cx, y: city.Tampa.y, fontSize: 10 },
  };

  return Object.fromEntries(Object.entries(states).map(([abbr, state]) => {
    const callout = CALLOUTS[abbr];
    const anchor = {
      x: state.cx,
      y: state.cy,
      align: 'center',
      fontSize: state.w < 30 ? 8.5 : state.w < 60 ? 10 : 11,
      ...positions[abbr],
    };
    if (abbr === 'DC') {
      const { cx, cy } = state;
      return [abbr, {
        ...anchor, x: cx - 8, y: cy + 11, align: 'end', fontSize: 10,
        leader: `M${cx} ${cy}L${cx - 6} ${cy + 8}`,
      }];
    }
    if (callout) {
      const { x, y, elbowX, from = [state.cx, state.cy] } = callout;
      return [abbr, { ...anchor, x, y, align: 'start', fontSize: 11, leader: `M${from.join(' ')}L${elbowX} ${y}H${x - 4}` }];
    }
    return [abbr, anchor];
  }));
}

function albers({ p1, p2, lat0, lon0 }) {
  const n = (Math.sin(p1 * RAD) + Math.sin(p2 * RAD)) / 2;
  const c = Math.cos(p1 * RAD) ** 2 + 2 * n * Math.sin(p1 * RAD);
  const rho0 = Math.sqrt(Math.max(0, c - 2 * n * Math.sin(lat0 * RAD))) / n;
  return (lon, lat) => {
    const theta = n * (lon - lon0) * RAD;
    const rho = Math.sqrt(Math.max(0, c - 2 * n * Math.sin(lat * RAD))) / n;
    return [rho * Math.sin(theta), rho0 - rho * Math.cos(theta)];
  };
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

// Scale + centre one region's geometry into its box, returning a lon/lat -> svg
// point function.
function fitRegion(config, rings, box) {
  const project = albers(config);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  rings.forEach((ring) => {
    ring.forEach(([lon, lat]) => {
      const [x, y] = project(lon, lat);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
  });

  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = Math.min(box.w / w, box.h / h);
  const offsetX = box.x + (box.w - w * scale) / 2;
  const offsetY = box.y + (box.h - h * scale) / 2;

  return (lon, lat) => {
    const [x, y] = project(lon, lat);
    return [round1(offsetX + (x - minX) * scale), round1(offsetY + (maxY - y) * scale)];
  };
}

let cache = null;

export function buildMap() {
  if (cache) return cache;

  const conusRings = GEO.filter((g) => g.a !== 'AK' && g.a !== 'HI').flatMap((g) => g.p);
  const akGeo = GEO.find((g) => g.a === 'AK');
  const hiGeo = GEO.find((g) => g.a === 'HI');

  const projectConus = fitRegion(CONUS, conusRings, BOX.conus);
  const projectAk = akGeo ? fitRegion(ALASKA, akGeo.p, BOX.ak) : projectConus;
  const projectHi = hiGeo ? fitRegion(HAWAII, hiGeo.p, BOX.hi) : projectConus;

  const projectorFor = (abbr) => (abbr === 'AK' ? projectAk : abbr === 'HI' ? projectHi : projectConus);

  const states = {};
  GEO.forEach((g) => {
    const project = projectorFor(g.a);
    let d = '';
    /** @type {{area: number, minX: number, maxX: number, minY: number, maxY: number} | null} */
    let box = null;

    g.p.forEach((ring) => {
      const pts = ring.map(([lon, lat]) => project(lon, lat));
      if (pts.length < 3) return;
      d += `M${pts.map((p) => `${p[0]} ${p[1]}`).join('L')}Z`;

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      pts.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
      const area = (maxX - minX) * (maxY - minY);
      if (!box || area > box.area) box = { area, minX, maxX, minY, maxY };
    });

    if (!box) return;
    states[g.a] = {
      d,
      cx: round1((box.minX + box.maxX) / 2),
      cy: round1((box.minY + box.maxY) / 2),
      w: round1(box.maxX - box.minX),
      h: round1(box.maxY - box.minY),
    };
  });

  const cities = CITIES.filter((c) => !HIDDEN_CITY_MARKERS.has(c.name)).map((c) => {
    const project = c.region === 'ak' ? projectAk : c.region === 'hi' ? projectHi : projectConus;
    const [x, y] = project(c.lon, c.lat);
    return { ...c, x, y };
  });

  cache = { width: WIDTH, height: HEIGHT, states, cities, labels: buildLabels(states, cities) };
  return cache;
}
