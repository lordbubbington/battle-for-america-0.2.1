import React from 'react';

// Campaign actions do not write lines into a panel: each one drops from the
// bottom of the map as a single line, falls, and is gone before the next one
// normally lands. Click fast and two or three share the fall.
export default function FallingMessages({ messages, anchor }) {
  if (!anchor || !messages.length) return null;

  return (
    <div
      className="pointer-events-none fixed z-40 flex flex-col items-center gap-1"
      style={{ top: anchor.bottom + 4, left: anchor.left, width: anchor.width }}
    >
      {messages.map((m) => (
        <p
          key={m.id}
          className="animate-fall max-w-[92%] rounded-full border border-white/15 bg-black/75 px-3 py-1 text-center font-heading text-[11.5px] leading-snug text-white shadow-lg"
        >
          {m.text}
        </p>
      ))}
    </div>
  );
}