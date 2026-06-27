import { useState, useCallback, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

/**
 * Generic async data fetcher hook
 * @param {Function} fetchFn - async function that returns axios response
 * @param {any[]} deps - dependency array
 */
export const useFetch = (fetchFn, deps = []) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchFn()
      if (mountedRef.current) {
        setData(res.data.data)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.response?.data?.message || 'Something went wrong')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => {
    mountedRef.current = true
    execute()
    return () => { mountedRef.current = false }
  }, [execute])

  return { data, loading, error, refetch: execute, setData }
}

/**
 * Hook for mutations (create/update/delete)
 */
export const useMutation = () => {
  const [loading, setLoading] = useState(false)

  const mutate = useCallback(async (fn, { onSuccess, onError, successMsg } = {}) => {
    setLoading(true)
    try {
      const res = await fn()
      if (successMsg) toast.success(successMsg)
      onSuccess?.(res.data)
      return res.data
    } catch (err) {
      const msg = err.response?.data?.message || 'Operation failed'
      toast.error(msg)
      onError?.(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, mutate }
}

/**
 * Pagination state hook
 */
export const usePagination = (initialLimit = 20) => {
  const [page, setPage] = useState(1)
  const [limit] = useState(initialLimit)

  const reset = () => setPage(1)

  return { page, limit, setPage, reset }
}

/**
 * Debounce hook for search inputs
 */
export const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])

  return debounced
}

/**
 * Download blob as file
 */
export const useDownload = () => {
  const [loading, setLoading] = useState(false)

  const download = useCallback(async (fn, filename) => {
    setLoading(true)
    try {
      const res = await fn()
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch {
      toast.error('Download failed')
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, download }
}

/**
 * Modal open/close state
 */
export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState(null)

  const open = (d = null) => { setData(d); setIsOpen(true) }
  const close = () => { setData(null); setIsOpen(false) }

  return { isOpen, data, open, close }
}