import { useEffect, useRef, useState } from 'react'
import Graph from './Graph'
import { useLayout, useUnlocksLayout, COURSE_IDS, DESCRIPTIONS } from './useLayout'

function getCatalogUrl(courseId: string): string {
  const m = courseId.match(/^([A-Za-z]+)(\d+\w*)$/)
  if (!m) return 'https://catalog.ucsd.edu/'
  return `https://catalog.ucsd.edu/courses/${m[1].toUpperCase()}.html#${m[1].toLowerCase()}${m[2].toLowerCase()}`
}

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
  const [mode, setMode] = useState<'prereqs' | 'unlocks'>((params.get('mode') as 'prereqs' | 'unlocks') ?? 'prereqs')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set([params.get('course') ?? 'CSE12']))
  const [descExpanded, setDescExpanded] = useState(false)
  const [bubbleVisible, setBubbleVisible] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [typing, setTyping] = useState(false)
  const skipSuggestions = useRef(false)

  useEffect(() => {
    const p = new URLSearchParams({ course: courseId, mode })
    window.history.replaceState(null, '', '?' + p)
    setDescExpanded(false)
    setBubbleVisible(false)
  }, [courseId, mode])
  const { tree, loading: prereqLoading, error: prereqError } = useLayout(courseId)
  const { unlockData, loading: unlockLoading, error: unlockError, fetchUnlocks } = useUnlocksLayout(courseId)

  useEffect(() => {
    if (skipSuggestions.current) { skipSuggestions.current = false; return }
    if (!draft) { setSuggestions([]); return }
    const q = draft.toUpperCase()
    setSuggestions(COURSE_IDS.filter(id => id.startsWith(q)).slice(0, 12))
    setHighlightIdx(-1)
  }, [draft])

  const loading = mode === 'prereqs' ? prereqLoading : unlockLoading
  const error = mode === 'prereqs' ? prereqError : unlockError

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim().toUpperCase()
    if (trimmed) {
      setCourseId(trimmed)
      setExpandedNodes(new Set([trimmed]))
      setSuggestions([])
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
      const last = nodeId.split('::').pop()!
      if (!last.startsWith('@')) fetchUnlocks(last)
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
      <div style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative' }}>
          <input
            value={draft}
            onChange={e => { setDraft(e.target.value); setTyping(true) }}
            onBlur={() => setTimeout(() => { setSuggestions([]); setHighlightIdx(-1); setTyping(false) }, 150)}
            onKeyDown={e => {
              if (!suggestions.length) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlightIdx(i => Math.max(i - 1, -1))
              } else if (e.key === 'Enter' && highlightIdx >= 0) {
                e.preventDefault()
                const s = suggestions[highlightIdx]
                skipSuggestions.current = true
                setTyping(false)
                setDraft(s)
                setSuggestions([])
                setCourseId(s)
                setExpandedNodes(new Set([s]))
                setHighlightIdx(-1)
              }
            }}
            placeholder="e.g. CSE100"
            style={inputStyle}
          />
          {typing && suggestions.length > 0 && (
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
              {suggestions.map((s, i) => (
                <li
                  key={s}
                  onMouseDown={() => {
                    skipSuggestions.current = true
                    setTyping(false)
                    setDraft(s)
                    setSuggestions([])
                    setCourseId(s)
                    setExpandedNodes(new Set([s]))
                    setHighlightIdx(-1)
                  }}
                  onMouseEnter={() => setHighlightIdx(i)}
                  onMouseLeave={() => setHighlightIdx(-1)}
                  style={{
                    padding: '6px 12px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    color: i === highlightIdx ? '#e2e8f0' : '#94a3b8',
                    cursor: 'pointer',
                  }}
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
        {!loading && !error && (
          <button
            type="button"
            onClick={() => setBubbleVisible(v => !v)}
            title={bubbleVisible ? 'Hide description' : 'Show description'}
            style={{
              ...buttonStyle,
              color: bubbleVisible ? '#38bdf8' : '#475569',
              borderColor: bubbleVisible ? '#0369a1' : '#1e3a5f',
              fontSize: 13,
              padding: '6px 10px',
            }}
          >
            ℹ
          </button>
        )}
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

      {!loading && !error && bubbleVisible && (
        <div style={{
          position: 'relative',
          background: '#0f1923',
          border: '1px solid #1e3a5f',
          borderRadius: 8,
          padding: '10px 32px 10px 16px',
          maxWidth: 480,
        }}>
          <button
            onClick={() => setBubbleVisible(false)}
            style={{
              position: 'absolute',
              top: 6,
              right: 8,
              background: 'none',
              border: 'none',
              color: '#334f6e',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 2,
            }}
          >
            ×
          </button>
          <a
            href={getCatalogUrl(courseId)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#38bdf8', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, textDecoration: 'none' }}
          >
            {courseId} — UCSD Catalog ↗
          </a>
          {DESCRIPTIONS[courseId] && (
            <>
              <p style={{
                color: '#94a3b8',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                margin: '6px 0 0',
                lineHeight: 1.6,
                ...(descExpanded ? {} : {
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }),
              }}>
                {DESCRIPTIONS[courseId]}
              </p>
              <button
                onClick={() => setDescExpanded(v => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 0 0',
                  color: '#475569',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {descExpanded ? '▲ less' : '▼ more'}
              </button>
            </>
          )}
        </div>
      )}
      </div>

      <Graph
        tree={tree}
        unlockData={unlockData}
        mode={mode}
        activeCourse={courseId}
        expandedNodes={expandedNodes}
        onNodeExpand={handleNodeExpand}
        onNodeCollapse={handleNodeCollapse}
        onCourseSelect={id => {
          setCourseId(id)
          setDraft(id)
          setExpandedNodes(new Set([id]))
          skipSuggestions.current = true
        }}
      />
    </div>
  )
}
