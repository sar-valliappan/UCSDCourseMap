import { useEffect, useMemo } from 'react'
import { ReactFlow, Controls, Background, BackgroundVariant, useReactFlow } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CourseNode from './Coursenode'
import GateNode from './GateNode'
import { buildLazyGraph, buildUnlocksGraph } from './useLayout'
import type { PrereqTreeNode, NodeData } from './useLayout'

const nodeTypes = { courseNode: CourseNode, orNode: GateNode, andNode: GateNode }

function AutoFit({ nodes }: { nodes: Node[] }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    if (nodes.length > 0) fitView({ padding: 0.2, duration: 300 })
  }, [nodes, fitView])
  return null
}

interface Props {
  tree: PrereqTreeNode | null
  unlocks: string[]
  mode: 'prereqs' | 'unlocks'
  activeCourse: string
  expandedNodes: Set<string>
  onNodeExpand: (nodeId: string) => void
}

export default function Graph({ tree, unlocks, mode, activeCourse, expandedNodes, onNodeExpand }: Props) {
  const { nodes, edges } = useMemo(() => {
    if (mode === 'prereqs' && tree) return buildLazyGraph(tree, expandedNodes)
    if (mode === 'unlocks' && activeCourse) return buildUnlocksGraph(activeCourse, unlocks)
    return { nodes: [], edges: [] }
  }, [tree, unlocks, mode, activeCourse, expandedNodes])

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
        if (node.type === 'courseNode' && (node.data as NodeData).expandable) {
          onNodeExpand(node.id)
        }
      }}
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
    </div>
  )
}