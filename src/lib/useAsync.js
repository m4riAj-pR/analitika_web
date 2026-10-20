import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Ejecuta una función asíncrona y expone { data, loading, error, reload }.
 * - Si cambian las dependencias, se descartan los datos anteriores.
 * - `reload()` conserva los datos visibles mientras recarga (sin saltos de diseño).
 */
export default function useAsync(fn, deps = []) {
  const fnRef = useRef(fn)
  useLayoutEffect(() => { fnRef.current = fn })

  const [nonce, setNonce] = useState(0)
  const [result, setResult] = useState({ depsKey: null, runKey: null, data: null, error: null })
  const depsKey = JSON.stringify(deps)
  const runKey = `${depsKey}#${nonce}`

  useEffect(() => {
    let alive = true
    fnRef.current().then(
      data => { if (alive) setResult({ depsKey, runKey, data, error: null }) },
      error => { if (alive) setResult(prev => ({ depsKey, runKey, data: prev.depsKey === depsKey ? prev.data : null, error })) },
    )
    return () => { alive = false }
  }, [depsKey, runKey])

  const loading = result.runKey !== runKey
  return {
    data: result.depsKey === depsKey ? result.data : null,
    error: loading ? null : result.error,
    loading,
    reload: () => setNonce(n => n + 1),
  }
}
