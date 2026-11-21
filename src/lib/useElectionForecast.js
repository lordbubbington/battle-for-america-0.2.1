import { useEffect, useState } from 'react';
import { createForecastController } from './forecastController.mjs';
import { electionForecast } from './electionForecast.js';

export function useElectionForecast(game, options = undefined) {
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    const finish = (forecast, status) => setEntry({ game, options, forecast, status });
    let fallback = null;
    const controller = createForecastController({
      createWorker: () => new Worker(new URL('./forecast.worker.js', import.meta.url)),
      onResult: ({ result }) => finish(result, 'ready'),
      onError: () => {
        fallback = setTimeout(() => {
          try {
            finish(electionForecast(game, options), 'ready');
          } catch {
            finish(null, 'unavailable');
          }
        }, 0);
      },
    });
    const start = setTimeout(() => controller.request(game, options), 60);
    return () => {
      clearTimeout(start);
      clearTimeout(fallback);
      controller.dispose();
    };
  }, [game, options]);

  return entry?.game === game && entry.options === options ? entry : { forecast: null, status: 'loading' };
}
