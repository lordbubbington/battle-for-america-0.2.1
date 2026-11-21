import React from 'react';
import { worldNewsIn, storyEffect } from '@/lib/worldNews';
import { ISSUE_BY_ID, stanceLabel } from '@/data/platform';
import { Globe } from 'lucide-react';

// What the world did to this state this week — not the campaign's doing, and
// not the opponent's either.
export default function WorldNewsList({ game, abbr }) {
  const stories = worldNewsIn(game, abbr);
  if (!stories.length) return null;

  return (
    <div className="mt-2 rounded-xl border border-dashed border-white/20 px-2 py-1.5">
      <p className="label-xs flex items-center gap-1">
        <Globe className="h-2.5 w-2.5" /> The world this week
      </p>
      <div className="mt-1 space-y-1">
        {stories.map((story) => {
          const issue = ISSUE_BY_ID[story.issue];
          const eff = storyEffect(game, abbr, story);
          const helps = eff.shift > 0.02;
          const hurts = eff.shift < -0.02;
          const color = helps ? '#6EE7B7' : hurts ? '#FCA5A5' : '#9DB8FF';
          return (
            <div key={story.id} className="flex items-start gap-1.5">
              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              <div className="min-w-0">
                <p className="font-heading text-[11.5px] leading-tight text-white">{story.headline}</p>
                <p className="text-[10px] font-bold leading-snug" style={{ color }}>
                  {issue ? issue.label : 'the news'} · “{issue ? stanceLabel(issue, story.lean) : ''}”
                  gaining · {helps ? 'helps you' : hurts ? 'hurts you' : 'a wash'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
