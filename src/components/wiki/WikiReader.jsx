import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Pencil, Check, X } from 'lucide-react';

const MD = {
  p: ({ children }) => <p className="mb-2 text-[12.5px] leading-relaxed text-slate-300">{children}</p>,
  strong: ({ children }) => <strong className="font-extrabold text-white">{children}</strong>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 text-[12.5px] text-slate-300">{children}</ul>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
};

// One encyclopedia page, with an editor bolted on. Edits are saved to the app's
// own records, so whatever the wiki says next time is whatever was written here.
export default function WikiReader({ article, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(article.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(article.slug, draft);
      setEditing(false);
    } catch (e) {
      setError('Could not save that edit. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
        <div className="min-w-0">
          <p className="label-xs">{article.section}</p>
          <h3 className="font-heading text-lg leading-tight text-white">{article.title}</h3>
        </div>
        {editing ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="btn-gold flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide"
            >
              <Check className="h-3 w-3" /> {saving ? 'Saving' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(article.body);
                setEditing(false);
                setError(null);
              }}
              className="btn-ghost flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(article.body);
              setEditing(true);
            }}
            className="btn-ghost flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide"
          >
            <Pencil className="h-3 w-3" /> Edit this page
          </button>
        )}
      </div>

      <div className="map-scroll min-h-0 flex-1 overflow-y-auto pt-2">
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="h-[42vh] w-full resize-none rounded-lg border border-white/15 bg-black/40 p-2.5 font-mono text-[12px] leading-relaxed text-slate-200 outline-none focus:border-primary/60"
          />
        ) : (
          <ReactMarkdown components={MD}>{article.body}</ReactMarkdown>
        )}
        {error && <p className="mt-1 text-[11px] font-bold text-rose-300">{error}</p>}
        {editing && (
          <p className="mt-1 text-[10px] font-semibold text-slate-500">
            Plain text with **bold**, blank lines between paragraphs, and "- " for a list.
          </p>
        )}
        {!editing && article.edited && (
          <p className="mt-2 border-t border-white/10 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            This page has been edited in-game
          </p>
        )}
      </div>
    </div>
  );
}