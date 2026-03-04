import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { NodeData } from './useLayout'

function PrefixNode({ data }: NodeProps) {
  const d = data as NodeData
  return (
    <div
      style={{
        background: '#0a1628',
        border: `1px solid ${d.collapsible ? '#1e4a7a' : '#1a3050'}`,
        borderRadius: 6,
        padding: '5px 12px',
        minWidth: 100,
        textAlign: 'center',
        cursor: d.expandable || d.collapsible ? 'pointer' : 'default',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#4a9eca', letterSpacing: '0.04em' }}>
        {d.label}
        <span style={{ color: '#334f6e', marginLeft: 6, fontSize: 10 }}>
          ({d.count}) {d.expandable ? '+' : '−'}
        </span>
      </span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

export default memo(PrefixNode)
