// Place this module in the integration source tree alongside a Vite-resolved
// @/ alias. A new worker is created for each request so termination interrupts
// the synchronous forecast instead of waiting for it to return.
import { electionForecast } from '@/lib/electionForecast';

self.onmessage = (event) => {
  const request = event.data;
  if (request?.type !== 'forecast' || !Number.isInteger(request.requestId)) return;
  try {
    const result = electionForecast(request.game, request.options || {});
    self.postMessage({ type: 'forecast-result', requestId: request.requestId, result });
  } catch (error) {
    self.postMessage({ type: 'forecast-error', requestId: request.requestId, message: error instanceof Error ? error.message : 'Forecast failed' });
  }
};
