import { execFile } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface ResolvedBinaries {
  ffmpegPath: string | null
  ffmpegVersion: string | null
  ffprobePath: string | null
  ytDlpPath: string | null
  ytDlpVersion: string | null
  denoPath: string | null
}

const EXTRA_SEARCH_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/opt/local/bin',
  path.join(os.homedir(), '.local/bin'),
  path.join(os.homedir(), '.deno/bin'),
  path.join(os.homedir(), 'bin'),
  '/usr/bin',
  '/bin'
]

export function getAugmentedEnv(): NodeJS.ProcessEnv {
  const existing = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  const merged = Array.from(new Set([...EXTRA_SEARCH_PATHS, ...existing]))
  return {
    ...process.env,
    PATH: merged.join(path.delimiter)
  }
}

export function resolveExecutable(name: string): string | null {
  const envPaths = (process.env.PATH || '').split(path.delimiter).filter(Boolean)
  const searchDirs = Array.from(new Set([...EXTRA_SEARCH_PATHS, ...envPaths]))

  for (const dir of searchDirs) {
    const candidate = path.join(dir, name)
    try {
      fs.accessSync(candidate, fs.constants.X_OK)
      const stat = fs.statSync(candidate)
      if (stat.isFile()) {
        return candidate
      }
    } catch {
      // keep searching
    }
  }
  return null
}

async function readVersion(binPath: string | null, args: string[]): Promise<string | null> {
  if (!binPath) return null
  try {
    const { stdout } = await execFileAsync(binPath, args, {
      timeout: 5000,
      env: getAugmentedEnv()
    })
    const firstLine = stdout.split('\n')[0]?.trim() || ''
    return firstLine || null
  } catch {
    return null
  }
}

let cachedBinaries: ResolvedBinaries | null = null

export async function getBinaries(forceRefresh = false): Promise<ResolvedBinaries> {
  if (cachedBinaries && !forceRefresh) {
    return cachedBinaries
  }

  const ffmpegPath = resolveExecutable('ffmpeg')
  const ffprobePath = resolveExecutable('ffprobe')
  const ytDlpPath = resolveExecutable('yt-dlp')
  const denoPath = resolveExecutable('deno')

  const [ffmpegVersionRaw, ytDlpVersion] = await Promise.all([
    readVersion(ffmpegPath, ['-version']),
    readVersion(ytDlpPath, ['--version'])
  ])

  const ffmpegVersion = ffmpegVersionRaw
    ? ffmpegVersionRaw.replace(/^ffmpeg version\s+/i, '').split(' ')[0]
    : null

  cachedBinaries = {
    ffmpegPath,
    ffmpegVersion,
    ffprobePath,
    ytDlpPath,
    ytDlpVersion,
    denoPath
  }

  return cachedBinaries
}
