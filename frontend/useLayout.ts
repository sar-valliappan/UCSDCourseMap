import { useEffect, useMemo, useState } from 'react'
import { MarkerType } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import courseData from './courseData.json'

const NODE_WIDTH = 140
const NODE_HEIGHT = 40
const GATE_WIDTH = 52
const GATE_HEIGHT = 28

// Static data from build.py
type RawGroup = { sequence: number; options: string[] }
const COURSES = courseData.courses as Record<string, RawGroup[]>
const UNLOCKS = courseData.unlocks as Record<string, string[]>
export const COURSE_IDS: string[] = courseData.courseIds as string[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DESCRIPTIONS: Record<string, string> = (courseData as any).descriptions ?? {}

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

// unlockData maps courseId -> its direct unlocks (populated lazily as nodes are expanded)
export type UnlockData = Map<string, string[]>

// Build a full recursive prereq tree from static data
function buildTreeFromData(courseId: string, visited: Set<string>): PrereqTreeNode {
  if (visited.has(courseId)) {
    return { course_id: courseId, prereqs: [], note: 'cycle' }
  }
  const next = new Set([...visited, courseId])
  const groups = COURSES[courseId] ?? []
  return {
    course_id: courseId,
    prereqs: groups.map(g => ({
      sequence: g.sequence,
      options: g.options.map(optId => buildTreeFromData(optId, next)),
    })),
  }
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
  const directUnlocks = unlockData.get(courseId) ?? []
  const isExpanded = expandedNodes.has(pathId)
  // Use static data to know immediately whether a course has unlocks
  const hasUnlocks = (UNLOCKS[courseId]?.length ?? 0) > 0
  const expandable = !isCycle && !isExpanded && hasUnlocks
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

  if (isCycle || !isExpanded || directUnlocks.length === 0) return

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

export function useLayout(courseId: string) {
  return useMemo(() => {
    if (!(courseId in COURSES)) {
      return { tree: null, loading: false, error: `Course ${courseId} not found` }
    }
    return { tree: buildTreeFromData(courseId, new Set()), loading: false, error: null }
  }, [courseId])
}

export function useUnlocksLayout(courseId: string) {
  const [unlockData, setUnlockData] = useState<UnlockData>(
    () => new Map([[courseId, UNLOCKS[courseId] ?? []]]),
  )

  useEffect(() => {
    setUnlockData(new Map([[courseId, UNLOCKS[courseId] ?? []]]))
  }, [courseId])

  function fetchUnlocks(subCourseId: string) {
    if (unlockData.has(subCourseId)) return
    setUnlockData(prev => new Map([...prev, [subCourseId, UNLOCKS[subCourseId] ?? []]]))
  }

  const error = courseId in COURSES ? null : `Course ${courseId} not found`
  return { unlockData, loading: false, error, fetchUnlocks }
}
