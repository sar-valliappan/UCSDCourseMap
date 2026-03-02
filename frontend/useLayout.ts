import { useEffect, useState } from 'react'
import { MarkerType } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import dagre from '@dagrejs/dagre'

const NODE_WIDTH = 140
const NODE_HEIGHT = 40
const GATE_WIDTH = 52
const GATE_HEIGHT = 28
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

function nodeSize(type: string | undefined) {
  return type === 'orNode' || type === 'andNode'
    ? { w: GATE_WIDTH, h: GATE_HEIGHT }
    : { w: NODE_WIDTH, h: NODE_HEIGHT }
}

function applyDagre(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 120, ranker: 'longest-path' })

  for (const node of nodes) {
    const { w, h } = nodeSize(node.type)
    g.setNode(node.id, { width: w, height: h })
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const { x, y } = g.node(node.id)
    const { w, h } = nodeSize(node.type)
    return { ...node, position: { x: x - w / 2, y: y - h / 2 } }
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

  const groups = tree.prereqs
  if (groups.length === 0) return

  // Multiple groups → AND gate sits between groups and the course
  let connectTo = targetId
  if (groups.length > 1) {
    const andId = `and__${targetId}`
    if (!nodeSet.has(andId)) {
      nodeSet.set(andId, {
        id: andId,
        type: 'andNode',
        position: { x: 0, y: 0 },
        data: { label: 'AND' },
      })
    }
    if (!edgeSet.has(`${andId}->${targetId}`)) {
      edgeSet.set(`${andId}->${targetId}`, makeEdge(andId, targetId))
    }
    connectTo = andId
  }

  for (const { sequence, options } of groups) {
    if (options.length === 1) {
      // Single option: direct edge to connectTo
      const sourceId = options[0].course_id
      const edgeId = `${sourceId}->${connectTo}`
      if (!edgeSet.has(edgeId)) edgeSet.set(edgeId, makeEdge(sourceId, connectTo))
      collectGraph(options[0], nodeSet, edgeSet, rootId)
    } else {
      // Multiple options: OR gate fans in, then connects to connectTo
      const orId = `or__${targetId}__${sequence}`
      if (!nodeSet.has(orId)) {
        nodeSet.set(orId, {
          id: orId,
          type: 'orNode',
          position: { x: 0, y: 0 },
          data: { label: 'OR' },
        })
      }
      if (!edgeSet.has(`${orId}->${connectTo}`)) {
        edgeSet.set(`${orId}->${connectTo}`, makeEdge(orId, connectTo))
      }
      for (const option of options) {
        const sourceId = option.course_id
        const edgeId = `${sourceId}->${orId}`
        if (!edgeSet.has(edgeId)) edgeSet.set(edgeId, makeEdge(sourceId, orId))
        collectGraph(option, nodeSet, edgeSet, rootId)
      }
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
