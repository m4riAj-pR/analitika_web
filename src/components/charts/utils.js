import { useLayoutEffect, useRef, useState } from 'react'

/** Paleta categórica validada (CVD, fondo blanco) en orden fijo: violeta de marca, naranja, aguamarina. */
export const SERIES = ['#6d28d9', '#eb6834', '#1baf7a']

/** Ancho del contenedor, actualizado con ResizeObserver para gráficos responsivos. */
export function useElementWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return undefined
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}
