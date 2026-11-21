const scrollableElements = (root) => {
  // Prefer explicitly tagged scroll containers when present to avoid scanning
  // the entire DOM on every click; fall back to full scan for compatibility.
  const explicit = root.querySelectorAll('[data-scroll-container]');
  const candidates = explicit.length ? [...explicit] : [...root.querySelectorAll('*')];
  return candidates.filter((element) => {
    const style = getComputedStyle(element);
    const vertical = /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
    const horizontal = /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth;
    return vertical || horizontal;
  });
};

/** Capture viewport, scroll containers, focus, and visible element dimensions before an action commit. */
export function captureActionLayout(root = document) {
  if (typeof window === 'undefined' || !root?.querySelectorAll) return null;
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const containers = scrollableElements(root).map((element) => ({
    element,
    top: element.scrollTop,
    left: element.scrollLeft,
    height: element.getBoundingClientRect().height,
    width: element.getBoundingClientRect().width,
  }));
  return {
    x: window.scrollX,
    y: window.scrollY,
    activeElement,
    containers,
  };
}

/** Restore after the action's React commit without focusing a disabled/detached control. */
export function restoreActionLayout(snapshot) {
  if (!snapshot || typeof window === 'undefined') return false;
  window.scrollTo({ left: snapshot.x, top: snapshot.y, behavior: 'instant' });
  snapshot.containers.forEach(({ element, top, left }) => {
    if (element.isConnected) {
      element.scrollTop = top;
      element.scrollLeft = left;
    }
  });
  const el = snapshot.activeElement;
  const isDisabled = Boolean(el?.disabled || el?.getAttribute?.('aria-disabled') === 'true');
  if (el?.isConnected && !isDisabled) {
    el.focus({ preventScroll: true });
  }
  return true;
}

export function measureActionLayout(root = document) {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll('[data-action-layout]')).map((element) => ({
    id: element.id || element.getAttribute('data-action-layout'),
    height: element.getBoundingClientRect().height,
    top: element.getBoundingClientRect().top,
  }));
}
