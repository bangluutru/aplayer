import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  shell,
  type MenuItemConstructorOptions
} from 'electron'
import fs from 'fs'
import path from 'path'
import { ALL_MEDIA_EXTENSIONS, SUBTITLE_EXTENSIONS } from '../shared/formats'
import type {
  BrowserCookieSource,
  DownloadRequest,
  PersonalizationSettings,
  VoiceHubSettings,
  VoiceHubSynthesizeRequest
} from '../shared/types'
import { getBinaries } from './binaries'
import { DownloadManager } from './downloader'
import { getDefaultMediaDirs, LibraryStore } from './libraryStore'
import { probeMediaFile } from './mediaProbe'
import { startMediaServer, type MediaServerHandle } from './mediaServer'
import type { OffscreenHtmlFetcher } from './threadsExtractor'
import { VoiceHubManager } from './voiceHubManager'

let mainWindow: BrowserWindow | null = null
let mediaServer: MediaServerHandle | null = null
let libraryStore: LibraryStore | null = null
let downloadManager: DownloadManager | null = null
let voiceHubManager: VoiceHubManager | null = null
const pendingOpenFiles: string[] = []

const createOffscreenFetcher: OffscreenHtmlFetcher = async (targetUrl: string) => {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      width: 1024,
      height: 800,
      webPreferences: {
        offscreen: true,
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    let finished = false
    const done = (
      result: { html: string; videoSrc?: string; title?: string; poster?: string } | null
    ): void => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      if (!win.isDestroyed()) {
        win.destroy()
      }
      resolve(result)
    }

    const timeout = setTimeout(() => done(null), 14000)

    win.webContents.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    )

    win.webContents.on('did-finish-load', async () => {
      setTimeout(async () => {
        if (win.isDestroyed() || finished) return
        try {
          const data = await win.webContents.executeJavaScript(`
            (() => {
              const video = document.querySelector('video');
              const source = video ? (video.currentSrc || video.src || (video.querySelector('source') && video.querySelector('source').src)) : '';
              const poster = video ? video.poster : '';
              const title = document.title || '';
              return { html: document.documentElement.outerHTML, videoSrc: source || '', title, poster: poster || '' };
            })()
          `)
          done(data)
        } catch {
          done(null)
        }
      }, 2200)
    })

    win.webContents.on('did-fail-load', () => done(null))
    void win.loadURL(targetUrl).catch(() => done(null))
  })
}

function buildAppMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'APlayer',
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Cá nhân hoá & Cài đặt...',
                accelerator: 'Cmd+,',
                click: () => mainWindow?.webContents.send('aplayer:navigate', 'personalize')
              },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Mở file Media...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('aplayer:trigger-open-files')
        },
        {
          label: 'Quét thư mục Media...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow?.webContents.send('aplayer:trigger-open-folder')
        },
        { type: 'separator' as const },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' as const }, { role: 'zoom' as const }]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  const settings = libraryStore!.getSettings()
  const isMac = process.platform === 'darwin'

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 980,
    minHeight: 660,
    show: false,
    title: settings.brandName || 'APlayer',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 15 } : undefined,
    transparent: isMac,
    backgroundColor: isMac ? '#00000000' : '#061126',
    vibrancy: isMac && settings.enableNativeVibrancy ? 'under-window' : undefined,
    visualEffectState: isMac ? 'active' : undefined,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (pendingOpenFiles.length > 0) {
      const files = pendingOpenFiles.splice(0)
      mainWindow?.webContents.send('aplayer:external-files', files)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('system:capabilities', async () => {
    const bins = await getBinaries()
    const { videoDir, audioDir } = getDefaultMediaDirs()
    return {
      platform: process.platform,
      arch: process.arch,
      ffmpegPath: bins.ffmpegPath,
      ffmpegVersion: bins.ffmpegVersion,
      ffprobePath: bins.ffprobePath,
      ytDlpPath: bins.ytDlpPath,
      ytDlpVersion: bins.ytDlpVersion,
      denoPath: bins.denoPath,
      mediaServerBaseUrl: mediaServer!.baseUrl,
      mediaServerToken: mediaServer!.token,
      defaultVideoDir: videoDir,
      defaultAudioDir: audioDir
    }
  })

  ipcMain.handle('settings:get', () => libraryStore!.getSettings())

  ipcMain.handle('settings:update', (_e, patch: Partial<PersonalizationSettings>) => {
    const updated = libraryStore!.updateSettings(patch)
    if (mainWindow && process.platform === 'darwin') {
      if (typeof patch.enableNativeVibrancy === 'boolean') {
        mainWindow.setVibrancy(patch.enableNativeVibrancy ? 'under-window' : null)
      }
      if (typeof patch.brandName === 'string') {
        mainWindow.setTitle(patch.brandName || 'APlayer')
      }
    }
    return updated
  })

  ipcMain.handle('settings:reset', () => {
    const reset = libraryStore!.resetSettings()
    if (mainWindow && process.platform === 'darwin') {
      mainWindow.setVibrancy(reset.enableNativeVibrancy ? 'under-window' : null)
      mainWindow.setTitle(reset.brandName)
    }
    return reset
  })

  ipcMain.handle('settings:export', async () => {
    const res = await dialog.showSaveDialog(mainWindow!, {
      title: 'Xuất cấu hình cá nhân hoá APlayer',
      defaultPath: 'aplayer-theme-profile.json',
      filters: [{ name: 'JSON Profile', extensions: ['json'] }]
    })
    if (res.canceled || !res.filePath) return { saved: false }
    await fs.promises.writeFile(res.filePath, JSON.stringify(libraryStore!.getSettings(), null, 2), 'utf-8')
    return { saved: true, path: res.filePath }
  })

  ipcMain.handle('settings:import', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Nhập cấu hình cá nhân hoá APlayer',
      properties: ['openFile'],
      filters: [{ name: 'JSON Profile', extensions: ['json'] }]
    })
    if (res.canceled || res.filePaths.length === 0) return null
    const raw = await fs.promises.readFile(res.filePaths[0], 'utf-8')
    const parsed = JSON.parse(raw) as Partial<PersonalizationSettings>
    const updated = libraryStore!.updateSettings(parsed)
    if (mainWindow && process.platform === 'darwin') {
      mainWindow.setVibrancy(updated.enableNativeVibrancy ? 'under-window' : null)
      mainWindow.setTitle(updated.brandName)
    }
    return updated
  })

  // Dialogs
  ipcMain.handle('dialog:open-media-files', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Chọn file Video hoặc Âm nhạc',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Media Files', extensions: Array.from(ALL_MEDIA_EXTENSIONS) },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return res.canceled ? [] : res.filePaths
  })

  ipcMain.handle('dialog:open-folder', async (_e, defaultPath?: string) => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Chọn thư mục',
      defaultPath: defaultPath && fs.existsSync(defaultPath) ? defaultPath : undefined,
      properties: ['openDirectory', 'createDirectory']
    })
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
  })

  ipcMain.handle('dialog:open-subtitle', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Chọn file phụ đề',
      properties: ['openFile'],
      filters: [{ name: 'Subtitle Files', extensions: Array.from(SUBTITLE_EXTENSIONS) }]
    })
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
  })

  ipcMain.handle('dialog:open-image', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Chọn hình ảnh',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'] }]
    })
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]
  })

  ipcMain.handle('dialog:read-image-data-url', async (_e, filePath: string) => {
    const buf = await fs.promises.readFile(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  })

  ipcMain.handle('dialog:save-screenshot', async (_e, dataUrl: string, suggestedName: string) => {
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    const res = await dialog.showSaveDialog(mainWindow!, {
      title: 'Lưu ảnh chụp khung hình',
      defaultPath: `${suggestedName}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    })
    if (res.canceled || !res.filePath) return null
    await fs.promises.writeFile(res.filePath, Buffer.from(base64, 'base64'))
    return res.filePath
  })

  // Shell & Clipboard
  ipcMain.handle('shell:show-in-finder', (_e, filePath: string) => {
    if (filePath && fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath)
      return true
    }
    return false
  })

  ipcMain.handle('shell:open-folder', async (_e, dirPath: string) => {
    if (!dirPath) return false
    await fs.promises.mkdir(dirPath, { recursive: true })
    await shell.openPath(dirPath)
    return true
  })

  ipcMain.handle('clipboard:read', () => clipboard.readText())

  // Media Probe & Library
  ipcMain.handle('media:probe', async (_e, filePath: string) => probeMediaFile(filePath))

  ipcMain.handle('library:get', () => ({
    items: libraryStore!.pruneMissingFiles(),
    playlists: libraryStore!.getPlaylists()
  }))

  ipcMain.handle('library:import-paths', async (_e, paths: string[]) => {
    const imported = await libraryStore!.importPaths(paths)
    return {
      imported,
      items: libraryStore!.getItems()
    }
  })

  ipcMain.handle('library:scan-watched', async () => {
    const folders = libraryStore!.getSettings().watchedFolders.filter((d) => fs.existsSync(d))
    if (folders.length > 0) {
      await libraryStore!.importPaths(folders)
    }
    return libraryStore!.pruneMissingFiles()
  })

  ipcMain.handle('library:remove-item', (_e, id: string) => libraryStore!.removeItem(id))
  ipcMain.handle('library:toggle-favorite', (_e, id: string) => libraryStore!.toggleFavorite(id))
  ipcMain.handle(
    'library:record-playback',
    (_e, id: string, position: number, incrementPlayCount: boolean) => {
      libraryStore!.recordPlayback(id, position, incrementPlayCount)
    }
  )

  ipcMain.handle('playlist:create', (_e, name: string, description?: string) =>
    libraryStore!.createPlaylist(name, description)
  )
  ipcMain.handle('playlist:delete', (_e, id: string) => libraryStore!.deletePlaylist(id))
  ipcMain.handle('playlist:add-item', (_e, playlistId: string, itemId: string) =>
    libraryStore!.addToPlaylist(playlistId, itemId)
  )
  ipcMain.handle('playlist:remove-item', (_e, playlistId: string, itemId: string) =>
    libraryStore!.removeFromPlaylist(playlistId, itemId)
  )

  // Downloader
  ipcMain.handle('downloader:list', () => downloadManager!.getTasks())

  ipcMain.handle(
    'downloader:analyze',
    async (_e, url: string, cookieBrowser: BrowserCookieSource) => {
      return downloadManager!.analyzeUrl(url, cookieBrowser)
    }
  )

  ipcMain.handle(
    'downloader:resolve-stream',
    async (_e, url: string, cookieBrowser: BrowserCookieSource) => {
      return downloadManager!.resolveDirectStreamUrl(url, cookieBrowser)
    }
  )

  ipcMain.handle('downloader:start', async (_e, req: DownloadRequest) => {
    return downloadManager!.startDownload(req)
  })

  ipcMain.handle('downloader:cancel', (_e, taskId: string) => {
    downloadManager!.cancelDownload(taskId)
    libraryStore!.setDownloads(downloadManager!.getTasks())
    return downloadManager!.getTasks()
  })

  ipcMain.handle('downloader:remove', (_e, taskId: string) => {
    const tasks = downloadManager!.removeTask(taskId)
    libraryStore!.setDownloads(tasks)
    return tasks
  })

  ipcMain.handle('downloader:clear-completed', () => {
    const tasks = downloadManager!.clearCompleted()
    libraryStore!.setDownloads(tasks)
    return tasks
  })

  // Voice Hub (AIWF 4 Offline Engines + Optional LAN iMac M4 Remote)
  const resolveHubSettings = (override?: Partial<VoiceHubSettings>): VoiceHubSettings => ({
    ...libraryStore!.getSettings().voiceHub,
    ...(override || {})
  })

  ipcMain.handle(
    'voicehub:health',
    async (_e, override?: Partial<VoiceHubSettings>, skipAutoStart?: boolean) => {
      return voiceHubManager!.getHealth(resolveHubSettings(override), Boolean(skipAutoStart))
    }
  )

  ipcMain.handle('voicehub:catalog', async (_e, override?: Partial<VoiceHubSettings>) => {
    return voiceHubManager!.getCatalog(resolveHubSettings(override))
  })

  ipcMain.handle('voicehub:local-token', async () => {
    return voiceHubManager!.getLocalTokenInfo(resolveHubSettings())
  })

  ipcMain.handle(
    'voicehub:preview',
    async (_e, voiceId: string, lang?: string, engine?: string) => {
      return voiceHubManager!.getPreviewFilePath(resolveHubSettings(), voiceId, lang, engine)
    }
  )

  ipcMain.handle('voicehub:synthesize', async (_e, req: VoiceHubSynthesizeRequest) => {
    return voiceHubManager!.startSynthesize(resolveHubSettings(), req)
  })

  ipcMain.handle('voicehub:job', async (_e, jobId: string) => {
    return voiceHubManager!.getJob(resolveHubSettings(), jobId)
  })

  ipcMain.handle('voicehub:cancel', async (_e, jobId: string) => {
    return voiceHubManager!.cancelJob(resolveHubSettings(), jobId)
  })

  ipcMain.handle('voicehub:history', async () => {
    return voiceHubManager!.getHistory(resolveHubSettings())
  })

  ipcMain.handle('voicehub:recipe', async (_e, req: VoiceHubSynthesizeRequest) => {
    return voiceHubManager!.buildRecipe(resolveHubSettings(), req)
  })

  ipcMain.handle(
    'voicehub:save-to-library',
    async (_e, audioUrlPath: string, suggestedName: string, autoImport = true) => {
      const settings = libraryStore!.getSettings()
      const savedPath = await voiceHubManager!.saveHubAudioToLocalDir(
        settings.voiceHub,
        audioUrlPath,
        suggestedName,
        settings.audioDownloadDir
      )
      let item = null
      if (autoImport) {
        item = await libraryStore!.addOrUpdateFile(savedPath)
        if (item) {
          mainWindow?.webContents.send('library:item-added', item)
        }
      }
      return { filePath: savedPath, item }
    }
  )

  ipcMain.handle('voicehub:open-voxa', async (_e, openGemini = false) => {
    const hubSettings = resolveHubSettings()
    if (hubSettings.mode === 'local') {
      await voiceHubManager!.ensureLocalRunning(hubSettings)
    }
    const targetUrl = voiceHubManager!.getExternalVoxaUrl(hubSettings, Boolean(openGemini))
    await shell.openExternal(targetUrl)
    return targetUrl
  })
}

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
}

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
})

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('aplayer:external-files', [filePath])
  } else {
    pendingOpenFiles.push(filePath)
  }
})

app.whenReady().then(async () => {
  const userDataDir = app.getPath('userData')
  libraryStore = new LibraryStore(userDataDir)

  // Ensure default download directories exist
  const settings = libraryStore.getSettings()
  await fs.promises.mkdir(settings.videoDownloadDir, { recursive: true }).catch(() => {})
  await fs.promises.mkdir(settings.audioDownloadDir, { recursive: true }).catch(() => {})

  mediaServer = await startMediaServer(path.join(userDataDir, 'cache'))
  voiceHubManager = new VoiceHubManager(path.join(userDataDir, 'cache'))

  downloadManager = new DownloadManager(libraryStore.getDownloads(), {
    offscreenFetcher: createOffscreenFetcher,
    onTaskUpdate: (task) => {
      libraryStore?.setDownloads(downloadManager!.getTasks())
      mainWindow?.webContents.send('downloader:task-updated', task)
    },
    onDownloadComplete: async (task) => {
      const autoImport = libraryStore?.getSettings().autoImportDownloads
      if (autoImport && task.outputFilePath && fs.existsSync(task.outputFilePath)) {
        const imported = await libraryStore!.addOrUpdateFile(task.outputFilePath, {
          isDownloaded: true,
          sourcePlatform: task.platform,
          sourceUrl: task.url
        })
        if (imported) {
          mainWindow?.webContents.send('library:item-added', imported)
        }
      }
    }
  })

  buildAppMenu()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('before-quit', async () => {
  downloadManager?.cancelAll()
  voiceHubManager?.dispose()
  libraryStore?.flushSync()
  if (mediaServer) {
    await mediaServer.stop()
    mediaServer = null
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
