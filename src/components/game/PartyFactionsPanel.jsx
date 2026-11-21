import React from 'react';
import { factionStandings, factionsFor } from '@/lib/factions';
import FactionList from '@/components/game/FactionList';

// Whether the party standing behind you is still willing to hold you.
export default function PartyFactionsPanel({ game, accent }) {
  const standings = factionStandings(game);
  const factions = factionsFor(game.party).map((f) => ({ ...f, standing: standings[f.id] ?? 50 }));

  return (
    <div className="panel p-3" data-testid="party-factions">
      <div className="flex items-center justify-between gap-2">
        <p className="label-xs">Party factions</p>
        <span className="text-[9.5px] font-extrabold uppercase tracking-wide text-slate-500">Your own party</span>
      </div>
      <FactionList game={game} factions={factions} shift={game.lastShift || null} accent={accent} />
    </div>
  );
}