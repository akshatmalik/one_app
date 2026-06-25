'use client';

import { useMemo, useState } from 'react';
import { X, Folder, FolderPlus, Plus, Trash2, Pencil, Search, ChevronLeft, Gamepad2 } from 'lucide-react';
import { Game } from '../lib/types';
import { GameCollection } from '../lib/collections-storage';

interface CollectionsModalProps {
  collections: GameCollection[];
  games: Game[];
  onCreate: (name: string, emoji: string) => void;
  onRename: (id: string, name: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onAddGame: (collectionId: string, gameId: string) => void;
  onRemoveGame: (collectionId: string, gameId: string) => void;
  onClose: () => void;
}

const EMOJI_CHOICES = ['🗂️', '🎮', '❤️', '🔥', '🏆', '🌙', '🧩', '🛋️', '⚡', '🎯', '🌟', '👻'];

function CollectionForm({
  initialName = '',
  initialEmoji = EMOJI_CHOICES[0],
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  initialEmoji?: string;
  submitLabel: string;
  onSubmit: (name: string, emoji: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji);

  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
      <div className="flex items-center gap-2">
        {EMOJI_CHOICES.map(e => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all ${
              emoji === e ? 'bg-purple-500/25 ring-1 ring-purple-400/50' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Collection name, e.g. Couch Co-op"
        autoFocus
        className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white text-sm rounded-lg placeholder:text-white/25 focus:outline-none focus:border-purple-500/40"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={() => name.trim() && onSubmit(name, emoji)}
          disabled={!name.trim()}
          className="flex-1 px-3 py-1.5 bg-purple-600/80 hover:bg-purple-600 disabled:opacity-30 disabled:hover:bg-purple-600/80 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CollectionsModal({
  collections,
  games,
  onCreate,
  onRename,
  onDelete,
  onAddGame,
  onRemoveGame,
  onClose,
}: CollectionsModalProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState('');

  const active = collections.find(c => c.id === activeId) || null;
  const gamesById = useMemo(() => new Map(games.map(g => [g.id, g])), [games]);

  const activeGames = useMemo(
    () => (active ? active.gameIds.map(id => gamesById.get(id)).filter((g): g is Game => !!g) : []),
    [active, gamesById]
  );

  const addCandidates = useMemo(() => {
    if (!active) return [];
    const q = addSearch.trim().toLowerCase();
    return games
      .filter(g => !active.gameIds.includes(g.id))
      .filter(g => !q || g.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [active, games, addSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            {active ? (
              <button onClick={() => { setActiveId(null); setAddSearch(''); }} className="p-1 -ml-1 text-white/50 hover:text-white/80 transition-colors">
                <ChevronLeft size={18} />
              </button>
            ) : (
              <Folder size={18} className="text-purple-400" />
            )}
            <h3 className="text-lg font-bold text-white/90">
              {active ? `${active.emoji} ${active.name}` : 'Collections'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {!active ? (
            <>
              {collections.length === 0 && !showCreateForm && (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                  <Folder size={28} className="text-white/15" />
                  <div className="text-[13px] text-white/40">No collections yet</div>
                  <div className="text-[11px] text-white/25 max-w-xs">
                    Build custom lists like &ldquo;Couch Co-op&rdquo; or &ldquo;Comfort Replays&rdquo; — any way you want to group your games.
                  </div>
                </div>
              )}

              {showCreateForm ? (
                <CollectionForm
                  submitLabel="Create"
                  onSubmit={(name, emoji) => { onCreate(name, emoji); setShowCreateForm(false); }}
                  onCancel={() => setShowCreateForm(false)}
                />
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-white/15 text-white/50 hover:text-white/80 hover:border-white/30 text-[13px] font-medium transition-colors"
                >
                  <FolderPlus size={15} /> New collection
                </button>
              )}

              <div className="space-y-2">
                {collections.map(c => (
                  <div key={c.id}>
                    {editingId === c.id ? (
                      <CollectionForm
                        initialName={c.name}
                        initialEmoji={c.emoji}
                        submitLabel="Save"
                        onSubmit={(name, emoji) => { onRename(c.id, name, emoji); setEditingId(null); }}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <button onClick={() => setActiveId(c.id)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                          <span className="text-xl shrink-0">{c.emoji}</span>
                          <div className="min-w-0">
                            <div className="text-[13px] text-white/85 font-medium truncate">{c.name}</div>
                            <div className="text-[11px] text-white/35">
                              {c.gameIds.length} game{c.gameIds.length === 1 ? '' : 's'}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => setEditingId(c.id)}
                          className="p-1.5 text-white/30 hover:text-white/70 transition-colors"
                          aria-label="Rename collection"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${c.name}"? This only removes the collection, not the games in it.`)) {
                              onDelete(c.id);
                            }
                          }}
                          className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
                          aria-label="Delete collection"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  placeholder="Search your library to add games…"
                  className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 text-white text-[13px] rounded-lg placeholder:text-white/25 focus:outline-none focus:border-purple-500/40"
                />
              </div>

              {addSearch.trim() && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {addCandidates.length === 0 ? (
                    <p className="text-[11px] text-white/30 text-center py-2">No matches</p>
                  ) : (
                    addCandidates.map(g => (
                      <button
                        key={g.id}
                        onClick={() => { onAddGame(active.id, g.id); setAddSearch(''); }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] hover:bg-purple-500/10 border border-white/5 transition-colors text-left"
                      >
                        {g.thumbnail ? (
                          <img src={g.thumbnail} alt={g.name} className="w-8 h-8 object-cover rounded shrink-0" loading="lazy" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                            <Gamepad2 size={13} className="text-white/20" />
                          </div>
                        )}
                        <span className="text-[12px] text-white/80 truncate flex-1">{g.name}</span>
                        <Plus size={13} className="text-purple-400 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="space-y-2">
                {activeGames.length === 0 ? (
                  <p className="text-[11px] text-white/30 text-center py-6">
                    No games in this collection yet — search above to add some.
                  </p>
                ) : (
                  activeGames.map(g => (
                    <div key={g.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-white/10 bg-white/[0.02]">
                      {g.thumbnail ? (
                        <img src={g.thumbnail} alt={g.name} className="w-10 h-10 object-cover rounded-lg shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <Gamepad2 size={15} className="text-white/20" />
                        </div>
                      )}
                      <span className="flex-1 min-w-0 text-[13px] text-white/85 font-medium truncate">{g.name}</span>
                      <button
                        onClick={() => onRemoveGame(active.id, g.id)}
                        className="p-1.5 text-white/30 hover:text-red-400 transition-colors shrink-0"
                        aria-label="Remove from collection"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
