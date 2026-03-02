import { useEffect, useMemo, useState } from 'react'
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
  expandable?: boolean
  collapsible?: boolean
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

// unlockData maps courseId -> direct unlocks fetched from the API.
// Absence from the map means "not yet fetched".
export type UnlockData = Map<string, string[]>

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

// pathId is unique per tree position; course_id is just the display label.
// This means the same course appearing in multiple branches gets its own node
// in each branch, giving a true layer-by-layer tree layout.
function collectGraph(
  tree: PrereqTreeNode,
  nodes: Node[],
  edges: Edge[],
  rootId: string,
  pathId: string,
) {
  nodes.push({
    id: pathId,
    type: 'courseNode',
    position: { x: 0, y: 0 },
    data: { label: tree.course_id, isRoot: pathId === rootId, isCycle: tree.note === 'cycle' },
  })

  const groups = tree.prereqs
  if (groups.length === 0) return

  // Multiple groups → AND gate between groups and this node
  let connectTo = pathId
  if (groups.length > 1) {
    const andId = `${pathId}::and`
    nodes.push({ id: andId, type: 'andNode', position: { x: 0, y: 0 }, data: { label: 'AND' } })
    edges.push(makeEdge(andId, pathId))
    connectTo = andId
  }

  for (const { sequence, options } of groups) {
    if (options.length === 1) {
      const childPath = `${pathId}::${options[0].course_id}`
      edges.push(makeEdge(childPath, connectTo))
      collectGraph(options[0], nodes, edges, rootId, childPath)
    } else {
      const orId = `${pathId}::or${sequence}`
      nodes.push({ id: orId, type: 'orNode', position: { x: 0, y: 0 }, data: { label: 'OR' } })
      edges.push(makeEdge(orId, connectTo))
      for (const option of options) {
        const childPath = `${pathId}::or${sequence}::${option.course_id}`
        edges.push(makeEdge(childPath, orId))
        collectGraph(option, nodes, edges, rootId, childPath)
      }
    }
  }
}

export function buildPrereqGraph(tree: PrereqTreeNode): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  collectGraph(tree, nodes, edges, tree.course_id, tree.course_id)
  return { nodes: applyDagre(nodes, edges), edges }
}

function collectLazyGraph(
  tree: PrereqTreeNode,
  nodes: Node[],
  edges: Edge[],
  rootId: string,
  pathId: string,
  expandedNodes: Set<string>,
) {
  const isExpanded = expandedNodes.has(pathId)
  const hasPrereqs = tree.prereqs.length > 0 && tree.note !== 'cycle'

  nodes.push({
    id: pathId,
    type: 'courseNode',
    position: { x: 0, y: 0 },
    data: {
      label: tree.course_id,
      isRoot: pathId === rootId,
      isCycle: tree.note === 'cycle',
      expandable: hasPrereqs && !isExpanded,
      collapsible: hasPrereqs && isExpanded && pathId !== rootId,
    },
  })

  if (!isExpanded || !hasPrereqs) return

  const groups = tree.prereqs
  let connectTo = pathId
  if (groups.length > 1) {
    const andId = `${pathId}::and`
    nodes.push({ id: andId, type: 'andNode', position: { x: 0, y: 0 }, data: { label: 'AND' } })
    edges.push(makeEdge(andId, pathId))
    connectTo = andId
  }

  for (const { sequence, options } of groups) {
    if (options.length === 1) {
      const childPath = `${pathId}::${options[0].course_id}`
      edges.push(makeEdge(childPath, connectTo))
      collectLazyGraph(options[0], nodes, edges, rootId, childPath, expandedNodes)
    } else {
      const orId = `${pathId}::or${sequence}`
      nodes.push({ id: orId, type: 'orNode', position: { x: 0, y: 0 }, data: { label: 'OR' } })
      edges.push(makeEdge(orId, connectTo))
      for (const option of options) {
        const childPath = `${pathId}::or${sequence}::${option.course_id}`
        edges.push(makeEdge(childPath, orId))
        collectLazyGraph(option, nodes, edges, rootId, childPath, expandedNodes)
      }
    }
  }
}

export function buildLazyGraph(
  tree: PrereqTreeNode,
  expandedNodes: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  collectLazyGraph(tree, nodes, edges, tree.course_id, tree.course_id, expandedNodes)
  return { nodes: applyDagre(nodes, edges), edges }
}

function collectLazyUnlocksGraph(
  courseId: string,
  unlockData: UnlockData,
  nodes: Node[],
  edges: Edge[],
  rootPathId: string,
  pathId: string,
  expandedNodes: Set<string>,
  visitedCourses: Set<string>,
) {
  const isCycle = visitedCourses.has(courseId)
  const fetched = unlockData.has(courseId)
  const directUnlocks = unlockData.get(courseId) ?? []
  const isExpanded = expandedNodes.has(pathId)
  const hasUnlocks = directUnlocks.length > 0
  // Show + if not expanded and (not yet fetched, or has known unlocks)
  const expandable = !isCycle && !isExpanded && (!fetched || hasUnlocks)
  const collapsible = !isCycle && isExpanded && pathId !== rootPathId

  nodes.push({
    id: pathId,
    type: 'courseNode',
    position: { x: 0, y: 0 },
    data: {
      label: courseId,
      isRoot: pathId === rootPathId,
      isCycle,
      expandable,
      collapsible,
    },
  })

  if (isCycle || !isExpanded || !fetched || !hasUnlocks) return

  const nextVisited = new Set([...visitedCourses, courseId])
  for (const childId of directUnlocks) {
    const childPath = `${pathId}::${childId}`
    edges.push(makeEdge(pathId, childPath))
    collectLazyUnlocksGraph(childId, unlockData, nodes, edges, rootPathId, childPath, expandedNodes, nextVisited)
  }
}

export function buildLazyUnlocksGraph(
  rootId: string,
  unlockData: UnlockData,
  expandedNodes: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  collectLazyUnlocksGraph(rootId, unlockData, nodes, edges, rootId, rootId, expandedNodes, new Set())
  return { nodes: applyDagre(nodes, edges), edges }
}

export function useUnlocksLayout(courseId: string) {
  const [unlockData, setUnlockData] = useState<UnlockData>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUnlockData(new Map())
    setError(null)
    setLoading(true)
    fetch(`${API_BASE}/unlocks/${courseId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error((body as { detail?: string }).detail ?? `${r.status} ${r.statusText}`)
        }
        return r.json() as Promise<{ course_id: string; unlocks: string[] }>
      })
      .then((data) => setUnlockData(new Map([[courseId, data.unlocks]])))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [courseId])

  function fetchUnlocks(subCourseId: string) {
    if (unlockData.has(subCourseId)) return
    fetch(`${API_BASE}/unlocks/${subCourseId}`)
      .then((r) => r.json() as Promise<{ course_id: string; unlocks: string[] }>)
      .then((data) =>
        setUnlockData((prev) => new Map([...prev, [subCourseId, data.unlocks]])),
      )
      .catch(() => {/* swallow sub-fetch errors */})
  }

  return { unlockData, loading, error, fetchUnlocks }
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
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}))
          throw new Error((body as { detail?: string }).detail ?? `${r.status} ${r.statusText}`)
        }
        return r.json() as Promise<PrereqTreeNode>
      })
      .then(setTree)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [courseId])

  return { tree, loading, error }
}
