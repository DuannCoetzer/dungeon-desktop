import React, { useState, useRef, useEffect } from 'react'
import { deserializeMap, setMapData, getMapData, subscribeToMapChanges, addCharacter, updateCharacter, deleteCharacter, moveCharacter, getCharacters } from '../protocol'
import { ActionMapViewer } from '../components/ActionMapViewer'
import { CharacterPanel } from '../components/CharacterPanel'
import { MeasurementSettings } from '../components/MeasurementSettings'
import type { MapData, CharacterToken } from '../protocol'
import { useAssetStore } from '../store/assetStore'

interface ActionProps {}

export function Action({}: ActionProps = {}) {
  const [mapData, setLocalMapData] = useState<MapData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapInfo, setMapInfo] = useState<{
    name: string
    createdAt?: string
    updatedAt?: string
  } | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterToken | null>(null)
  const [characters, setCharacters] = useState<CharacterToken[]>([])
  const [isCharacterPanelCollapsed, setIsCharacterPanelCollapsed] = useState(false)
  const [isInfoPanelCollapsed, setIsInfoPanelCollapsed] = useState(false)
  
  // Measurement settings state
  const [measurementSettings, setMeasurementSettings] = useState({
    gridSize: 32, // TILE_SIZE from ActionMapViewer
    distancePerCell: 5,
    units: 'ft'
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const assetStore = useAssetStore()

  // Subscribe to map data changes
  useEffect(() => {
    const unsubscribe = subscribeToMapChanges((newMapData) => {
      setLocalMapData(newMapData)
      setCharacters(newMapData.characters || [])
    })
    
    return unsubscribe
  }, [])

  // Load assets on component mount (needed for asset rendering)
  useEffect(() => {
    const loadAssets = async () => {
      await assetStore.loadDefaultAssets()
      await assetStore.loadImportedAssets()
    }
    loadAssets()
  }, [])

  // Character management handlers
  const handleAddCharacter = (character: Omit<CharacterToken, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCharacter: CharacterToken = {
      ...character,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    addCharacter(newCharacter)
  }

  const handleUpdateCharacter = (id: string, updates: Partial<CharacterToken>) => {
    updateCharacter(id, updates)
  }

  const handleMoveCharacter = (characterId: string, x: number, y: number) => {
    updateCharacter(characterId, { x, y })
  }

  const handleDeleteCharacter = (id: string) => {
    if (selectedCharacter?.id === id) {
      setSelectedCharacter(null)
    }
    deleteCharacter(id)
  }

  const handleSelectCharacter = (character: CharacterToken | null) => {
    setSelectedCharacter(character)
  }

  const handleImportMap = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Please select a JSON file')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const text = await file.readAsText()
      const data = JSON.parse(text)
      
      // Validate that this looks like a map file
      if (!data.tiles || typeof data.tiles !== 'object') {
        setError('This doesn\'t appear to be a valid map file')
        setIsLoading(false)
        return
      }

      // Use the protocol to deserialize and validate the map data
      const success = deserializeMap(text)
      if (!success) {
        setError('Failed to load map data')
        setIsLoading(false)
        return
      }

      // Map is already loaded into protocol via deserializeMap
      setMapInfo({
        name: file.name.replace('.json', ''),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      })
      
      setIsLoading(false)
    } catch (err) {
      setError('Failed to read map file: ' + (err as Error).message)
      setIsLoading(false)
    }

    // Clear the input
    event.target.value = ''
  }

  const handleCloseMap = () => {
    setMapData(null) // Use protocol function to clear map data
    setMapInfo(null)
    setError(null)
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0d1117',
      color: '#e6e6e6',
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Main content area */}
      <main style={{ flex: 1, display: 'flex' }}>
        {!mapData ? (
          /* Welcome screen */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '32px'
          }}>
            <div style={{
              maxWidth: '600px',
              padding: '48px',
              backgroundColor: '#161b22',
              borderRadius: '12px',
              border: '1px solid #30363d'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>🗺️</div>
              
              <h2 style={{
                fontSize: '28px',
                fontWeight: '600',
                margin: '0 0 16px 0',
                color: '#f0f6fc'
              }}>
                Welcome to DM Game
              </h2>
              
              <p style={{
                fontSize: '16px',
                color: '#8b949e',
                marginBottom: '32px',
                lineHeight: 1.6
              }}>
                Import and explore dungeon maps created in the Map Builder page.
                Navigate through your dungeons in read-only mode, perfect for 
                players and DMs who want to explore without editing.
              </p>

              <button
                onClick={handleImportMap}
                disabled={isLoading}
                style={{
                  padding: '16px 32px',
                  backgroundColor: '#238636',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '0 auto',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                📁 {isLoading ? 'Loading Map...' : 'Import Your First Map'}
              </button>

              {error && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#4a2d2d',
                  border: '1px solid #ff6b6b',
                  borderRadius: '6px',
                  color: '#ff9090',
                  fontSize: '14px'
                }}>
                  ❌ {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Map viewer with character panel */
          <div style={{ flex: 1, display: 'flex' }}>
            {/* Character Panel */}
            <div style={{
              width: isCharacterPanelCollapsed ? '60px' : '320px',
              backgroundColor: '#0d1117',
              borderRight: '1px solid #30363d',
              padding: '16px',
              overflowY: 'auto',
              transition: 'width 0.2s ease-in-out'
            }}>
              {/* Collapse toggle button */}
              <div style={{
                display: 'flex',
                justifyContent: isCharacterPanelCollapsed ? 'center' : 'space-between',
                alignItems: 'center',
                marginBottom: isCharacterPanelCollapsed ? '0' : '16px'
              }}>
                {!isCharacterPanelCollapsed && (
                  <h2 style={{
                    margin: '0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#f0f6fc'
                  }}>
                    🎭 Characters
                  </h2>
                )}
                
                <button
                  onClick={() => setIsCharacterPanelCollapsed(!isCharacterPanelCollapsed)}
                  style={{
                    background: 'none',
                    border: '1px solid #30363d',
                    borderRadius: '4px',
                    color: '#7d8590',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px'
                  }}
                  title={isCharacterPanelCollapsed ? "Expand character panel" : "Collapse character panel"}
                >
                  {isCharacterPanelCollapsed ? '▶' : '◀'}
                </button>
              </div>
              
              {!isCharacterPanelCollapsed && (
                <>
                  <CharacterPanel
                    characters={characters}
                    onAddCharacter={handleAddCharacter}
                    onUpdateCharacter={handleUpdateCharacter}
                    onDeleteCharacter={handleDeleteCharacter}
                    onSelectCharacter={handleSelectCharacter}
                    selectedCharacter={selectedCharacter}
                  />
                  
                  {/* Measurement Settings - show only when map has content */}
                  {mapData && (Object.keys(mapData.tiles?.floor || {}).length > 0 || Object.keys(mapData.tiles?.walls || {}).length > 0) && (
                    <div style={{ marginTop: '16px' }}>
                      <MeasurementSettings
                        gridSize={measurementSettings.gridSize}
                        distancePerCell={measurementSettings.distancePerCell}
                        units={measurementSettings.units}
                        onGridSizeChange={(size) => setMeasurementSettings(prev => ({ ...prev, gridSize: size }))}
                        onDistancePerCellChange={(distance) => setMeasurementSettings(prev => ({ ...prev, distancePerCell: distance }))}
                        onUnitsChange={(units) => setMeasurementSettings(prev => ({ ...prev, units }))}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Map viewer area */}
            <div style={{ flex: 1, position: 'relative' }}>
              {/* Full-screen map viewer */}
              <ActionMapViewer 
                mapData={mapData} 
                onMoveCharacter={handleMoveCharacter}
                selectedCharacterId={selectedCharacter?.id}
                measurementSettings={measurementSettings}
              />
            </div>
            
            {/* Right Info Panel */}
            <div style={{
              width: isInfoPanelCollapsed ? '60px' : '320px',
              backgroundColor: '#0d1117',
              borderLeft: '1px solid #30363d',
              padding: '16px',
              overflowY: 'auto',
              transition: 'width 0.2s ease-in-out'
            }}>
              {/* Info Panel Header */}
              <div style={{
                display: 'flex',
                justifyContent: isInfoPanelCollapsed ? 'center' : 'space-between',
                alignItems: 'center',
                marginBottom: isInfoPanelCollapsed ? '0' : '16px'
              }}>
                {!isInfoPanelCollapsed && (
                  <h2 style={{
                    margin: '0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#f0f6fc'
                  }}>
                    🗺️ Map Info
                  </h2>
                )}
                
                <button
                  onClick={() => setIsInfoPanelCollapsed(!isInfoPanelCollapsed)}
                  style={{
                    background: 'none',
                    border: '1px solid #30363d',
                    borderRadius: '4px',
                    color: '#7d8590',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px'
                  }}
                  title={isInfoPanelCollapsed ? "Expand info panel" : "Collapse info panel"}
                >
                  {isInfoPanelCollapsed ? '◀' : '▶'}
                </button>
              </div>
              
              {!isInfoPanelCollapsed && (
                <div>
                  {/* Map Information */}
                  <div style={{
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                      {mapInfo?.name || 'Untitled Map'}
                    </h3>
                    
                    {mapInfo?.updatedAt && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#7d8590' }}>
                        🕒 Last updated: {new Date(mapInfo.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                    
                    <div style={{ fontSize: '12px', color: '#7d8590', marginBottom: '12px' }}>
                      <div>Floor tiles: {Object.keys(mapData.tiles?.floor || {}).length}</div>
                      <div>Wall tiles: {Object.keys(mapData.tiles?.walls || {}).length}</div>
                      {Object.keys(mapData.tiles?.objects || {}).length > 0 && (
                        <div>Objects: {Object.keys(mapData.tiles.objects).length}</div>
                      )}
                      {mapData.assetInstances && mapData.assetInstances.length > 0 && (
                        <div>Assets: {mapData.assetInstances.length}</div>
                      )}
                      <div>Characters: {characters.length}</div>
                    </div>
                  </div>
                  
                  {/* Controls */}
                  <div style={{
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#f0f6fc' }}>
                      Actions
                    </h4>
                    
                    <button
                      onClick={handleImportMap}
                      disabled={isLoading}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#238636',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginBottom: '8px',
                        opacity: isLoading ? 0.6 : 1
                      }}
                    >
                      📁 {isLoading ? 'Loading...' : 'Import Map'}
                    </button>
                    
                    <button
                      onClick={handleCloseMap}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#da3633',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      ✖️ Close Map
                    </button>
                  </div>
                  
                  {/* Help Text */}
                  <div style={{
                    fontSize: '11px',
                    color: '#6e7681',
                    textAlign: 'center',
                    lineHeight: 1.4
                  }}>
                    Left: Move chars<br/>
                    Middle: Pan map<br/>
                    Right: Measure<br/>
                    Scroll: Zoom<br/>
                    `: Clear measures
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

declare global {
  interface File {
    readAsText(): Promise<string>
  }
}

// Extend File prototype for easier text reading
if (typeof File !== 'undefined' && !File.prototype.readAsText) {
  File.prototype.readAsText = function(): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(this)
    })
  }
}
