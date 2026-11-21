import { useEffect, useRef, useState } from 'react';
import { createForecastController } from './forecastController.mjs';
import { electionForecast } from './electionForecast.js';

function campaignKeyOf(game) {
  if (!game) return 'none';
  return [
    game.build34CampaignId || game.seed || 'default',
    game.party || '',
    game.opponentParty || '',
    game.build40?.modeId || game.build39?.scenario?.id || '',
  ].join(':');
}

// R11 + R20: Nick Bronze updates only at the start of each week (and retains
// the final weekly snapshot on Election Night). Routine midweek actions do not
// clear or restart the forecast, eliminating header height collapse/jump.
export function useElectionForecast(game, options = undefined) {
  const campaignKey = campaignKeyOf(game);
  const week = game?.week ?? 1;
  const savedSnapshot = game?.nickBronzeSnapshot;
  const savedMatchesWeek = Boolean(savedSnapshot && savedSnapshot.week === week && savedSnapshot.forecast);

  const [entry, setEntry] = useState(() => (
    savedMatchesWeek
      ? { campaignKey, week, forecast: savedSnapshot.forecast, status: 'ready', forecastWeek: week }
      : null
  ));
  const latestGameRef = useRef(game);
  latestGameRef.current = game;

  useEffect(() => {
    if (!game) {
      setEntry(null);
      return undefined;
    }

    // If a persisted weekly snapshot already exists for this week, adopt it immediately.
    if (game.nickBronzeSnapshot?.week === week && game.nickBronzeSnapshot.forecast) {
      setEntry({
        campaignKey,
        week,
        forecast: game.nickBronzeSnapshot.forecast,
        status: 'ready',
        forecastWeek: week,
      });
      return undefined;
    }

    // Avoid re-running if we already computed the snapshot for this campaign + week.
    if (entry?.campaignKey === campaignKey && entry?.week === week && entry?.forecast) {
      return undefined;
    }

    let cancelled = false;
    const targetGame = latestGameRef.current;
    const finish = (forecast, status) => {
      if (cancelled) return;
      setEntry({
        campaignKey,
        week,
        forecast,
        status,
        forecastWeek: week,
      });
    };

    let fallback = null;
    const controller = createForecastController({
      createWorker: () => new Worker(new URL('./forecast.worker.js', import.meta.url)),
      onResult: ({ result }) => finish(result, 'ready'),
      onError: () => {
        fallback = setTimeout(() => {
          try {
            finish(electionForecast(targetGame, options), 'ready');
          } catch {
            finish(null, 'unavailable');
          }
        }, 0);
      },
    });
    const start = setTimeout(() => controller.request(targetGame, options), 20);
    return () => {
      cancelled = true;
      clearTimeout(start);
      clearTimeout(fallback);
      controller.dispose();
    };
    // Intentionally keyed ONLY on campaignKey + week (NOT mutable `game` identity)
    // so midweek actions do not re-trigger or collapse the Nick Bronze panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignKey, week, savedMatchesWeek]);

  if (savedMatchesWeek) {
    return {
      forecast: savedSnapshot.forecast,
      status: 'ready',
      forecastWeek: week,
      updating: false,
    };
  }

  // Same campaign, current week ready:
  if (entry?.campaignKey === campaignKey && entry?.week === week) {
    return {
      forecast: entry.forecast,
      status: entry.status,
      forecastWeek: entry.forecastWeek,
      updating: false,
    };
  }

  // Same campaign transitioning to a new week: keep previous week's snapshot visible
  // with truthful "updating" status so the panel height never collapses (R20).
  if (entry?.campaignKey === campaignKey && entry?.forecast) {
    return {
      forecast: entry.forecast,
      status: 'updating',
      forecastWeek: entry.forecastWeek,
      updating: true,
    };
  }

  return { forecast: null, status: 'loading', forecastWeek: null, updating: false };
}
