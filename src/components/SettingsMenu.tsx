import React, { useState, useRef, useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import './SettingsMenu.css'

const SettingsMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  const {
    enableWarpDistortion,
    enableParchmentCreases,
    showAdvancedSettings,
    setWarpDistortion,
    setParchmentCreases,
    setShowAdvancedSettings,
    resetToDefaults,
  } = useSettingsStore()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close menu on ESC key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="settings-menu-container">
      <button
        ref={buttonRef}
        className={`settings-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Settings"
        aria-label="Open settings menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" />
        </svg>
      </button>

      {isOpen && (
        <div ref={menuRef} className="settings-menu">
          <div className="settings-header">
            <h3>Settings</h3>
            <button
              className="close-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close settings"
            >
              ×
            </button>
          </div>

          <div className="settings-content">
            {/* Visual Effects Section */}
            <div className="settings-section">
              <h4>Visual Effects</h4>
              
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={enableWarpDistortion}
                    onChange={(e) => setWarpDistortion(e.target.checked)}
                    className="setting-checkbox"
                  />
                  <span className="setting-text">
                    🌊 Warp Distortion
                    <small>Secret parchment distortion effect</small>
                  </span>
                </label>
              </div>

              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={enableParchmentCreases}
                    onChange={(e) => setParchmentCreases(e.target.checked)}
                    className="setting-checkbox"
                  />
                  <span className="setting-text">
                    📜 Parchment Creases
                    <small>Aged paper fold effects</small>
                  </span>
                </label>
              </div>
            </div>

            {/* Advanced Settings Section */}
            <div className="settings-section">
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={showAdvancedSettings}
                    onChange={(e) => setShowAdvancedSettings(e.target.checked)}
                    className="setting-checkbox"
                  />
                  <span className="setting-text">
                    ⚙️ Show Advanced Settings
                    <small>Display developer options</small>
                  </span>
                </label>
              </div>
            </div>

            {/* Reset Section */}
            <div className="settings-section">
              <button
                className="reset-button"
                onClick={() => {
                  resetToDefaults()
                  setIsOpen(false)
                }}
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SettingsMenu
