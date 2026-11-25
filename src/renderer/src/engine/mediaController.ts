export interface MediaControllerHooks {
  togglePlay: () => void
  seekTo: (seconds: number) => void
  seekRelative: (deltaSeconds: number) => void
  toggleFullscreen: () => void
  togglePiP: () => void
  captureScreenshot: () => void
}

let activeHooks: MediaControllerHooks | null = null

export const mediaController = {
  register(hooks: MediaControllerHooks): void {
    activeHooks = hooks
  },
  unregister(): void {
    activeHooks = null
  },
  togglePlay(): void {
    activeHooks?.togglePlay()
  },
  seekTo(seconds: number): void {
    activeHooks?.seekTo(seconds)
  },
  seekRelative(deltaSeconds: number): void {
    activeHooks?.seekRelative(deltaSeconds)
  },
  toggleFullscreen(): void {
    activeHooks?.toggleFullscreen()
  },
  togglePiP(): void {
    activeHooks?.togglePiP()
  },
  captureScreenshot(): void {
    activeHooks?.captureScreenshot()
  }
}
