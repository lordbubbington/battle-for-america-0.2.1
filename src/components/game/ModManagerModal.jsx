import React, { useEffect, useRef, useState } from 'react';
import {
  X, FolderOpen, RefreshCw, ArrowUp, ArrowDown, Plus, Upload, Trash2,
  AlertTriangle, CheckCircle2, Download, Cloud,
} from 'lucide-react';
import {
  buildExampleModBundle,
  getModState,
  importBrowserModBundle,
  loadAndApplyMods,
  moveModOrder,
  removeBrowserMod,
  setModEnabled,
  subscribeModRegistry,
} from '@/lib/modRegistry';

function contentBadgesFor(summary) {
  if (!summary) return [];
  const labels = [
    ['candidates', 'cand'],
    ['ratings', 'ratings'],
    ['states', 'states'],
    ['runningMates', 'VPs'],
    ['events', 'events'],
    ['nationalNews', 'nat news'],
    ['worldNews', 'world news'],
    ['debates', 'debates'],
    ['issues', 'issues'],
    ['scenarios', 'scenarios'],
  ];
  return labels
    .filter(([k]) => (summary[k] || 0) > 0)
    .map(([k, label]) => `${summary[k]} ${label}`);
}

export default function ModManagerModal({ open, onClose }) {
  const [modState, setModState] = useState(() => getModState());
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [steamAppId, setSteamAppId] = useState('');
  const [workshopDir, setWorkshopDir] = useState('');
  const [workshopStatus, setWorkshopStatus] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeModRegistry((next) => setModState({ ...next }));
    if (open) {
      loadAndApplyMods();
      const api = /** @type {any} */ (window).bfaMods;
      if (api?.getWorkshopStatus) {
        api.getWorkshopStatus().then((st) => {
          setWorkshopStatus(st);
          setSteamAppId(st?.steamAppId || '');
          setWorkshopDir(st?.workshopDir || '');
        }).catch(() => {});
      }
    }
    return unsub;
  }, [open]);

  if (!open) return null;

  const enabledSet = new Set(modState.enabledIds || []);

  const handleReload = async () => {
    setBusy(true);
    setStatusMessage('');
    try {
      await loadAndApplyMods();
      setStatusMessage('Mods reloaded.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenFolder = async () => {
    if (/** @type {any} */ (window).bfaMods?.openModsFolder) {
      await /** @type {any} */ (window).bfaMods.openModsFolder();
    }
  };

  const handleCreateExample = async () => {
    setBusy(true);
    setStatusMessage('');
    try {
      if (/** @type {any} */ (window).bfaMods?.createExampleMod) {
        await /** @type {any} */ (window).bfaMods.createExampleMod();
        await loadAndApplyMods();
        setStatusMessage('Created example-balance-mod in your Mods folder.');
      } else {
        await importBrowserModBundle(buildExampleModBundle());
        setStatusMessage('Loaded Example Mod: 2028 Wildcard Pack (browser mode).');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleImportJson = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setStatusMessage('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const bundle = parsed.manifest ? parsed : { manifest: parsed, parseErrors: [] };
      await importBrowserModBundle(bundle);
      setStatusMessage(`Imported ${bundle.manifest?.name || file.name}.`);
    } catch (err) {
      setStatusMessage(`Could not import mod JSON: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleExportJson = (entry) => {
    const b = entry.bundle || {};
    const packed = {
      manifest: b.manifest,
      ...(b.candidates ? { candidates: b.candidates } : {}),
      ...(b.ratings ? { ratings: b.ratings } : {}),
      ...(b.states ? { states: b.states } : {}),
      ...(b.scenarios ? { scenarios: b.scenarios } : {}),
      ...(b.events ? { events: b.events } : {}),
      ...(b.news ? { news: b.news } : {}),
      ...(b.debates ? { debates: b.debates } : {}),
      ...(b.runningMates ? { runningMates: b.runningMates } : {}),
      ...(b.issues ? { issues: b.issues } : {}),
    };
    const blob = new Blob([JSON.stringify(packed, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.id}.bfa-mod.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported ${entry.id}.bfa-mod.json.`);
  };

  const handleSaveWorkshopConfig = async () => {
    const api = /** @type {any} */ (window).bfaMods;
    if (!api?.configureWorkshop) return;
    setBusy(true);
    try {
      await api.configureWorkshop({ steamAppId, workshopDir });
      const st = await api.getWorkshopStatus();
      setWorkshopStatus(st);
      await loadAndApplyMods();
      setStatusMessage(`Saved Steam Workshop settings (${st?.subscribedCount || 0} subscribed mods found).`);
    } finally {
      setBusy(false);
    }
  };

  const handlePrepareVdf = async (entry) => {
    const api = /** @type {any} */ (window).bfaMods;
    if (!api?.prepareWorkshopUpload) return;
    if (!steamAppId.trim()) {
      setWorkshopOpen(true);
      setStatusMessage('Enter your numeric Steam AppID in Steam Workshop settings first.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.prepareWorkshopUpload({
        modId: entry.folderName || entry.id,
        steamAppId: steamAppId.trim(),
      });
      if (res?.ok) {
        setStatusMessage(`Wrote ${res.vdfPath}. Run: ${res.command}`);
      } else {
        setStatusMessage(`Workshop VDF error: ${res?.error || 'Unknown error'}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Mod Manager">
      <div className="panel flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden border-white/15 bg-[#121a2b] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="label-xs text-primary">Modding & Workshop</p>
            <h2 className="font-heading text-2xl text-white">Mod Manager</h2>
            <p className="mt-1 text-xs text-slate-400">
              Enable declarative JSON mods for candidates, ratings, portraits, state leans, running mates, events, news, debates, and issues.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost rounded-lg p-1.5" aria-label="Close Mod Manager">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {modState.isDesktop && (
            <button type="button" onClick={handleOpenFolder} className="btn-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold">
              <FolderOpen className="h-3.5 w-3.5" /> Open Mods Folder
            </button>
          )}
          <button type="button" onClick={handleCreateExample} disabled={busy} className="btn-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold">
            <Plus className="h-3.5 w-3.5" /> Create Example Mod
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className="btn-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold">
            <Upload className="h-3.5 w-3.5" /> Import JSON Bundle
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportJson} className="hidden" />
          {modState.isDesktop && (
            <button type="button" onClick={() => setWorkshopOpen((v) => !v)} className="btn-outline inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold">
              <Cloud className="h-3.5 w-3.5" /> Steam Workshop{workshopStatus?.subscribedCount ? ` (${workshopStatus.subscribedCount})` : ''}
            </button>
          )}
          <button type="button" onClick={handleReload} disabled={busy} className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold">
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Reload
          </button>
        </div>

        {workshopOpen && modState.isDesktop && (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
            <p className="font-bold text-white">Steam Workshop UGC Settings</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Set your numeric Steam AppID (or a custom Workshop folder) to auto-scan subscribed UGC items and generate SteamCMD upload VDFs.
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={steamAppId}
                onChange={(e) => setSteamAppId(e.target.value)}
                placeholder="Steam AppID (e.g. 480)"
                className="rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                value={workshopDir}
                onChange={(e) => setWorkshopDir(e.target.value)}
                placeholder="Optional custom Workshop folder"
                className="rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <button type="button" onClick={handleSaveWorkshopConfig} disabled={busy} className="btn-gold px-3 py-1 text-[11px] font-extrabold">
                Save & Scan Workshop
              </button>
            </div>
          </div>
        )}

        {statusMessage && (
          <p className="mt-2 break-all rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
            {statusMessage}
          </p>
        )}

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {modState.discovered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
              <p className="text-sm font-bold text-white">No mods installed yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Click <span className="font-bold text-slate-200">Create Example Mod</span> to generate a starter pack, or drop mod folders into your Mods directory.
              </p>
            </div>
          ) : (
            modState.discovered.map((entry, idx) => {
              const valid = entry.validation.valid;
              const enabled = valid && enabledSet.has(entry.id);
              const m = entry.bundle?.manifest || {};
              const badges = contentBadgesFor(entry.validation.summary);
              return (
                <div
                  key={entry.id}
                  className={`rounded-xl border p-3 ${
                    !valid
                      ? 'border-red-400/40 bg-red-950/20'
                      : enabled
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-white/10 bg-black/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={!valid || busy}
                        onChange={(e) => setModEnabled(entry.id, e.target.checked)}
                        className="mt-1 h-4 w-4 accent-amber-400"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-extrabold text-white">{m.name || entry.folderName}</span>
                          {m.version && <span className="chip text-[10px]">v{m.version}</span>}
                          <span className="chip text-[10px]">{m.mode || 'patch'}</span>
                          <span className="chip text-[10px]">
                            {entry.source === 'workshop' ? `workshop #${entry.bundle?.workshopItemId || entry.folderName}` : entry.source}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          ID: <span className="font-mono text-slate-300">{entry.id}</span>
                          {m.author ? ` · by ${m.author}` : ''}
                        </p>
                        {m.description && <p className="mt-1 text-xs text-slate-300">{m.description}</p>}
                        {badges.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {badges.map((b) => (
                              <span key={b} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveModOrder(entry.id, -1)}
                        disabled={idx === 0 || busy}
                        className="btn-ghost rounded p-1 disabled:opacity-30"
                        title="Move up in load order"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveModOrder(entry.id, 1)}
                        disabled={idx === modState.discovered.length - 1 || busy}
                        className="btn-ghost rounded p-1 disabled:opacity-30"
                        title="Move down in load order"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      {valid && (
                        <button
                          type="button"
                          onClick={() => handleExportJson(entry)}
                          disabled={busy}
                          className="btn-ghost rounded p-1"
                          title="Export shareable .bfa-mod.json bundle"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {valid && modState.isDesktop && entry.source === 'desktop' && (
                        <button
                          type="button"
                          onClick={() => handlePrepareVdf(entry)}
                          disabled={busy}
                          className="btn-ghost rounded p-1"
                          title="Generate Steam Workshop workshop_build.vdf"
                        >
                          <Cloud className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {entry.source === 'browser' && (
                        <button
                          type="button"
                          onClick={() => removeBrowserMod(entry.id)}
                          disabled={busy}
                          className="btn-ghost rounded p-1 text-red-300 hover:text-red-200"
                          title="Remove imported mod"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!valid ? (
                    <div className="mt-2 rounded-lg border border-red-400/30 bg-red-950/40 p-2 text-[11px] text-red-200">
                      <p className="flex items-center gap-1 font-bold">
                        <AlertTriangle className="h-3.5 w-3.5" /> Quarantined — validation errors ({entry.validation.errors.length}):
                      </p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">
                        {entry.validation.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ) : enabled ? (
                    <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active in load order #{idx + 1}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400">
          <span>{modState.activeDescriptors.length} active mod{modState.activeDescriptors.length === 1 ? '' : 's'}</span>
          <button type="button" onClick={onClose} className="btn-gold px-4 py-1.5 text-xs font-extrabold">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
