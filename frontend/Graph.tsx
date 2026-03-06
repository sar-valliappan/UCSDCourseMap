import { useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, Controls, Background, BackgroundVariant, useReactFlow } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CourseNode from './CourseNode'
import GateNode from './GateNode'
import PrefixNode from './PrefixNode'
import { buildLazyGraph, buildLazyUnlocksGraph, DESCRIPTIONS } from './useLayout'
import type { PrereqTreeNode, UnlockData, NodeData } from './useLayout'

const nodeTypes = { courseNode: CourseNode, orNode: GateNode, andNode: GateNode, prefixNode: PrefixNode }

function AutoFit({ nodes }: { nodes: Node[] }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    if (nodes.length > 0) fitView({ padding: 0.2, duration: 300 })
  }, [nodes, fitView])
  return null
}

interface Props {
  tree: PrereqTreeNode | null
  unlockData: UnlockData
  mode: 'prereqs' | 'unlocks'
  activeCourse: string
  expandedNodes: Set<string>
  taken: Set<string>
  onNodeExpand: (nodeId: string) => void
  onNodeCollapse: (nodeId: string) => void
  onCourseSelect: (courseId: string) => void
  onToggleTaken: (courseId: string) => void
}

export default function Graph({ tree, unlockData, mode, activeCourse, expandedNodes, taken, onNodeExpand, onNodeCollapse, onCourseSelect, onToggleTaken }: Props) {
  const { nodes, edges } = useMemo(() => {
    if (mode === 'prereqs' && tree) return buildLazyGraph(tree, expandedNodes, taken)
    if (mode === 'unlocks') return buildLazyUnlocksGraph(activeCourse, unlockData, expandedNodes, taken)
    return { nodes: [], edges: [] }
  }, [tree, unlockData, mode, activeCourse, expandedNodes, taken])

  const [tooltip, setTooltip] = useState<{ courseId: string; x: number; y: number } | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showTooltip(courseId: string, x: number, y: number) {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setTooltip({ courseId, x, y })
  }

  function scheduleHide() {
    hideTimer.current = setTimeout(() => setTooltip(null), 120)
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
      style={{ background: '#060d18' }}
      onNodeClick={(_, node) => {
        if (node.type !== 'courseNode') return
        const d = node.data as NodeData
        if (!d.isRoot) onToggleTaken(d.label as string)
      }}
      onNodeDoubleClick={(_, node) => {
        if (node.type !== 'courseNode' && node.type !== 'prefixNode') return
        const d = node.data as NodeData
        if (d.expandable) onNodeExpand(node.id)
        else if (d.collapsible) onNodeCollapse(node.id)
      }}
      onNodeMouseEnter={(evt, node) => {
        if (node.type !== 'courseNode') return
        showTooltip((node.data as NodeData).label, evt.clientX, evt.clientY)
      }}
      onNodeMouseLeave={() => scheduleHide()}
    >
      <AutoFit nodes={nodes} />
      <Background
        variant={BackgroundVariant.Dots}
        gap={24}
        size={1}
        color="#1e3a5f"
      />
      <Controls
        showInteractive={false}
        style={{
          background: '#0f1923',
          border: '1px solid #1e3a5f',
          borderRadius: 6,
        }}
      />
    </ReactFlow>
    {tooltip && (
      <div
        onClick={() => { onCourseSelect(tooltip.courseId); setTooltip(null) }}
        onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current) }}
        onMouseLeave={() => scheduleHide()}
        style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y - 12,
          transform: 'translate(-50%, -100%)',
          zIndex: 100,
          background: '#0f1923',
          border: '1px solid #1e3a5f',
          borderRadius: 8,
          padding: '10px 16px',
          maxWidth: 360,
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ color: '#38bdf8', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
          {tooltip.courseId}
        </div>
        {DESCRIPTIONS[tooltip.courseId] && (
          <p style={{
            color: '#94a3b8',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            margin: '6px 0 0',
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {DESCRIPTIONS[tooltip.courseId]}
          </p>
        )}
        <div style={{ color: '#334f6e', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, marginTop: 6 }}>
          click to navigate →
        </div>
      </div>
    )}
    </div>
  )
}
