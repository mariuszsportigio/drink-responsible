import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useLockBodyScroll } from '../lib/useLockBodyScroll'

export function Modal({
  title,
  icon,
  onClose,
  children,
}: {
  title: string
  icon?: ReactNode
  onClose?: () => void
  children: ReactNode
}) {
  useLockBodyScroll()
  // Portal to <body> so a transformed ancestor (e.g. the animated .screen-in
  // wrapper) can't trap position:fixed in its stacking context — otherwise the
  // TabBar would render over the sheet and cut off its bottom.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 fade-in" onClick={onClose} />
      <div className="sheet-in relative w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-card border-t border-line p-5 pb-[max(2rem,env(safe-area-inset-bottom))] card-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2.5 text-lg font-bold">
            {icon && <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-card2 border border-line">{icon}</span>}
            {title}
          </h3>
          {onClose && (
            <button
              aria-label="zamknij"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-card2 border border-line text-muted"
              onClick={onClose}
            >
              <X size={15} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
