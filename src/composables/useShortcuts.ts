import { onMounted, onBeforeUnmount, type Ref } from 'vue'

export interface ShortcutBindings {
  /** Toggle compare mode (original vs processed). */
  onToggleCompare: () => void
  /** Trigger a PNG download of the current canvas. */
  onDownload: () => void
  /** Undo the last configuration change. */
  onUndo: () => void
  /** Redo. */
  onRedo: () => void
  /** Apply the i-th preset (1-based). */
  onApplyPresetAt: (i: number) => void
  /** Decrement / increment display pixel size. */
  onPixelSizeDelta: (delta: number) => void
  /** Toggle dither stage. */
  onToggleDither: () => void
}

/**
 * Global keyboard shortcuts. Mounts a window-level keydown listener; cleans up
 * automatically when the host component unmounts. Disabled when the user is
 * typing into a text input / textarea / contenteditable element so shortcuts
 * don't fight with form fields.
 */
export function useShortcuts(bindings: ShortcutBindings) {
  function isTypingTarget(t: EventTarget | null): boolean {
    if (!(t instanceof HTMLElement)) return false
    const tag = t.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (t.isContentEditable) return true
    return false
  }

  function handler(e: KeyboardEvent) {
    // Always allow modifier-only shortcuts to fire (Cmd+S, Cmd+Z) even when
    // a text field is focused, since they're standard editor behaviours.
    const hasMod = e.metaKey || e.ctrlKey
    if (!hasMod && isTypingTarget(e.target)) return

    const key = e.key

    // Modifier shortcuts
    if (hasMod && !e.shiftKey && (key === 's' || key === 'S')) {
      e.preventDefault()
      bindings.onDownload()
      return
    }
    if (hasMod && !e.shiftKey && (key === 'z' || key === 'Z')) {
      e.preventDefault()
      bindings.onUndo()
      return
    }
    if (hasMod && e.shiftKey && (key === 'z' || key === 'Z')) {
      e.preventDefault()
      bindings.onRedo()
      return
    }

    // Non-modifier shortcuts
    if (e.altKey || e.ctrlKey || e.metaKey) return
    if (e.shiftKey) return

    if (key === ' ' || key === 'Spacebar') {
      e.preventDefault()
      bindings.onToggleCompare()
      return
    }
    if (key === 'd' || key === 'D') {
      e.preventDefault()
      bindings.onToggleDither()
      return
    }
    if (key === '[') {
      e.preventDefault()
      bindings.onPixelSizeDelta(-1)
      return
    }
    if (key === ']') {
      e.preventDefault()
      bindings.onPixelSizeDelta(1)
      return
    }
    // Number keys 1-9 → presets
    if (key >= '1' && key <= '9') {
      e.preventDefault()
      bindings.onApplyPresetAt(parseInt(key, 10))
      return
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onBeforeUnmount(() => window.removeEventListener('keydown', handler))
}

/**
 * Build a download trigger for a canvas element. Exported for reuse.
 */
export function downloadCanvas(canvas: HTMLCanvasElement | null, filename = 'pixel-art.png') {
  if (!canvas) return
  const a = document.createElement('a')
  a.download = filename
  a.href = canvas.toDataURL('image/png')
  a.click()
}
