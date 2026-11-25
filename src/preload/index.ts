import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  AnalyzedMediaInfo,
  BrowserCookieSource,
  DownloadRequest,
  DownloadTask,
  MediaItem,
  MediaProbeResult,
  NavTab,
  PersonalizationSettings,
  Playlist,
  SupportedPlatform,
  SystemCapabilities
} from '../shared/types'

const aplayerAPI = {
  getCapabilities: (): Promise<SystemCapabilities> => ipcRenderer.invoke('system:capabilities'),

  getSettings: (): Promise<PersonalizationSettings> => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch: Partial<PersonalizationSettings>): Promise<PersonalizationSettings> =>
    ipcRenderer.invoke('settings:update', patch),
  resetSettings: (): Promise<PersonalizationSettings> => ipcRenderer.invoke('settings:reset'),
  exportSettings: (): Promise<{ saved: boolean; path?: string }> =>
    ipcRenderer.invoke('settings:export'),
  importSettings: (): Promise<PersonalizationSettings | null> =>
    ipcRenderer.invoke('settings:import'),

  openMediaFilesDialog: (): Promise<string[]> => ipcRenderer.invoke('dialog:open-media-files'),
  openFolderDialog: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:open-folder', defaultPath),
  openSubtitleDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-subtitle'),
  openImageDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-image'),
  readImageAsDataUrl: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('dialog:read-image-data-url', filePath),
  saveScreenshot: (dataUrl: string, suggestedName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:save-screenshot', dataUrl, suggestedName),

  showInFinder: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('shell:show-in-finder', filePath),
  openFolderInFinder: (dirPath: string): Promise<boolean> =>
    ipcRenderer.invoke('shell:open-folder', dirPath),
  readClipboardText: (): Promise<string> => ipcRenderer.invoke('clipboard:read'),

  getPathForDroppedFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return ''
    }
  },

  probeMedia: (filePath: string): Promise<MediaProbeResult> =>
    ipcRenderer.invoke('media:probe', filePath),

  getLibrary: (): Promise<{ items: MediaItem[]; playlists: Playlist[] }> =>
    ipcRenderer.invoke('library:get'),
  importPaths: (paths: string[]): Promise<{ imported: MediaItem[]; items: MediaItem[] }> =>
    ipcRenderer.invoke('library:import-paths', paths),
  scanWatchedFolders: (): Promise<MediaItem[]> => ipcRenderer.invoke('library:scan-watched'),
  removeLibraryItem: (id: string): Promise<MediaItem[]> =>
    ipcRenderer.invoke('library:remove-item', id),
  toggleFavorite: (id: string): Promise<MediaItem | null> =>
    ipcRenderer.invoke('library:toggle-favorite', id),
  recordPlayback: (id: string, position: number, incrementPlayCount: boolean): Promise<void> =>
    ipcRenderer.invoke('library:record-playback', id, position, incrementPlayCount),

  createPlaylist: (name: string, description?: string): Promise<Playlist> =>
    ipcRenderer.invoke('playlist:create', name, description),
  deletePlaylist: (id: string): Promise<Playlist[]> => ipcRenderer.invoke('playlist:delete', id),
  addToPlaylist: (playlistId: string, itemId: string): Promise<Playlist | null> =>
    ipcRenderer.invoke('playlist:add-item', playlistId, itemId),
  removeFromPlaylist: (playlistId: string, itemId: string): Promise<Playlist | null> =>
    ipcRenderer.invoke('playlist:remove-item', playlistId, itemId),

  getDownloads: (): Promise<DownloadTask[]> => ipcRenderer.invoke('downloader:list'),
  analyzeUrl: (url: string, cookieBrowser: BrowserCookieSource): Promise<AnalyzedMediaInfo> =>
    ipcRenderer.invoke('downloader:analyze', url, cookieBrowser),
  resolveDirectStream: (
    url: string,
    cookieBrowser: BrowserCookieSource
  ): Promise<{
    streamUrl: string
    title: string
    uploader: string
    thumbnail?: string
    platform: SupportedPlatform
  }> => ipcRenderer.invoke('downloader:resolve-stream', url, cookieBrowser),
  startDownload: (req: DownloadRequest): Promise<DownloadTask> =>
    ipcRenderer.invoke('downloader:start', req),
  cancelDownload: (taskId: string): Promise<DownloadTask[]> =>
    ipcRenderer.invoke('downloader:cancel', taskId),
  removeDownload: (taskId: string): Promise<DownloadTask[]> =>
    ipcRenderer.invoke('downloader:remove', taskId),
  clearCompletedDownloads: (): Promise<DownloadTask[]> =>
    ipcRenderer.invoke('downloader:clear-completed'),

  onDownloadTaskUpdated: (callback: (task: DownloadTask) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, task: DownloadTask): void => callback(task)
    ipcRenderer.on('downloader:task-updated', listener)
    return () => ipcRenderer.removeListener('downloader:task-updated', listener)
  },

  onLibraryItemAdded: (callback: (item: MediaItem) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, item: MediaItem): void => callback(item)
    ipcRenderer.on('library:item-added', listener)
    return () => ipcRenderer.removeListener('library:item-added', listener)
  },

  onExternalFiles: (callback: (paths: string[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, paths: string[]): void => callback(paths)
    ipcRenderer.on('aplayer:external-files', listener)
    return () => ipcRenderer.removeListener('aplayer:external-files', listener)
  },

  onNavigate: (callback: (tab: NavTab) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, tab: NavTab): void => callback(tab)
    ipcRenderer.on('aplayer:navigate', listener)
    return () => ipcRenderer.removeListener('aplayer:navigate', listener)
  },

  onTriggerOpenFiles: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('aplayer:trigger-open-files', listener)
    return () => ipcRenderer.removeListener('aplayer:trigger-open-files', listener)
  },

  onTriggerOpenFolder: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('aplayer:trigger-open-folder', listener)
    return () => ipcRenderer.removeListener('aplayer:trigger-open-folder', listener)
  }
}

export type APlayerAPI = typeof aplayerAPI

contextBridge.exposeInMainWorld('aplayerAPI', aplayerAPI)
