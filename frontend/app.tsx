import { useGraph, TreeView } from './Graph'

export default function App() {
  const tree = useGraph('CSE100')
  if (!tree) return <div>Loading...</div>
  return <TreeView tree={tree} />
}
