import { useNavigate, useLocation } from 'react-router-dom'
import './MapModeSelector.css'

interface MapMode {
  key: string
  label: string
  path: string
  icon: string
  description: string
}

export function MapModeSelector() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const modes: MapMode[] = [
    {
      key: 'world',
      label: 'World',
      path: '/world',
      icon: '🌍',
      description: 'Large-scale world maps - continents, kingdoms, regions'
    },
    {
      key: 'dungeon',
      label: 'Dungeon',
      path: '/dungeon',
      icon: '🏰',
      description: 'Interior maps - dungeons, buildings, rooms'
    }
  ]

  const currentMode = modes.find(mode => location.pathname === mode.path) || modes[0]

  const handleModeChange = (selectedMode: MapMode) => {
    if (selectedMode.path !== location.pathname) {
      navigate(selectedMode.path)
    }
  }

  return (
    <div className="mode-selector-simple">
      <div className="mode-selector-label">Map Mode:</div>
      <div className="mode-toggle-group">
        {modes.map((mode) => (
          <label
            key={mode.key}
            className={`mode-toggle-option ${currentMode.key === mode.key ? 'active' : ''}`}
            title={mode.description}
          >
            <input
              type="radio"
              name="mapMode"
              value={mode.key}
              checked={currentMode.key === mode.key}
              onChange={() => handleModeChange(mode)}
              className="mode-radio"
            />
            <span className="mode-toggle-button">
              <span className="mode-icon">{mode.icon}</span>
              <span className="mode-label">{mode.label}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

// Compact version for toolbars
export function CompactModeSelector() {
  return <MapModeSelector />
}

// Mode indicator for status bars
export function ModeStatusIndicator() {
  const location = useLocation()
  
  const modes: MapMode[] = [
    { key: 'world', label: 'World', path: '/world', icon: '🌍', description: 'Large-scale world maps' },
    { key: 'dungeon', label: 'Dungeon', path: '/dungeon', icon: '🏰', description: 'Interior maps' }
  ]

  const currentMode = modes.find(mode => location.pathname === mode.path) || modes[0]

  return (
    <div className="mode-status-indicator">
      <span className="mode-icon">{currentMode.icon}</span>
      <span className="mode-text">{currentMode.label}</span>
    </div>
  )
}
