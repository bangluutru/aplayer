import React, { useMemo, useState } from 'react'
import { formatDuration, formatFileSize, PLATFORM_METADATA } from '@shared/formats'
import { getDictionary } from '@shared/i18n'
import type { MediaItem } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import {
  IconDownloader,
  IconFolder,
  IconFolderAdd,
  IconGrid,
  IconHeart,
  IconList,
  IconListPlus,
  IconMusic,
  IconOpenFile,
  IconPlay,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconVideo,
  PlatformIcon
} from './icons/APlayerIcons'

interface LibraryViewProps {
  onOpenFiles: () => void
  onOpenFolder: () => void
}

type FilterTab = 'all' | 'video' | 'audio' | 'favorites' | 'downloads' | 'playlists'
type SortKey = 'recent' | 'name' | 'duration' | 'size'

const MediaThumb: React.FC<{ item: MediaItem; url: string | null }> = ({ item, url }) => {
  const [broken, setBroken] = useState(false)

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#081226]/70 flex items-center justify-center border border-white/10">
      {url && !broken ? (
        <img
          src={url}
          alt={item.title}
          loading="lazy"
          onError={() => setBroken(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background:
              item.kind === 'video'
                ? 'linear-gradient(135deg, rgba(15,45,107,0.75), rgba(59,130,246,0.35))'
                : 'linear-gradient(135deg, rgba(15,45,107,0.75), rgba(16,185,129,0.28))'
          }}
        >
          {item.kind === 'video' ? (
            <IconVideo size={32} className="text-white/80" />
          ) : (
            <IconMusic size={32} className="text-white/80" />
          )}
        </div>
      )}

      {/* Format & Resolution Badge */}
      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#061024]/75 backdrop-blur-md text-[10px] font-mono text-white uppercase border border-white/15">
        {item.ext}
        {item.height ? ` · ${item.height}p` : ''}
      </span>

      {item.sourcePlatform && (
        <span
          className="absolute top-2 right-2 px-1.5 py-1 rounded-md bg-[#061024]/75 backdrop-blur-md text-white border border-white/15 flex items-center gap-1 text-[10px] font-semibold"
          style={{ color: PLATFORM_METADATA[item.sourcePlatform].color }}
        >
          <PlatformIcon platform={item.sourcePlatform} size={11} />
          {PLATFORM_METADATA[item.sourcePlatform].shortName}
        </span>
      )}

      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-[#061024]/80 text-[10px] font-mono text-white">
        {formatDuration(item.duration)}
      </span>

      {/* Hover Play Overlay */}
      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="glass-btn-accent w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
          <IconPlay size={18} className="translate-x-0.5" />
        </div>
      </div>
    </div>
  )
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onOpenFiles, onOpenFolder }) => {
  const settings = useAppStore((s) => s.settings)
  const items = useAppStore((s) => s.libraryItems)
  const playlists = useAppStore((s) => s.playlists)
  const currentItem = useAppStore((s) => s.currentItem)
  const isScanning = useAppStore((s) => s.isScanning)
  const playMediaItem = useAppStore((s) => s.playMediaItem)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const addToQueue = useAppStore((s) => s.addToQueue)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const removeLibraryItem = useAppStore((s) => s.removeLibraryItem)
  const scanWatchedFolders = useAppStore((s) => s.scanWatchedFolders)
  const createPlaylist = useAppStore((s) => s.createPlaylist)
  const deletePlaylist = useAppStore((s) => s.deletePlaylist)
  const addItemToPlaylist = useAppStore((s) => s.addItemToPlaylist)
  const removeItemFromPlaylist = useAppStore((s) => s.removeItemFromPlaylist)
  const getArtworkUrl = useAppStore((s) => s.getArtworkUrl)

  const [filter, setFilter] = useState<FilterTab>('all')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('recent')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [creatingPlaylist, setCreatingPlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [playlistPickerItemId, setPlaylistPickerItemId] = useState<string | null>(null)

  const t = getDictionary(settings.language)

  const filteredItems = useMemo(() => {
    let list = items

    if (filter === 'video') list = list.filter((i) => i.kind === 'video')
    else if (filter === 'audio') list = list.filter((i) => i.kind === 'audio')
    else if (filter === 'favorites') list = list.filter((i) => i.favorite)
    else if (filter === 'downloads') list = list.filter((i) => i.isDownloaded)
    else if (filter === 'playlists' && selectedPlaylistId) {
      const pl = playlists.find((p) => p.id === selectedPlaylistId)
      const idSet = new Set(pl?.itemIds || [])
      list = list.filter((i) => idSet.has(i.id))
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.artist.toLowerCase().includes(q) ||
          i.album.toLowerCase().includes(q) ||
          i.ext.toLowerCase().includes(q)
      )
    }

    const sorted = [...list]
    if (sortBy === 'name') sorted.sort((a, b) => a.title.localeCompare(b.title))
    else if (sortBy === 'duration') sorted.sort((a, b) => b.duration - a.duration)
    else if (sortBy === 'size') sorted.sort((a, b) => b.sizeBytes - a.sizeBytes)
    else sorted.sort((a, b) => b.addedAt - a.addedAt)

    return sorted
  }, [items, filter, selectedPlaylistId, playlists, search, sortBy])

  const handlePlay = (item: MediaItem): void => {
    void playMediaItem(item, filteredItems)
    setActiveTab('player')
  }

  const handleCreatePlaylist = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!newPlaylistName.trim()) return
    await createPlaylist(newPlaylistName.trim())
    setNewPlaylistName('')
    setCreatingPlaylist(false)
  }

  const filterTabs: Array<{ id: FilterTab; label: string }> = [
    { id: 'all', label: t.library.all },
    { id: 'video', label: t.library.videos },
    { id: 'audio', label: t.library.audio },
    { id: 'favorites', label: t.library.favorites },
    { id: 'downloads', label: t.library.downloads },
    { id: 'playlists', label: t.library.playlists }
  ]

  return (
    <div className="glass-panel flex-1 flex flex-col overflow-hidden p-5 md:p-6 gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight">{t.library.title}</h1>
          <p className="text-xs text-[var(--text-muted)]">
            {t.library.subtitle} · {filteredItems.length} {t.library.itemsCount}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {filteredItems.length > 0 && (
            <button
              onClick={() => handlePlay(filteredItems[0])}
              className="glass-btn-accent px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <IconPlay size={13} />
              {t.library.playAll}
            </button>
          )}
          <button
            onClick={onOpenFiles}
            className="glass-btn px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5"
          >
            <IconOpenFile size={14} className="text-[var(--accent)]" />
            {t.library.addFiles}
          </button>
          <button
            onClick={onOpenFolder}
            className="glass-btn px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5"
          >
            <IconFolderAdd size={14} className="text-[var(--spark)]" />
            {t.library.scanFolder}
          </button>
          <button
            onClick={() => void scanWatchedFolders()}
            disabled={isScanning}
            className="glass-btn p-2 rounded-xl"
            title={t.library.rescan}
          >
            <IconRefresh size={15} className={isScanning ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters + Search + View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilter(tab.id)
                if (tab.id !== 'playlists') setSelectedPlaylistId(null)
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
                filter === tab.id ? 'glass-btn-accent' : 'glass-btn text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.library.searchPlaceholder}
              className="glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs w-64"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="glass-input px-2.5 py-1.5 rounded-xl text-xs"
          >
            <option value="recent">{t.library.sortRecent}</option>
            <option value="name">{t.library.sortName}</option>
            <option value="duration">{t.library.sortDuration}</option>
            <option value="size">{t.library.sortSize}</option>
          </select>

          <div className="flex glass-card p-0.5 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'glass-btn-accent' : ''}`}
            >
              <IconGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'glass-btn-accent' : ''}`}
            >
              <IconList size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Playlists Strip */}
      {filter === 'playlists' && (
        <div className="glass-card p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer transition ${
                    selectedPlaylistId === pl.id ? 'glass-btn-accent' : 'glass-btn'
                  }`}
                  onClick={() => setSelectedPlaylistId(selectedPlaylistId === pl.id ? null : pl.id)}
                >
                  <span className="font-medium">{pl.name}</span>
                  <span className="opacity-70 font-mono">({pl.itemIds.length})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (selectedPlaylistId === pl.id) setSelectedPlaylistId(null)
                      void deletePlaylist(pl.id)
                    }}
                    className="ml-1 opacity-60 hover:opacity-100"
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              ))}
            </div>

            {creatingPlaylist ? (
              <form onSubmit={(e) => void handleCreatePlaylist(e)} className="flex items-center gap-1.5">
                <input
                  type="text"
                  autoFocus
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder={t.library.playlistNamePlaceholder}
                  className="glass-input px-3 py-1 rounded-xl text-xs w-44"
                />
                <button type="submit" className="glass-btn-accent px-3 py-1 rounded-xl text-xs font-medium">
                  {t.library.create}
                </button>
                <button
                  type="button"
                  onClick={() => setCreatingPlaylist(false)}
                  className="glass-btn px-2.5 py-1 rounded-xl text-xs"
                >
                  {t.library.cancel}
                </button>
              </form>
            ) : (
              <button
                onClick={() => setCreatingPlaylist(true)}
                className="glass-btn px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
              >
                <IconOpenFile size={13} className="text-[var(--accent)]" />
                {t.library.newPlaylist}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12 px-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center">
              <IconVideo size={26} className="text-[var(--accent)]" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="font-display text-base font-bold">{t.library.emptyTitle}</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {t.library.emptySubtitle}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onOpenFiles}
                className="glass-btn-accent px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
              >
                <IconOpenFile size={14} />
                {t.library.addFiles}
              </button>
              <button
                onClick={() => setActiveTab('downloader')}
                className="glass-btn px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5"
              >
                <IconDownloader size={14} className="text-[var(--accent)]" />
                {t.nav.downloader}
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 pb-4">
            {filteredItems.map((item) => {
              const isActive = currentItem?.id === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => handlePlay(item)}
                  className={`glass-card p-2.5 cursor-pointer group flex flex-col gap-2.5 relative ${
                    isActive ? 'ring-1 ring-[var(--accent)]' : ''
                  }`}
                >
                  <MediaThumb item={item} url={getArtworkUrl(item)} />

                  <div className="px-1 space-y-0.5 min-w-0">
                    <div className="text-xs font-semibold truncate">{item.title}</div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span className="truncate">{item.artist}</span>
                      <span className="font-mono shrink-0 ml-2">{formatFileSize(item.sizeBytes)}</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div
                    className="flex items-center justify-between pt-1.5 border-t border-[var(--glass-track-bg)] px-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => void toggleFavorite(item.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] transition"
                        title={t.library.favorites}
                      >
                        <IconHeart
                          size={14}
                          filled={item.favorite}
                          className={item.favorite ? 'text-rose-500' : 'text-[var(--text-muted)]'}
                        />
                      </button>
                      <button
                        onClick={() => addToQueue(item)}
                        className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] transition text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title={t.library.addToQueue}
                      >
                        <IconListPlus size={14} />
                      </button>
                      {playlists.length > 0 && (
                        <button
                          onClick={() =>
                            setPlaylistPickerItemId(playlistPickerItemId === item.id ? null : item.id)
                          }
                          className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] transition text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          title={t.library.addToPlaylist}
                        >
                          <IconOpenFile size={13} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => void window.aplayerAPI.showInFinder(item.filePath)}
                        className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] transition text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title={t.player.revealFinder}
                      >
                        <IconFolder size={14} />
                      </button>
                      <button
                        onClick={() =>
                          selectedPlaylistId && filter === 'playlists'
                            ? void removeItemFromPlaylist(selectedPlaylistId, item.id)
                            : void removeLibraryItem(item.id)
                        }
                        className="p-1.5 rounded-lg hover:bg-rose-500/15 hover:text-rose-400 transition text-[var(--text-muted)]"
                        title={t.library.removeLibrary}
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>

                  {playlistPickerItemId === item.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-11 left-2 right-2 z-20 glass-elevated p-2 space-y-1 shadow-xl"
                    >
                      {playlists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => {
                            void addItemToPlaylist(pl.id, item.id)
                            setPlaylistPickerItemId(null)
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-[var(--glass-btn-bg)] truncate"
                        >
                          {pl.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-1.5 pb-4">
            {filteredItems.map((item) => {
              const isActive = currentItem?.id === item.id
              return (
                <div
                  key={item.id}
                  onClick={() => handlePlay(item)}
                  className={`glass-card px-3.5 py-2.5 flex items-center gap-3 cursor-pointer ${
                    isActive ? 'ring-1 ring-[var(--accent)]' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-[var(--glass-btn-bg)] flex items-center justify-center shrink-0">
                    {item.kind === 'video' ? (
                      <IconVideo size={16} className="text-[var(--accent)]" />
                    ) : (
                      <IconMusic size={16} className="text-[var(--spark)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{item.title}</div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">
                      {item.artist}
                      {item.album ? ` · ${item.album}` : ''}
                    </div>
                  </div>
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-md bg-[var(--glass-btn-bg)] uppercase">
                    {item.ext}
                  </span>
                  <span className="text-xs font-mono text-[var(--text-secondary)] w-14 text-right">
                    {formatDuration(item.duration)}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] w-16 text-right hidden md:inline">
                    {formatFileSize(item.sizeBytes)}
                  </span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => void toggleFavorite(item.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)]"
                    >
                      <IconHeart
                        size={14}
                        filled={item.favorite}
                        className={item.favorite ? 'text-rose-500' : 'text-[var(--text-muted)]'}
                      />
                    </button>
                    <button
                      onClick={() => void window.aplayerAPI.showInFinder(item.filePath)}
                      className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] text-[var(--text-muted)]"
                    >
                      <IconFolder size={14} />
                    </button>
                    <button
                      onClick={() => void removeLibraryItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/15 hover:text-rose-400 text-[var(--text-muted)]"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
