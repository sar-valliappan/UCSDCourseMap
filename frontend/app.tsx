import Graph from './Graph'
import { useLayout } from './useLayout'

export default function App() {
  const { tree, loading, error } = useLayout('CSE100')

  if (loading) return <div style={{ padding: 24, color: '#94a3b8' }}>Loading…</div>
  if (error) return <div style={{ padding: 24, color: 'red' }}>Error: {error}</div>

  return <Graph tree={tree} unlocks={[]} mode="prereqs" activeCourse="CSE100" />
}
