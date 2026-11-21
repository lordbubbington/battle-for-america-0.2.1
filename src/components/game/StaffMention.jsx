import React from 'react';
import { TRADITIONAL_STAFF_BY_ID, TRADITIONAL_STAFF_ROSTER } from '@/data/traditionalStaffRoster';
import { NONTRADITIONAL_STAFF_BY_ID, NONTRADITIONAL_STAFF_ROSTER } from '@/data/nonTraditionalStaffRoster';
import StaffPortrait from '@/components/game/StaffPortrait';

const byAlias = new Map([
  ...TRADITIONAL_STAFF_ROSTER.map((role) => /** @type {[string, string]} */ ([role.title.toLowerCase(), role.id])),
  ...NONTRADITIONAL_STAFF_ROSTER.map((staff) => /** @type {[string, string]} */ ([staff.name.toLowerCase(), staff.id])),
  ['communications director', 'communications'],
  ['campaign manager', 'operations'],
  ['pollster', 'pollster'],
  ['press secretary', 'media'],
  ['media director', 'media'],
  ['opposition research director', 'muckraker'],
  ['compliance director', 'legal'],
]);
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const names = [...byAlias.keys()].sort((left, right) => right.length - left.length).map(escapeRegExp);
const mention = new RegExp('(^|[^\\p{L}\\p{N}])(' + names.join('|') + ')(?=$|[^\\p{L}\\p{N}])', 'giu');

function activePortrait(game, staffId) {
  const staff = game?.staffing;
  if (staff?.traditionalActiveIds?.includes(staffId)) return staff.traditionalPortraitByRole?.[staffId];
  return staff?.nonTraditionalActiveIds?.includes(staffId) ? staffId : null;
}

export default function StaffMention({ game, text, staffIds = [] }) {
  const visible = new Set(staffIds.filter((id) => activePortrait(game, id)));
  const presented = typeof text === 'string' ? text.replace(mention, (match, prefix, title) => {
    const staffId = byAlias.get(title.toLowerCase());
    if (activePortrait(game, staffId)) {
      visible.add(staffId);
      return match;
    }
    const neutral = NONTRADITIONAL_STAFF_BY_ID[staffId] ? 'campaign specialist' : 'campaign team';
    return prefix + (/^[A-Z]/.test(title) ? neutral[0].toUpperCase() + neutral.slice(1) : neutral);
  }) : text;
  return (
    <>
      {[...visible].map((staffId) => <span className="mr-1 inline-block align-middle" key={staffId}>
        <StaffPortrait portraitId={activePortrait(game, staffId)}
          alt={TRADITIONAL_STAFF_BY_ID[staffId]?.title || NONTRADITIONAL_STAFF_BY_ID[staffId]?.name} size="compact" />
      </span>)}
      {presented}
    </>
  );
}
