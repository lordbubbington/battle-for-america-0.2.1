import React, { useMemo, useState } from 'react';
import { WIKI_ARTICLES, WIKI_SECTIONS } from '@/data/wiki';
import WikiReader from '@/components/wiki/WikiReader';
import { BookOpen, Search, X } from 'lucide-react';

const WIKI_STORAGE_KEY = 'battle-for-america-2028-wiki-v1';

function loadArticles() {
  try {
    const saved = JSON.parse(localStorage.getItem(WIKI_STORAGE_KEY) || '{}');
    return WIKI_ARTICLES.map((article) => saved[article.slug]
      ? { ...article, body: saved[article.slug], edited: true }
      : article);
  } catch {
    return WIKI_ARTICLES;
  }
}

export default function WikiDialog({ open, onClose }) {
  const [articles, setArticles] = useState(loadArticles);
  const [slug, setSlug] = useState('how-to-play');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
    );
  }, [articles, query]);

  const article = articles.find((a) => a.slug === slug) || articles[0];

  const handleSave = (targetSlug, body) => {
    const next = articles.map((article) => article.slug === targetSlug
      ? { ...article, body, edited: true }
      : article);
    const overrides = Object.fromEntries(next.filter((article) => 'edited' in article && article.edited)
      .map((article) => [article.slug, article.body]));
    localStorage.setItem(WIKI_STORAGE_KEY, JSON.stringify(overrides));
    setArticles(next);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-3 sm:items-center">
      <div className="panel flex max-h-[92vh] w-full max-w-3xl flex-col p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-heading text-base text-white">
              The 2028 <span className="text-primary">Encyclopedia</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost rounded-full p-1.5"
            aria-label="Close the encyclopedia"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/35 px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the encyclopedia"
            className="w-full bg-transparent text-[12px] font-semibold text-slate-200 outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="mt-2 grid min-h-0 flex-1 gap-2 sm:grid-cols-[186px_minmax(0,1fr)]">
          <div className="map-scroll max-h-[26vh] space-y-2 overflow-y-auto pr-1 sm:max-h-[54vh]">
            {WIKI_SECTIONS.map((section) => {
              const items = filtered.filter((a) => a.section === section);
              if (!items.length) return null;
              return (
                <div key={section}>
                  <p className="label-xs mb-1">{section}</p>
                  <div className="space-y-0.5">
                    {items.map((a) => (
                      <button
                        key={a.slug}
                        type="button"
                        onClick={() => setSlug(a.slug)}
                        className={`block w-full rounded-md px-2 py-1 text-left text-[11.5px] font-bold leading-tight transition-colors ${
                          a.slug === article.slug
                            ? 'bg-primary/20 text-white'
                            : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                        }`}
                      >
                        {a.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!filtered.length && (
              <p className="px-2 text-[11px] font-bold text-slate-500">Nothing matches that.</p>
            )}
          </div>

          <div className="min-h-0 border-t border-white/10 pt-2 sm:border-l sm:border-t-0 sm:pl-2 sm:pt-0">
            <WikiReader key={article.slug} article={article} onSave={handleSave} />
          </div>
        </div>
      </div>
    </div>
  );
}
