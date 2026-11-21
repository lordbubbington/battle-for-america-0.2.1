import { CANDIDATE_EVENTS as batch01 } from './batch-01.js';
import { CANDIDATE_EVENTS as batch02 } from './batch-02.js';
import { CANDIDATE_EVENTS as batch03 } from './batch-03.js';
import { CANDIDATE_EVENTS as batch04 } from './batch-04.js';
import { CANDIDATE_EVENTS as batch05 } from './batch-05.js';
import { CANDIDATE_EVENTS as batch06 } from './batch-06.js';
import { CANDIDATE_EVENTS as batch07 } from './batch-07.js';

export const CANDIDATE_EVENTS = [...batch01, ...batch02, ...batch03, ...batch04, ...batch05, ...batch06, ...batch07];
export const CANDIDATE_EVENTS_BY_ID = Object.fromEntries(CANDIDATE_EVENTS.map((event) => [event.id, event]));
