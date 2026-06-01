/**
 * localStorage helpers used by usePipeline and presets.
 *
 * Design:
 * - All keys are namespaced with `millenia:` to avoid colliding with anything else.
 * - loadJSON swallows errors (corrupt JSON, quota, SSR) and returns the default.
 * - saveDebounced coalesces bursts (e.g. dragging a slider) into a single write.
 * - Storage is best-effort: never throws to callers.
 */

const PREFIX = 'millenia:'

export const STORAGE_KEYS = {
  customPalettes: `${PREFIX}customPalettes`,
  pipelineState: `${PREFIX}pipelineState`,
  userPresets: `${PREFIX}userPresets`,
} as const

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // Quota exceeded or storage disabled — fail silently.
  }
}

export function saveDebounced(key: string, data: unknown, delay = 400): void {
  const w = window as Window & { __milleniaTimers?: Record<string, ReturnType<typeof setTimeout>> }
  if (!w.__milleniaTimers) w.__milleniaTimers = {}
  if (w.__milleniaTimers[key]) clearTimeout(w.__milleniaTimers[key]!)
  w.__milleniaTimers[key] = setTimeout(() => saveJSON(key, data), delay)
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
