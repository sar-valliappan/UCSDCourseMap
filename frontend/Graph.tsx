import { useMemo } from 'react'
import { ReactFlow, Controls, Background, BackgroundVariant, MiniMap } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import CourseNode from './Coursenode'
import { buildPrereqGraph, buildUnlocksGraph } from './useLayout'
import type { PrereqTreeNode } from './useLayout'

const nodeTypes = { courseNode: CourseNode }

interface Props {
  tree: PrereqTreeNode | null
  unlocks: string[]
  mode: 'prereqs' | 'unlocks'
  activeCourse: string
}

export default function Graph({ tree, unlocks, mode, activeCourse }: Props) {
  const { nodes, edges } = useMemo(() => {
    if (mode === 'prereqs' && tree) return buildPrereqGraph(tree)
    if (mode === 'unlocks' && activeCourse) return buildUnlocksGraph(activeCourse, unlocks)
    return { nodes: [], edges: [] }
  }, [tree, unlocks, mode, activeCourse])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      proOptions={{ hideAttribution: true }}
      style={{ background: '#060d18' }}
    >
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