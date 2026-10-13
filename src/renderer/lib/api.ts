/**
 * غلاف الواجهة البرمجية (Type-safe client API wrapper)
 * للاتصال بالعملية الرئيسية عبر contextBridge
 */

import type { ElectronAPI } from '../../preload';

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export const api = typeof window !== 'undefined' ? window.electron : ({} as ElectronAPI);
