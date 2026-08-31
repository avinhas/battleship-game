import { useCallback, useEffect, useRef } from 'react'

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

/**
 * Modal dialog plumbing: focus the dialog on open, keep Tab inside it, close on
 * Escape, and hand focus back to whatever opened it.
 */
export function useDialog(onDismiss: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = ref.current
    const active = document.activeElement
    // Ignore re-entry (StrictMode remounts the effect): the opener is never inside the dialog.
    if (active instanceof HTMLElement && !dialog?.contains(active)) opener.current = active
    dialog?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    return () => {
      const target = opener.current
      // Next frame: the page has left `inert`, and a still-connected dialog means
      // this was a remount rather than a real close.
      requestAnimationFrame(() => {
        if (dialog?.isConnected) return
        target?.focus()
      })
    }
  }, [])

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onDismiss()
        return
      }
      if (event.key !== 'Tab') {
        // Gameplay shortcuts listen on window; keep them out of the dialog.
        event.stopPropagation()
        return
      }
      const focusable = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !ref.current?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onDismiss],
  )

  return { ref, onKeyDown }
}
