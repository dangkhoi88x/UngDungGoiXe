import { useEffect, useRef } from 'react'

/**
 * Đóng modal/dialog khi nhấn Escape (lắng nghe trên window để nhất quán khi focus trong input).
 */
export function useEscapeToClose(
  open: boolean,
  onClose: () => void,
  canClose = true,
) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open || !canClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, canClose])
}
