import test from 'node:test';
import assert from 'node:assert/strict';
import { captureActionLayout, restoreActionLayout, measureActionLayout } from '../../../src/lib/build39ActionLayout.js';

test('layout snapshots preserve viewport and nested scroll positions and restore focus without scrolling', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalHTMLElement = globalThis.HTMLElement;
  const originalGetComputedStyle = globalThis.getComputedStyle;
  globalThis.HTMLElement = class {};
  globalThis.getComputedStyle = () => ({ overflowY: 'auto', overflowX: 'hidden' });
  const focused = Object.assign(new HTMLElement(), { isConnected: true, focus: ({ preventScroll }) => assert.equal(preventScroll, true) });
  const scrollable = { scrollTop: 48, scrollLeft: 0, scrollHeight: 400, clientHeight: 150, scrollWidth: 100, clientWidth: 100,
    isConnected: true, getBoundingClientRect: () => ({ height: 150, width: 300 }) };
  const root = { querySelectorAll: () => [scrollable] };
  globalThis.document = { activeElement: focused };
  let x = 11; let y = 220;
  globalThis.window = { get scrollX(){ return x; }, get scrollY(){ return y; }, scrollTo: ({left,top}) => { x=left; y=top; } };
  try {
    const snapshot = captureActionLayout(root);
    scrollable.scrollTop = 2; x = 0; y = 0;
    assert.equal(restoreActionLayout(snapshot), true);
    assert.equal(x, 11); assert.equal(y, 220); assert.equal(scrollable.scrollTop, 48);
    assert.deepEqual(measureActionLayout({ querySelectorAll: () => [] }), []);
  } finally {
    globalThis.window = originalWindow; globalThis.document = originalDocument;
    globalThis.HTMLElement = originalHTMLElement; globalThis.getComputedStyle = originalGetComputedStyle;
  }
});

