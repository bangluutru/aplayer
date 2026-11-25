import type { APlayerAPI } from './index'

declare global {
  interface Window {
    aplayerAPI: APlayerAPI
  }
}
