import { useEffect, useState } from 'react'
import { MarkerType } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import dagre from '@dagrejs/dagre'

const NODE_WIDTH = 140
const NODE_HEIGHT = 40
const API_BASE = 'http://localhost:8000'

export interface NodeData {
  label: string
  isRoot?: boolean
  isCycle?: boolean
  [key: string]: unknown
}

export interface PrereqTreeNode {
  course_id: string
  prereqs: Array<{
    sequence: number
    options: PrereqTreeNode[]
  }>
  note?: string
}

function applyDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 80 })

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const { x, y } = g.node(node.id)
    return { ...node, position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 } }
  })
}

function makeEdge(sourceId: string, targetId: string): Edge {
  return {
    id: `${sourceId}->${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'straight',
    markerEnd: { type: MarkerType.Arrow },
  }
}

function collectGraph(
  tree: PrereqTreeNode,
  nodeSet: Map<string, Node>,
  edgeSet: Map<string, Edge>,
  rootId: string,
) {
  const targetId = tree.course_id

  if (!nodeSet.has(targetId)) {
    nodeSet.set(targetId, {
      id: targetId,
      type: 'courseNode',
      position: { x: 0, y: 0 },
      data: { label: targetId, isRoot: targetId === rootId, isCycle: tree.note === 'cycle' },
    })
  }

  for (const group of tree.prereqs) {
    for (const option of group.options) {
      const sourceId = option.course_id
      const edgeId = `${sourceId}->${targetId}`
      if (!edgeSet.has(edgeId)) {
        edgeSet.set(edgeId, makeEdge(sourceId, targetId))
      }
      collectGraph(option, nodeSet, edgeSet, rootId)
    }
  }
}

export function buildPrereqGraph(tree: PrereqTreeNode): { nodes: Node[]; edges: Edge[] } {
  const nodeSet = new Map<string, Node>()
  const edgeSet = new Map<string, Edge>()
  collectGraph(tree, nodeSet, edgeSet, tree.course_id)
  const rawNodes = [...nodeSet.values()]
  const rawEdges = [...edgeSet.values()]
  return { nodes: applyDagre(rawNodes, rawEdges), edges: rawEdges }
}

export function buildUnlocksGraph(
  activeCourse: string,
  unlocks: string[],
): { nodes: Node[]; edges: Edge[] } {
  const nodeSet = new Map<string, Node>()
  const edgeSet = new Map<string, Edge>()

  nodeSet.set(activeCourse, {
    id: activeCourse,
    type: 'courseNode',
    position: { x: 0, y: 0 },
    data: { label: activeCourse, isRoot: true },
  })

  for (const u of unlocks) {
    nodeSet.set(u, {
      id: u,
      type: 'courseNode',
      position: { x: 0, y: 0 },
      data: { label: u },
    })
    edgeSet.set(`${activeCourse}->${u}`, makeEdge(activeCourse, u))
  }

  const rawNodes = [...nodeSet.values()]
  const rawEdges = [...edgeSet.values()]
  return { nodes: applyDagre(rawNodes, rawEdges), edges: rawEdges }
}

export function useLayout(courseId: string) {
  const [tree, setTree] = useState<PrereqTreeNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setTree(null)

    fetch(`${API_BASE}/tree/${courseId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json() as Promise<PrereqTreeNode>
      })
      .then(setTree)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [courseId])

  return { tree, loading, error }
}
