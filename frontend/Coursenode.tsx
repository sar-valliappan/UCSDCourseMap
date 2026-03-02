import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { NodeData } from './useLayout'

function CourseNode({ data }: NodeProps) {
  const d = data as NodeData
  return (
    <div
      style={{
        background: d.isRoot
          ? '#0f172a'
          : d.isCycle
          ? '#1e1b2e'
          : '#0f1923',
        border: d.isRoot
          ? '1.5px solid #22d3ee'
          : d.isCycle
          ? '1px solid #6366f1'
          : '1px solid #1e3a5f',
        borderRadius: 6,
        padding: '8px 14px',
        minWidth: 120,
        textAlign: 'center',
        cursor: 'default',
        boxShadow: d.isRoot ? '0 0 12px rgba(34,211,238,0.2)' : 'none',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          fontWeight: d.isRoot ? 500 : 400,
          color: d.isRoot ? '#22d3ee' : d.isCycle ? '#818cf8' : '#94a3b8',
          letterSpacing: '0.04em',
        }}
      >
        {d.label}
        {d.isCycle && <span style={{ color: '#6366f1', marginLeft: 4 }}>↺</span>}
      </span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

export default memo(CourseNode)