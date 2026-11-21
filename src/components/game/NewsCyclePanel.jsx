import React from 'react';
import { mediaEnvironment } from '@/data/media';
import { STATE_BY_ABBR } from '@/data/states';
import { storiesIn, topStories, spinCost, spinsUsed } from '@/lib/news';
import WorldNewsList from '@/components/game/WorldNewsList';
import { Newspaper, Volume2, VolumeX, ArrowUpRight, ArrowDownRight, Radio } from 'lucide-react';

const TONE_COLOR = { good: '#6EE7B7', bad: '#FCA5A5' };

function StoryRow({ story, game, abbr, onSpin, compact = false }) {
  const color = TONE_COLOR[story.tone] || '#9DB8FF';
  const amplify = spinCost(game, story.abbr, 'amplify');
  const bury = spinCost(game, story.abbr, 'bury');
  const canSpin = !!abbr && !!onSpin;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-2 py-1.5">
      <div className="flex items-start gap-1.5">
        <span className="mt-[2px] shrink-0" style={{ color }}>
          {story.tone === 'good' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[12px] leading-tight text-white">{story.headline}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="chip shrink-0">{story.topic}</span>
            {!abbr && <span className="chip shrink-0">{STATE_BY_ABBR[story.abbr]?.name || story.abbr}</span>}
            {story.from && <span className="chip shrink-0">imported</span>}
            {story.mutated > 0 && (
              <span className="chip shrink-0" style={{ color: '#FCD34D', borderColor: 'rgba(252,211,77,0.5)' }}>
                the story turned
              </span>
            )}
            <span className="chip shrink-0">week {story.week + 1}</span>
          </div>
        </div>
        <span className="num shrink-0 text-[11px] font-extrabold" style={{ color }}>
          {story.salience}
        </span>
      </div>

      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${story.salience}%`, backgroundColor: color }} />
      </div>

      {canSpin && !compact && (
        <div className="mt-1.5 flex gap-1.5">
          <button
            type="button"
            disabled={amplify > game.funds}
            id={'story-' + story.id + '-amplify'}
            onClick={() => onSpin(story.abbr, story.id, 'amplify')}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 py-1 text-[10px] font-extrabold text-slate-200 hover:bg-white/10 disabled:opacity-40"
          >
            <Volume2 className="h-3 w-3" /> Feed it · ${amplify}M
          </button>
          <button
            type="button"
            disabled={bury > game.funds}
            id={'story-' + story.id + '-bury'}
            onClick={() => onSpin(story.abbr, story.id, 'bury')}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/5 py-1 text-[10px] font-extrabold text-slate-200 hover:bg-white/10 disabled:opacity-40"
          >
            <VolumeX className="h-3 w-3" /> Bury it · ${bury}M
          </button>
        </div>
      )}
    </div>
  );
}

// What the state is arguing about, and your two cheap ways into that argument.
export default function NewsCyclePanel({ game, abbr, accent, onSpin }) {
  const env = abbr ? mediaEnvironment(abbr) : null;
  const stories = abbr ? storiesIn(game, abbr) : topStories(game, 4);
  const spun = abbr ? spinsUsed(game, abbr) : 0;
  const stateName = abbr ? STATE_BY_ABBR[abbr]?.name : null;

  return (
    <div className="panel p-3" data-testid="news-cycle">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 label-xs">
          <Newspaper className="h-3 w-3" /> The local news cycle
        </p>
        <span className="chip" style={{ color: accent, borderColor: `${accent}66` }}>
          {abbr ? stateName : 'National'}
        </span>
      </div>

      {env ? (
        <div className="mt-2 rounded-xl border border-dashed border-white/20 px-2 py-1.5">
          <p className="font-heading text-[12.5px] leading-tight text-white">{env.label}</p>
          <p className="mt-0.5 text-[10px] font-semibold leading-snug text-slate-400">{env.note}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="chip">
              <Radio className="h-2.5 w-2.5" /> {env.outlets} outlet{env.outlets > 1 ? 's' : ''}
            </span>
            <span className="chip">{env.attention >= 1.1 ? 'stories linger' : 'stories burn out fast'}</span>
            <span className="chip">{env.spread >= 0.5 ? 'travels well' : 'stays local'}</span>
            {spun > 0 && <span className="chip chip-gold">{spun} press call{spun > 1 ? 's' : ''} this week</span>}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] font-semibold leading-snug text-slate-400">
          Pick a state on the map to hear what it is arguing about — and to work the local press.
        </p>
      )}

      <div className="mt-2 space-y-1.5">
        {stories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 px-2 py-2 text-[11px] font-semibold text-slate-500">
            {abbr ? `Quiet week in ${stateName}. Nothing is running — which means anything you do here leads.` : 'Nothing running anywhere yet.'}
          </p>
        ) : (
          stories.map((s) => (
            <StoryRow key={s.id} story={s} game={game} abbr={abbr} onSpin={onSpin} />
          ))
        )}
      </div>

      <WorldNewsList game={game} abbr={abbr} />

      {game.lastSpin && game.lastSpin.abbr === abbr && (
        <p
          className="mt-2 rounded-lg border px-2 py-1 text-[10.5px] font-extrabold leading-snug"
          style={{
            borderColor: game.lastSpin.backfire ? 'rgba(251,113,133,0.5)' : 'rgba(110,231,183,0.4)',
            backgroundColor: game.lastSpin.backfire ? 'rgba(251,113,133,0.12)' : 'rgba(110,231,183,0.1)',
            color: game.lastSpin.backfire ? '#FDA4AF' : '#6EE7B7',
          }}
        >
          {game.lastSpin.note} (${game.lastSpin.cost}M)
        </p>
      )}

      {abbr && (
        <p className="mt-2 text-[10px] font-semibold leading-snug text-slate-500">
          Press calls cost money only, never an action — but every call you make in a state this week makes the next
          one dearer, and the press corps notices when you try too hard.
        </p>
      )}
    </div>
  );
}
