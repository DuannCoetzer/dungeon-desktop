import { useState } from 'react'
import { useMapStore } from '../mapStore'

export function FileOperationsPanel() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastOperationStatus, setLastOperationStatus] = useState<string | null>(null)
  
  const saveMapToFile = useMapStore(state => state.saveMapToFile)
  const loadMapFromFile = useMapStore(state => state.loadMapFromFile)
  
  const handleSave = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setLastOperationStatus(null)
    
    try {
      const success = await saveMapToFile()
      if (success) {
        setLastOperationStatus('Map saved successfully!')
      } else {
        setLastOperationStatus('Save cancelled.')
      }
    } catch (error) {
      console.error('Save failed:', error)
      setLastOperationStatus('Save failed.')
    } finally {
      setIsLoading(false)
      // Clear status after 3 seconds
      setTimeout(() => setLastOperationStatus(null), 3000)
    }
  }
  
  const handleLoad = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    setLastOperationStatus(null)
    
    try {
      const success = await loadMapFromFile()
      if (success) {
        setLastOperationStatus('Map loaded successfully!')
      } else {
        setLastOperationStatus('Load cancelled.')
      }
    } catch (error) {
      console.error('Load failed:', error)
      setLastOperationStatus('Load failed.')
    } finally {
      setIsLoading(false)
      // Clear status after 3 seconds
      setTimeout(() => setLastOperationStatus(null), 3000)
    }
  }
  
  return (
    <div className="toolbar-section">
      <h3 className="toolbar-title">File</h3>
      <div style={{ display: 'grid', gap: 6 }}>
        <button 
          className="tool-button" 
          onClick={handleSave}
          disabled={isLoading}
          title="Save current map to a JSON file"
        >
          💾 Save Map {isLoading ? '...' : ''}
        </button>
        <button 
          className="tool-button" 
          onClick={handleLoad}
          disabled={isLoading}
          title="Load map from a JSON file"
        >
          📁 Load Map {isLoading ? '...' : ''}
        </button>
        {lastOperationStatus && (
          <div style={{
            padding: '4px 8px',
            fontSize: '12px',
            borderRadius: '4px',
            backgroundColor: lastOperationStatus.includes('success') ? '#2d4a2d' : 
                            lastOperationStatus.includes('cancelled') ? '#4a4a2d' : '#4a2d2d',
            color: lastOperationStatus.includes('success') ? '#90ee90' : 
                   lastOperationStatus.includes('cancelled') ? '#ffff90' : '#ff9090',
            textAlign: 'center',
            border: '1px solid',
            borderColor: lastOperationStatus.includes('success') ? '#90ee90' : 
                        lastOperationStatus.includes('cancelled') ? '#ffff90' : '#ff9090'
          }}>
            {lastOperationStatus}
          </div>
        )}
      </div>
    </div>
  )
}
