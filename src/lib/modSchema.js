// Phase 1 + 2 Modding Schema Validator — validates declarative JSON mod packs
// (manifest, candidates, ratings, states, scenarios, events, news, debates,
// runningMates, issues) before they enter the runtime content registry.

const VALID_MOD_ID = /^[a-z0-9][a-z0-9-_]{1,63}$/;
const VALID_PARTIES = new Set(['dem', 'rep', 'lib', 'grn']);
const VALID_MAJOR_PARTIES = new Set(['dem', 'rep']);
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
  const summary = {
    candidates: 0,
    ratings: 0,
    states: 0,
    scenarios: 0,
    events: 0,
    nationalNews: 0,
    worldNews: 0,
    debates: 0,
    runningMates: 0,
    issues: 0,
  };

  if (!isPlainObject(bundle)) {
    return { valid: false, errors: ['Mod bundle must be an object.'], warnings, summary };
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
          summary.candidates += c.add.length;
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
          summary.candidates += Object.keys(c.patch).length;
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
      summary.ratings += Object.keys(bundle.ratings).length;
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
        summary.states += Object.keys(st.patch).length;
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
        summary.scenarios += sc.add.length;
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

  // 6. events.json (Phase 2, optional)
  if (bundle.events !== null && bundle.events !== undefined) {
    const ev = bundle.events;
    if (!isPlainObject(ev)) {
      errors.push('events.json must be a JSON object ({ add?, patch?, remove? }).');
    } else {
      if (ev.add !== undefined) {
        if (!Array.isArray(ev.add)) {
          errors.push('events.add must be an array.');
        } else {
          summary.events += ev.add.length;
          ev.add.forEach((item, idx) => {
            const prefix = `events.add[${idx}]`;
            if (!isPlainObject(item)) {
              errors.push(`${prefix} must be an object.`);
              return;
            }
            if (typeof item.id !== 'string' || !VALID_MOD_ID.test(item.id)) {
              errors.push(`${prefix}.id must be a valid slug.`);
            }
            if (typeof item.title !== 'string' || !item.title.trim()) {
              errors.push(`${prefix}.title is required.`);
            }
            if (typeof item.text !== 'string' && typeof item.body !== 'string') {
              errors.push(`${prefix}.text (or body) must be a string.`);
            }
            if (!Array.isArray(item.choices) || item.choices.length === 0) {
              errors.push(`${prefix}.choices must be a non-empty array.`);
            } else {
              item.choices.forEach((ch, ci) => {
                if (!isPlainObject(ch) || typeof ch.label !== 'string' || !ch.label.trim()) {
                  errors.push(`${prefix}.choices[${ci}].label is required.`);
                }
              });
            }
          });
        }
      }
      if (ev.patch !== undefined) {
        if (!isPlainObject(ev.patch)) {
          errors.push('events.patch must be an object keyed by event ID.');
        } else {
          summary.events += Object.keys(ev.patch).length;
        }
      }
      if (ev.remove !== undefined && (!Array.isArray(ev.remove) || ev.remove.some((id) => typeof id !== 'string'))) {
        errors.push('events.remove must be an array of event ID strings.');
      }
    }
  }

  // 7. news.json (Phase 2, optional: national + world)
  if (bundle.news !== null && bundle.news !== undefined) {
    const nw = bundle.news;
    if (!isPlainObject(nw)) {
      errors.push('news.json must be a JSON object ({ national?, world? }).');
    } else {
      if (nw.national !== undefined) {
        if (!isPlainObject(nw.national)) {
          errors.push('news.national must be an object ({ add?, patch?, remove? }).');
        } else {
          if (nw.national.add !== undefined) {
            if (!Array.isArray(nw.national.add)) {
              errors.push('news.national.add must be an array.');
            } else {
              summary.nationalNews += nw.national.add.length;
              nw.national.add.forEach((card, idx) => {
                const prefix = `news.national.add[${idx}]`;
                if (!isPlainObject(card)) {
                  errors.push(`${prefix} must be an object.`);
                  return;
                }
                if (typeof card.id !== 'string' || !VALID_MOD_ID.test(card.id)) errors.push(`${prefix}.id must be a valid slug.`);
                if (typeof card.headline !== 'string' || !card.headline.trim()) errors.push(`${prefix}.headline is required.`);
                if (card.nat !== undefined && (typeof card.nat !== 'number' || !Number.isFinite(card.nat) || Math.abs(card.nat) > 10)) {
                  errors.push(`${prefix}.nat must be a number between -10 and 10.`);
                }
              });
            }
          }
          if (nw.national.patch !== undefined && !isPlainObject(nw.national.patch)) {
            errors.push('news.national.patch must be an object.');
          } else if (nw.national.patch) {
            summary.nationalNews += Object.keys(nw.national.patch).length;
          }
          if (nw.national.remove !== undefined && (!Array.isArray(nw.national.remove) || nw.national.remove.some((id) => typeof id !== 'string'))) {
            errors.push('news.national.remove must be an array of card ID strings.');
          }
        }
      }
      if (nw.world !== undefined) {
        if (!isPlainObject(nw.world)) {
          errors.push('news.world must be an object ({ add?, patch?, remove? }).');
        } else {
          if (nw.world.add !== undefined) {
            if (!Array.isArray(nw.world.add)) {
              errors.push('news.world.add must be an array.');
            } else {
              summary.worldNews += nw.world.add.length;
              nw.world.add.forEach((story, idx) => {
                const prefix = `news.world.add[${idx}]`;
                if (!isPlainObject(story)) {
                  errors.push(`${prefix} must be an object.`);
                  return;
                }
                if (typeof story.id !== 'string' || !VALID_MOD_ID.test(story.id)) errors.push(`${prefix}.id must be a valid slug.`);
                if (typeof story.headline !== 'string' || !story.headline.trim()) errors.push(`${prefix}.headline is required.`);
                if (typeof story.issue !== 'string' || !story.issue.trim()) errors.push(`${prefix}.issue is required.`);
                if (story.lean !== undefined && ![0, 1, 2].includes(story.lean)) errors.push(`${prefix}.lean must be 0, 1, or 2.`);
                if (story.mag !== undefined && (typeof story.mag !== 'number' || !Number.isFinite(story.mag) || story.mag <= 0 || story.mag > 3)) {
                  errors.push(`${prefix}.mag must be a number between 0.1 and 3.0.`);
                }
              });
            }
          }
          if (nw.world.patch !== undefined && !isPlainObject(nw.world.patch)) {
            errors.push('news.world.patch must be an object.');
          } else if (nw.world.patch) {
            summary.worldNews += Object.keys(nw.world.patch).length;
          }
          if (nw.world.remove !== undefined && (!Array.isArray(nw.world.remove) || nw.world.remove.some((id) => typeof id !== 'string'))) {
            errors.push('news.world.remove must be an array of story ID strings.');
          }
        }
      }
    }
  }

  // 8. debates.json (Phase 2, optional)
  if (bundle.debates !== null && bundle.debates !== undefined) {
    const db = bundle.debates;
    if (!isPlainObject(db)) {
      errors.push('debates.json must be a JSON object ({ add?, patch?, remove? }).');
    } else {
      if (db.add !== undefined) {
        if (!Array.isArray(db.add)) {
          errors.push('debates.add must be an array.');
        } else {
          summary.debates += db.add.length;
          db.add.forEach((d, idx) => {
            const prefix = `debates.add[${idx}]`;
            if (!isPlainObject(d)) {
              errors.push(`${prefix} must be an object.`);
              return;
            }
            if (typeof d.id !== 'string' || !VALID_MOD_ID.test(d.id)) errors.push(`${prefix}.id must be a valid slug.`);
            if (!Number.isInteger(d.week) || d.week < 0 || d.week > 13) errors.push(`${prefix}.week must be an integer between 0 and 13.`);
            if (typeof d.title !== 'string' || !d.title.trim()) errors.push(`${prefix}.title is required.`);
            if (!Array.isArray(d.questions) || d.questions.length === 0) {
              errors.push(`${prefix}.questions must be a non-empty array.`);
            } else {
              d.questions.forEach((q, qi) => {
                if (!isPlainObject(q) || typeof q.q !== 'string' || !Array.isArray(q.answers) || q.answers.length === 0) {
                  errors.push(`${prefix}.questions[${qi}] requires "q" string and non-empty "answers" array.`);
                }
              });
            }
          });
        }
      }
      if (db.patch !== undefined) {
        if (!isPlainObject(db.patch)) errors.push('debates.patch must be an object keyed by debate ID.');
        else summary.debates += Object.keys(db.patch).length;
      }
      if (db.remove !== undefined && (!Array.isArray(db.remove) || db.remove.some((id) => typeof id !== 'string'))) {
        errors.push('debates.remove must be an array of debate ID strings.');
      }
    }
  }

  // 9. runningMates.json (Phase 2, optional)
  if (bundle.runningMates !== null && bundle.runningMates !== undefined) {
    const rm = bundle.runningMates;
    if (!isPlainObject(rm)) {
      errors.push('runningMates.json must be a JSON object ({ add?, patch?, remove? }).');
    } else {
      if (rm.add !== undefined) {
        if (!Array.isArray(rm.add)) {
          errors.push('runningMates.add must be an array.');
        } else {
          summary.runningMates += rm.add.length;
          rm.add.forEach((mate, idx) => {
            const prefix = `runningMates.add[${idx}]`;
            if (!isPlainObject(mate)) {
              errors.push(`${prefix} must be an object.`);
              return;
            }
            if (typeof mate.id !== 'string' || !VALID_MOD_ID.test(mate.id)) errors.push(`${prefix}.id must be a valid slug.`);
            if (typeof mate.name !== 'string' || !mate.name.trim()) errors.push(`${prefix}.name is required.`);
            if (!VALID_MAJOR_PARTIES.has(mate.party)) errors.push(`${prefix}.party must be "dem" or "rep".`);
            if (mate.stateAbbr !== undefined && !VALID_STATE_ABBRS.has(mate.stateAbbr)) {
              errors.push(`${prefix}.stateAbbr "${mate.stateAbbr}" is not a valid state abbreviation.`);
            }
            if (mate.nat !== undefined && (typeof mate.nat !== 'number' || !Number.isFinite(mate.nat) || Math.abs(mate.nat) > 15)) {
              errors.push(`${prefix}.nat must be a number between -15 and 15.`);
            }
          });
        }
      }
      if (rm.patch !== undefined) {
        if (!isPlainObject(rm.patch)) errors.push('runningMates.patch must be an object keyed by mate ID.');
        else summary.runningMates += Object.keys(rm.patch).length;
      }
      if (rm.remove !== undefined && (!Array.isArray(rm.remove) || rm.remove.some((id) => typeof id !== 'string'))) {
        errors.push('runningMates.remove must be an array of running mate ID strings.');
      }
    }
  }

  // 10. issues.json (Phase 2, optional)
  if (bundle.issues !== null && bundle.issues !== undefined) {
    const iss = bundle.issues;
    if (!isPlainObject(iss)) {
      errors.push('issues.json must be a JSON object ({ add?, patch?, remove? }).');
    } else {
      if (iss.add !== undefined) {
        if (!Array.isArray(iss.add)) {
          errors.push('issues.add must be an array.');
        } else {
          summary.issues += iss.add.length;
          iss.add.forEach((item, idx) => {
            const prefix = `issues.add[${idx}]`;
            if (!isPlainObject(item)) {
              errors.push(`${prefix} must be an object.`);
              return;
            }
            if (typeof item.id !== 'string' || !VALID_MOD_ID.test(item.id)) errors.push(`${prefix}.id must be a valid slug.`);
            if (typeof item.label !== 'string' || !item.label.trim()) errors.push(`${prefix}.label is required.`);
            if (item.weight !== undefined && (typeof item.weight !== 'number' || !Number.isFinite(item.weight) || item.weight <= 0 || item.weight > 20)) {
              errors.push(`${prefix}.weight must be a number between 0.1 and 20.`);
            }
            if (!Array.isArray(item.options) || item.options.length !== 3 || item.options.some((o) => typeof o !== 'string' || !o.trim())) {
              errors.push(`${prefix}.options must be an array of exactly 3 non-empty strings.`);
            }
          });
        }
      }
      if (iss.patch !== undefined) {
        if (!isPlainObject(iss.patch)) errors.push('issues.patch must be an object keyed by issue ID.');
        else summary.issues += Object.keys(iss.patch).length;
      }
      if (iss.remove !== undefined && (!Array.isArray(iss.remove) || iss.remove.some((id) => typeof id !== 'string'))) {
        errors.push('issues.remove must be an array of issue ID strings.');
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings, summary };
}
