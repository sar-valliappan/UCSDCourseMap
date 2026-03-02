import { ReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const nodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'CSE 11' } },
  { id: '2', position: { x: 200, y: 0 }, data: { label: 'CSE 12' } },
  { id: '3', position: { x: 100, y: 150 }, data: { label: 'CSE 15L' } },
]

const edges = [
  { id: 'e1-3', source: '1', target: '3' },
  { id: 'e2-3', source: '2', target: '3' },
]

export default function Graph() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView />
    </div>
  )
}
