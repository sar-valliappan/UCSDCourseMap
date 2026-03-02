import { useEffect, useState } from 'react'

const API_BASE = 'http://localhost:8000'

// ---- types ----

interface PrereqGroup {
  sequence: number
  options: CourseNode[]
}

export interface CourseNode {
  course_id: string
  prereqs: PrereqGroup[]
  note?: string
}

// ---- data fetching ----

async function fetchPrereqs(courseId: string): Promise<CourseNode> {
  const res = await fetch(`${API_BASE}/tree/${courseId}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export function useGraph(courseId: string) {
  const [tree, setTree] = useState<CourseNode | null>(null)

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

// ---- tree view ----

function TreeNode({ node }: { node: CourseNode }) {
  return (
    <li>
      <strong>{node.course_id}</strong>
      {node.note && <em> ({node.note})</em>}
      {node.prereqs.length > 0 && (
        <ul>
          {node.prereqs.map((group) => (
            <li key={group.sequence}>
              {group.options.length === 1 ? (
                <TreeNode node={group.options[0]} />
              ) : (
                <>
                  <em>pick one of:</em>
                  <ul>
                    {group.options.map((opt) => (
                      <TreeNode key={opt.course_id} node={opt} />
                    ))}
                  </ul>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function TreeView({ tree }: { tree: CourseNode }) {
  return (
    <ul>
      <TreeNode node={tree} />
    </ul>
  )
}
