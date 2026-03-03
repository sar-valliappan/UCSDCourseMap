import { useEffect, useState } from 'react'
import Graph from './Graph'
import { useLayout, useUnlocksLayout, COURSE_IDS } from './useLayout'

const inputStyle: React.CSSProperties = {
  background: '#0f1923',
  border: '1px solid #1e3a5f',
  borderRadius: 6,
  padding: '8px 12px',
  color: '#e2e8f0',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 13,
  outline: 'none',
  width: 180,
}

const buttonStyle: React.CSSProperties = {
  background: '#0c2340',
  border: '1px solid #0369a1',
  borderRadius: 6,
  padding: '8px 14px',
  color: '#38bdf8',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 12,
  cursor: 'pointer',
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const [draft, setDraft] = useState(params.get('course') ?? 'CSE12')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [courseId, setCourseId] = useState(params.get('course') ?? 'CSE12')
  const [mode, setMode] = useState<'prereqs' | 'unlocks'>((params.get('mode') as 'prereqs' | 'unlocks') ?? 'unlocks')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set([params.get('course') ?? 'CSE12']))

  useEffect(() => {
    const p = new URLSearchParams({ course: courseId, mode })
    window.history.replaceState(null, '', '?' + p)
  }, [courseId, mode])
  const { tree, loading: prereqLoading, error: prereqError } = useLayout(courseId)
  const { unlockData, loading: unlockLoading, error: unlockError, fetchUnlocks } = useUnlocksLayout(courseId)

  useEffect(() => {
    if (!draft) { setSuggestions([]); return }
    const q = draft.toUpperCase()
    setSuggestions(COURSE_IDS.filter(id => id.startsWith(q)).slice(0, 12))
  }, [draft])

  const loading = mode === 'prereqs' ? prereqLoading : unlockLoading
  const error = mode === 'prereqs' ? prereqError : unlockError

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim().toUpperCase()
    if (trimmed) {
      setCourseId(trimmed)
      setExpandedNodes(new Set([trimmed]))
    }
  }

  function handleModeToggle() {
    setMode(prev => {
      setExpandedNodes(new Set([courseId]))
      return prev === 'prereqs' ? 'unlocks' : 'prereqs'
    })
  }

  function handleNodeExpand(nodeId: string) {
    setExpandedNodes(prev => new Set([...prev, nodeId]))
    if (mode === 'unlocks') {
      const subCourseId = nodeId.split('::').pop()!
      fetchUnlocks(subCourseId)
    }
  }

  function handleNodeCollapse(nodeId: string) {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      next.delete(nodeId)
      for (const id of next) {
        if (id.startsWith(nodeId + '::')) next.delete(id)
      }
      return next
    })
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative' }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            placeholder="e.g. CSE100"
            style={inputStyle}
          />
          {suggestions.length > 0 && (
            <ul style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              margin: '4px 0 0',
              padding: 0,
              listStyle: 'none',
              background: '#0f1923',
              border: '1px solid #1e3a5f',
              borderRadius: 6,
              minWidth: '100%',
              zIndex: 20,
            }}>
              {suggestions.map(s => (
                <li
                  key={s}
                  onMouseDown={() => {
                    setDraft(s)
                    setSuggestions([])
                    setCourseId(s)
                    setExpandedNodes(new Set([s]))
                  }}
                  style={{
                    padding: '6px 12px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" style={buttonStyle}>View</button>
        <button
          type="button"
          onClick={handleModeToggle}
          style={{
            ...buttonStyle,
            color: mode === 'unlocks' ? '#4ade80' : '#38bdf8',
            borderColor: mode === 'unlocks' ? '#166534' : '#0369a1',
          }}
        >
          {mode === 'prereqs' ? 'unlocks →' : '← prereqs'}
        </button>
        {loading && (
          <span style={{ color: '#475569', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
            loading…
          </span>
        )}
        {error && (
          <span style={{ color: '#f87171', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
            {error}
          </span>
        )}
      </form>

      <Graph
        tree={tree}
        unlockData={unlockData}
        mode={mode}
        activeCourse={courseId}
        expandedNodes={expandedNodes}
        onNodeExpand={handleNodeExpand}
        onNodeCollapse={handleNodeCollapse}
      />
    </div>
  )
}
