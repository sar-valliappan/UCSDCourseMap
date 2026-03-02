import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

function GateNode({ data }: NodeProps) {
  const label = (data as { label: string }).label
  const isOr = label === 'OR'
  return (
    <div
      style={{
        background: isOr ? '#2d1b69' : '#0c2340',
        border: `1px solid ${isOr ? '#7c3aed' : '#0369a1'}`,
        borderRadius: 4,
        padding: '3px 8px',
        fontSize: 10,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 700,
        color: isOr ? '#a78bfa' : '#38bdf8',
        letterSpacing: '0.1em',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      {label}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

export default memo(GateNode)
