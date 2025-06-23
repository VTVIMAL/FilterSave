import { useState, useEffect } from 'react'
import './App.css'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

const SUPPORTED_SITES = [
  {
    name: 'Myntra',
    key: 'myntra',
    match: url => url.includes('myntra.com'),
    hasFilter: url => {
      try {
        const u = new URL(url);
        return Array.from(u.searchParams.keys()).length > 0;
      } catch { return false; }
    }
  },
  {
    name: 'Ajio',
    key: 'ajio',
    match: url => url.includes('ajio.com'),
    hasFilter: url => {
      try {
        const u = new URL(url);
        return Array.from(u.searchParams.keys()).length > 0;
      } catch { return false; }
    }
  }
];

function App() {
  const [filters, setFilters] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasFilter, setHasFilter] = useState(false)
  const [currentSite, setCurrentSite] = useState(null)

  // Load filters from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('myntraFilters')
    if (saved) setFilters(JSON.parse(saved))
  }, [])

  // Save filters to localStorage when changed
  useEffect(() => {
    localStorage.setItem('myntraFilters', JSON.stringify(filters))
  }, [filters])

  // Check if current tab is a supported site and has filters
  useEffect(() => {
    if (window.chrome && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.url) {
          const site = SUPPORTED_SITES.find(s => s.match(tab.url));
          setCurrentSite(site);
          setHasFilter(site ? site.hasFilter(tab.url) : false);
        } else {
          setCurrentSite(null);
          setHasFilter(false);
        }
      });
    } else {
      setCurrentSite(null);
      setHasFilter(false);
    }
  }, []);

  // Save current tab's URL as a filter
  const saveCurrentFilter = async () => {
    setLoading(true)
    if (window.chrome && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0]
        if (tab && tab.url && currentSite) {
          const name = prompt('Enter a name for this filter:', `My ${currentSite.name} Filter`)
          if (name) {
            setFilters((prev) => [
              { name, url: tab.url, site: currentSite.key, siteName: currentSite.name, createdAt: new Date().toISOString() },
              ...prev,
            ])
          }
        } else {
          alert('Please use this on a supported shopping page!')
        }
        setLoading(false)
      })
    } else {
      alert('Chrome extension APIs not available.')
      setLoading(false)
    }
  }

  // Open filter in new tab
  const openFilter = (url) => {
    if (window.chrome && chrome.tabs) {
      chrome.tabs.create({ url })
    } else {
      window.open(url, '_blank')
    }
  }

  // Delete filter by index
  const deleteFilter = (idx) => {
    setFilters((prev) => prev.filter((_, i) => i !== idx))
  }

  // Handle drag end
  const onDragEnd = (result) => {
    if (!result.destination) return
    const reordered = Array.from(filters)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)
    setFilters(reordered)
  }

  // SVG 3x3 grid drag icon
  const GrabIcon = (props) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ cursor: 'grab', display: 'block' }}
      {...props}
    >
      <circle cx="6" cy="5" r="1.2" fill="currentColor" />
      <circle cx="10" cy="5" r="1.2" fill="currentColor" />
      <circle cx="14" cy="5" r="1.2" fill="currentColor" />
      <circle cx="6" cy="10" r="1.2" fill="currentColor" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" />
      <circle cx="14" cy="10" r="1.2" fill="currentColor" />
      <circle cx="6" cy="15" r="1.2" fill="currentColor" />
      <circle cx="10" cy="15" r="1.2" fill="currentColor" />
      <circle cx="14" cy="15" r="1.2" fill="currentColor" />
    </svg>
  )

  // Mouse position for radial hover animation
  const handleMouseMove = (e) => {
    const li = e.currentTarget
    const rect = li.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    li.style.setProperty('--mouse-x', `${x}px`)
    li.style.setProperty('--mouse-y', `${y}px`)
  }
  const handleMouseLeave = (e) => {
    const li = e.currentTarget
    li.style.removeProperty('--mouse-x')
    li.style.removeProperty('--mouse-y')
  }

  return (
    <div className="popup-container">
      <h2>My Myntra & Ajio Filters</h2>
      {hasFilter && (
        <button onClick={saveCurrentFilter} disabled={loading}>
          {loading ? 'Saving...' : 'Save Filter'}
        </button>
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="filter-list">
          {(provided) => (
            <ul className="filter-list" ref={provided.innerRef} {...provided.droppableProps}>
              {filters.length === 0 && <li>No filters saved yet.</li>}
              {filters.map((filter, idx) => (
                <Draggable key={idx} draggableId={String(idx)} index={idx}>
                  {(provided, snapshot) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? 'dragging' : ''}
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                    >
                      <span {...provided.dragHandleProps} className="grab-icon" style={{marginRight: 12}}>
                        <GrabIcon />
                      </span>
                      <span className="site-badge">{filter.siteName || filter.site}</span>
                      <a
                        href={filter.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="filter-link"
                        onClick={e => {
                          e.preventDefault();
                          openFilter(filter.url);
                        }}
                        style={{ flex: 1, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                      >
                        {filter.name}
                      </a>
                      <button
                        className="delete-btn xicon"
                        title="Delete filter"
                        onClick={() => deleteFilter(idx)}
                        tabIndex={-1}
                        aria-label="Delete filter"
                      >
                        ×
                      </button>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}

export default App
