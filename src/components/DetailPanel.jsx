import { useEffect, useRef } from 'react'

/**
 * DetailPanel — Panel deslizable desde la derecha.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: Function
 *  - title: string
 *  - children: ReactNode
 */
export default function DetailPanel({ isOpen, onClose, title, children }) {
  const overlayRef = useRef(null)

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Bloquear scroll del body cuando el panel está abierto
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <>
      {/* Overlay — clic fuera cierra */}
      <div
        ref={overlayRef}
        className={`detail-panel-overlay${isOpen ? ' open' : ''}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Panel deslizable */}
      <aside
        className={`detail-panel${isOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Detalle'}
        id="detail-panel"
      >
        {/* Header */}
        <div className="detail-panel-header">
          <span className="detail-panel-title">{title}</span>
          <button
            className="btn-ghost"
            onClick={onClose}
            aria-label="Cerrar panel"
            id="detail-panel-close-btn"
          >
            ✕
          </button>
        </div>

        {/* Body — children vienen del rol correspondiente */}
        <div className="detail-panel-body">
          {isOpen && children}
        </div>
      </aside>
    </>
  )
}
