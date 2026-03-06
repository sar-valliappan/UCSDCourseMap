import { useState, useCallback } from 'react'

export function useTaken() {
  const [taken, setTaken] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('taken') ?? '[]'))
    } catch {
      return new Set()
    }
  })

  const toggle = useCallback((courseId: string) => {
    setTaken(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      localStorage.setItem('taken', JSON.stringify([...next]))
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setTaken(new Set())
    localStorage.removeItem('taken')
  }, [])

  return { taken, toggle, clearAll }
}
