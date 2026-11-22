// Phase 1 Modding Schema Validator — validates declarative JSON mod packs
// (manifest, candidates, ratings, states, scenarios) before they enter the registry.

const VALID_MOD_ID = /^[a-z0-9][a-z0-9-_]{1,63}$/;
const VALID_PARTIES = new Set(['dem', 'rep', 'lib', 'grn']);
const VALID_REGIONS = new Set(['northeast', 'south', 'midwest', 'west']);
const VALID_STATE_ABBRS = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
  'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX',
  'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]);

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isSafePortraitPath(p) {
  if (typeof p !== 'string' || !p.trim()) return false;
  if (p.includes('..') || p.includes('\\')) return false;
  return /^(assets\/|\/art\/|https?:\/\/|data:image\/|bfa-mod:\/\/)/i.test(p.trim());
}

export function validateModBundle(bundle) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(bundle)) {
    return { valid: false, errors: ['Mod bundle must be an object.'], warnings };
  }

  for (const pe of bundle.parseErrors || []) {
    errors.push(String(pe));
  }

  // 1. manifest.json (required)
  const manifest = bundle.manifest;
  if (!isPlainObject(manifest)) {
    errors.push('manifest.json is required and must be a JSON object.');
  } else {
    if (typeof manifest.id !== 'string' || !VALID_MOD_ID.test(manifest.id)) {
      errors.push('manifest.id must be 2–64 lowercase letters, numbers, hyphens, or underscores.');
    }
    if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
      errors.push('manifest.name must be a non-empty string.');
    }
    if (typeof manifest.version !== 'string' || !manifest.version.trim()) {
      errors.push('manifest.version must be a non-empty string (e.g. "1.0.0").');
    }
    if (manifest.mode !== undefined && !['patch', 'total-conversion'].includes(manifest.mode)) {
      errors.push('manifest.mode must be "patch" or "total-conversion".');
    }
  }

  // 2. candidates.json (optional)
  if (bundle.candidates !== null && bundle.candidates !== undefined) {
    const c = bundle.candidates;
    if (!isPlainObject(c)) {
      errors.push('candidates.json must be a JSON object ({ add?, patch?, remove? }).');
    } else {
      if (c.add !== undefined) {
        if (!Array.isArray(c.add)) {
          errors.push('candidates.add must be an array.');
        } else {
          c.add.forEach((cand, idx) => {
            const prefix = `candidates.add[${idx}]`;
            if (!isPlainObject(cand)) {
              errors.push(`${prefix} must be an object.`);
              return;
            }
            if (typeof cand.id !== 'string' || !VALID_MOD_ID.test(cand.id)) {
              errors.push(`${prefix}.id must be a valid slug.`);
            }
            if (typeof cand.name !== 'string' || !cand.name.trim()) {
              errors.push(`${prefix}.name is required.`);
            }
            if (!VALID_PARTIES.has(cand.party)) {
              errors.push(`${prefix}.party must be one of dem, rep, lib, grn.`);
            }
            if (cand.nat !== undefined && (typeof cand.nat !== 'number' || !Number.isFinite(cand.nat) || Math.abs(cand.nat) > 30)) {
              errors.push(`${prefix}.nat must be a finite number between -30 and 30.`);
            }
            if (cand.region !== undefined) {
              if (!isPlainObject(cand.region)) {
                errors.push(`${prefix}.region must be an object.`);
              } else {
                for (const [rk, rv] of Object.entries(cand.region)) {
                  if (!VALID_REGIONS.has(rk)) errors.push(`${prefix}.region has unknown region "${rk}".`);
                  if (typeof rv !== 'number' || !Number.isFinite(rv) || Math.abs(rv) > 30) {
                    errors.push(`${prefix}.region.${rk} must be a finite number between -30 and 30.`);
                  }
                }
              }
            }
            if (cand.portrait !== undefined && !isSafePortraitPath(cand.portrait)) {
              errors.push(`${prefix}.portrait must be a safe assets/, /art/, data:image/, https://, or bfa-mod:// path without "..".`);
            }
          });
        }
      }
      if (c.patch !== undefined) {
        if (!isPlainObject(c.patch)) {
          errors.push('candidates.patch must be an object keyed by candidate ID.');
        } else {
          for (const [cid, delta] of Object.entries(c.patch)) {
            if (!isPlainObject(delta)) {
              errors.push(`candidates.patch.${cid} must be an object.`);
              continue;
            }
            if (delta.nat !== undefined && (typeof delta.nat !== 'number' || !Number.isFinite(delta.nat) || Math.abs(delta.nat) > 30)) {
              errors.push(`candidates.patch.${cid}.nat must be a finite number between -30 and 30.`);
            }
            if (delta.portrait !== undefined && !isSafePortraitPath(delta.portrait)) {
              errors.push(`candidates.patch.${cid}.portrait must be a safe portrait path.`);
            }
          }
        }
      }
      if (c.remove !== undefined) {
        if (!Array.isArray(c.remove) || c.remove.some((id) => typeof id !== 'string')) {
          errors.push('candidates.remove must be an array of candidate ID strings.');
        }
      }
    }
  }

  // 3. ratings.json (optional)
  if (bundle.ratings !== null && bundle.ratings !== undefined) {
    if (!isPlainObject(bundle.ratings)) {
      errors.push('ratings.json must be an object keyed by candidate ID.');
    } else {
      for (const [cid, r] of Object.entries(bundle.ratings)) {
        if (!isPlainObject(r)) {
          errors.push(`ratings.${cid} must be an object.`);
          continue;
        }
        for (const key of ['debate', 'speech', 'rally', 'corruption']) {
          if (r[key] !== undefined && (typeof r[key] !== 'number' || !Number.isFinite(r[key]) || r[key] < 1 || r[key] > 20)) {
            errors.push(`ratings.${cid}.${key} must be a number between 1 and 20.`);
          }
        }
      }
    }
  }

  // 4. states.json (optional)
  if (bundle.states !== null && bundle.states !== undefined) {
    const st = bundle.states;
    if (!isPlainObject(st)) {
      errors.push('states.json must be a JSON object ({ patch: { [ABBR]: { lean?, ev?, name?, region? } } }).');
    } else if (st.patch !== undefined) {
      if (!isPlainObject(st.patch)) {
        errors.push('states.patch must be an object keyed by 2-letter state abbreviation.');
      } else {
        for (const [abbr, patch] of Object.entries(st.patch)) {
          if (!VALID_STATE_ABBRS.has(abbr)) {
            errors.push(`states.patch has unknown state abbreviation "${abbr}".`);
            continue;
          }
          if (!isPlainObject(patch)) {
            errors.push(`states.patch.${abbr} must be an object.`);
            continue;
          }
          if (patch.lean !== undefined && (typeof patch.lean !== 'number' || !Number.isFinite(patch.lean) || Math.abs(patch.lean) > 100)) {
            errors.push(`states.patch.${abbr}.lean must be a number between -100 and 100.`);
          }
          if (patch.ev !== undefined && (!Number.isInteger(patch.ev) || patch.ev < 1 || patch.ev > 200)) {
            errors.push(`states.patch.${abbr}.ev must be an integer between 1 and 200.`);
          }
          if (patch.region !== undefined && !VALID_REGIONS.has(patch.region)) {
            errors.push(`states.patch.${abbr}.region must be northeast, south, midwest, or west.`);
          }
        }
      }
    }
  }

  // 5. scenarios.json (optional)
  if (bundle.scenarios !== null && bundle.scenarios !== undefined) {
    const sc = bundle.scenarios;
    if (!isPlainObject(sc)) {
      errors.push('scenarios.json must be a JSON object ({ add?: [...] }).');
    } else if (sc.add !== undefined) {
      if (!Array.isArray(sc.add)) {
        errors.push('scenarios.add must be an array.');
      } else {
        sc.add.forEach((entry, idx) => {
          const prefix = `scenarios.add[${idx}]`;
          if (!isPlainObject(entry)) {
            errors.push(`${prefix} must be an object.`);
            return;
          }
          if (typeof entry.id !== 'string' || !VALID_MOD_ID.test(entry.id)) {
            errors.push(`${prefix}.id must be a valid slug.`);
          }
          if (typeof entry.label !== 'string' || !entry.label.trim()) {
            errors.push(`${prefix}.label is required.`);
          }
          if (entry.nationalGeneric !== undefined && (typeof entry.nationalGeneric !== 'number' || !Number.isFinite(entry.nationalGeneric))) {
            errors.push(`${prefix}.nationalGeneric must be a finite number.`);
          }
        });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
