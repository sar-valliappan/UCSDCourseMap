import { useEffect, useState } from 'react'

const API_BASE = 'http://localhost:8000'

async function fetchPrereqs(courseId: string) {
  const res = await fetch(`${API_BASE}/tree/${courseId}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export function useGraph(courseId: string) {
  const [tree, setTree] = useState<unknown>(null)

  useEffect(() => {
    fetchPrereqs(courseId)
      .then((data) => {
        console.log(data)
        setTree(data)
      })
      .catch(console.error)
  }, [courseId])

  return tree
}
