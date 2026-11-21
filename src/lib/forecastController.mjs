/**
 * Keep one forecast request in a dedicated worker. The caller owns worker
 * creation so Vite can bundle the worker from the eventual integration root.
 * Every request sends the entire current game and options: no partial cache key
 * can accidentally reuse a forecast after a state or rule change.
 */
/** @param {{ createWorker?: () => Worker, onResult?: (message: any) => void, onError?: (message: any) => void, onStatus?: (message: any) => void }} [configuration] */
export function createForecastController({ createWorker, onResult, onError, onStatus } = {}) {
  if (typeof createWorker !== 'function') throw new TypeError('createWorker must be a function');
  let active = null;
  let nextId = 0;
  let disposed = false;
  const emitStatus = (status, requestId) => onStatus?.({ status, requestId });

  function stop(status = 'cancelled') {
    if (!active) return false;
    const previous = active;
    active = null;
    previous.worker.onmessage = null;
    previous.worker.onerror = null;
    previous.worker.onmessageerror = null;
    previous.worker.terminate();
    emitStatus(status, previous.id);
    return true;
  }

  function request(game, options = {}) {
    if (disposed) throw new Error('Forecast controller has been disposed');
    stop('superseded');
    const id = ++nextId;
    let worker;
    try {
      worker = createWorker();
      if (!worker || typeof worker.postMessage !== 'function' || typeof worker.terminate !== 'function') {
        throw new TypeError('createWorker must return a Worker-compatible object');
      }
    } catch (error) {
      onError?.({ requestId: id, error });
      emitStatus('error', id);
      return id;
    }
    active = { id, worker };

    const fail = (error) => {
      if (!active || active.id !== id) return;
      stop('error');
      if (!disposed && nextId === id) onError?.({ requestId: id, error });
    };
    worker.onmessage = (event) => {
      if (!active || active.id !== id || event?.data?.requestId !== id) return;
      if (event.data.type === 'forecast-error') {
        fail(new Error(event.data.message || 'Forecast failed'));
      } else if (event.data.type === 'forecast-result') {
        const result = event.data.result;
        stop('complete');
        if (!disposed && nextId === id) onResult?.({ requestId: id, result });
      }
    };
    worker.onerror = (event) => fail(new Error(event?.message || 'Forecast worker failed'));
    worker.onmessageerror = () => fail(new Error('Forecast worker returned an unreadable message'));
    emitStatus('running', id);
    if (!active || active.id !== id) return id;
    try {
      worker.postMessage({ type: 'forecast', requestId: id, game, options });
    } catch (error) {
      fail(error);
    }
    return id;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop('cancelled');
  }

  return { request, cancel: () => stop('cancelled'), dispose };
}
