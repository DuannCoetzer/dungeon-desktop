import React, { useState, useRef, useEffect } from 'react'
import { ActionMapViewer } from '../components/ActionMapViewer'
import { CharacterPanel } from '../components/CharacterPanel'
import { MeasurementSettings } from '../components/MeasurementSettings'
import type { MapData, CharacterToken } from '../protocol'
import { useAssetStore } from '../store/assetStore'
import { useDMGameStore, useDMGameMapData, useDMGameCharacters, useDMGamePendingCharacters, useDMGameSelectedCharacter, useDMGameSession } from '../store/dmGameStore'
import { dmSubscribeToMapChanges, dmDeserializeMap, dmSetMapData, dmAddCharacter, dmUpdateCharacter, dmDeleteCharacter } from '../dmGameProtocol'

interface ActionProps {}

export function Action({}: ActionProps = {}) {
  // Use persistent DM Game store instead of local state
  const dmGameStore = useDMGameStore()
  const mapData = useDMGameMapData()
  const characters = useDMGameCharacters()
  const pendingCharacters = useDMGamePendingCharacters()
  const selectedCharacter = useDMGameSelectedCharacter()
  const hasActiveSession = useDMGameSession()
  
  // Local UI state for loading/errors (these don't need persistence)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const assetStore = useAssetStore()

  // Subscribe to DM Game isolated map data changes
  useEffect(() => {
    const unsubscribe = dmSubscribeToMapChanges((newMapData) => {
      dmGameStore.setMapData(newMapData)
      dmGameStore.setCharacters(newMapData.characters || [])
    })
    
    return unsubscribe
  }, [dmGameStore])
  
  // Restore session on mount if there's an active session
  useEffect(() => {
    if (hasActiveSession && mapData) {
      // Session exists, sync it with the isolated protocol
      dmSetMapData(mapData)
      console.log('✅ DM Game session restored from persistent storage:', {
        mapName: dmGameStore.mapInfo?.name,
        hasMap: !!mapData,
        charactersCount: characters.length,
        tilesCount: {
          floor: Object.keys(mapData.tiles?.floor || {}).length,
          walls: Object.keys(mapData.tiles?.walls || {}).length,
          objects: Object.keys(mapData.tiles?.objects || {}).length
        },
        assetsCount: mapData.assetInstances?.length || 0
      })
    } else {
      console.log('🔄 DM Game component mounted - no active session to restore')
    }
  }, [])

  // Load assets on component mount (needed for asset rendering)
  useEffect(() => {
    const loadAssets = async () => {
      await assetStore.loadDefaultAssets()
      await assetStore.loadImportedAssets()
    }
    loadAssets()
  }, [])

  // Character management handlers - create pending characters instead of placing immediately
  const handleAddCharacter = (character: { name: string; color: string; size: number; isVisible: boolean; avatarAssetId?: string; notes?: string }) => {
    // Add to pending characters instead of placing on map
    dmGameStore.addPendingCharacter(character)
  }
  
  const handlePlaceCharacter = (pendingCharacterId: string, x: number, y: number) => {
    // Get the pending character first
    const pendingCharacter = pendingCharacters.find(char => char.id === pendingCharacterId)
    if (!pendingCharacter) return
    
    // Create the placed character data
    const placedCharacter = {
      ...pendingCharacter,
      x,
      y,
      updatedAt: new Date().toISOString()
    }
    
    // Add to the isolated DM Game protocol first
    dmAddCharacter(placedCharacter)
    
    // Then update the store to move from pending to placed
    dmGameStore.placeCharacter(pendingCharacterId, x, y)
  }
  
  const handleRemovePendingCharacter = (id: string) => {
    dmGameStore.removePendingCharacter(id)
  }

  const handleUpdateCharacter = (id: string, updates: Partial<CharacterToken>) => {
    dmUpdateCharacter(id, updates)
  }

  const handleMoveCharacter = (characterId: string, x: number, y: number) => {
    dmUpdateCharacter(characterId, { x, y })
  }

  const handleDeleteCharacter = (id: string) => {
    if (selectedCharacter?.id === id) {
      dmGameStore.setSelectedCharacter(null)
    }
    dmDeleteCharacter(id)
  }

  const handleSelectCharacter = (character: CharacterToken | null) => {
    dmGameStore.setSelectedCharacter(character?.id || null)
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

      // Use the isolated DM Game protocol to deserialize and validate the map data
      const success = dmDeserializeMap(text)
      if (!success) {
        setError('Failed to load map data')
        setIsLoading(false)
        return
      }

      // Map is loaded into isolated DM Game protocol, update store
      const mapInfo = {
        name: file.name.replace('.json', ''),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }
      dmGameStore.setMapInfo(mapInfo)
      dmGameStore.setSessionActive(true)
      
      setIsLoading(false)
    } catch (err) {
      setError('Failed to read map file: ' + (err as Error).message)
      setIsLoading(false)
    }

    // Clear the input
    event.target.value = ''
  }

  const handleCloseMap = () => {
    dmGameStore.clearSession() // Clear the persistent DM Game session
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
              width: dmGameStore.isCharacterPanelCollapsed ? '60px' : '320px',
              backgroundColor: '#0d1117',
              borderRight: '1px solid #30363d',
              padding: '16px',
              overflowY: 'auto',
              transition: 'width 0.2s ease-in-out'
            }}>
              {/* Collapse toggle button */}
              <div style={{
                display: 'flex',
                justifyContent: dmGameStore.isCharacterPanelCollapsed ? 'center' : 'space-between',
                alignItems: 'center',
                marginBottom: dmGameStore.isCharacterPanelCollapsed ? '0' : '16px'
              }}>
                {!dmGameStore.isCharacterPanelCollapsed && (
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
                  onClick={() => dmGameStore.setCharacterPanelCollapsed(!dmGameStore.isCharacterPanelCollapsed)}
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
                  title={dmGameStore.isCharacterPanelCollapsed ? "Expand character panel" : "Collapse character panel"}
                >
                  {dmGameStore.isCharacterPanelCollapsed ? '▶' : '◀'}
                </button>
              </div>
              
              {!dmGameStore.isCharacterPanelCollapsed && (
                <>
                  <CharacterPanel
                    characters={characters}
                    pendingCharacters={pendingCharacters}
                    onAddCharacter={handleAddCharacter}
                    onUpdateCharacter={handleUpdateCharacter}
                    onDeleteCharacter={handleDeleteCharacter}
                    onRemovePendingCharacter={handleRemovePendingCharacter}
                    onSelectCharacter={handleSelectCharacter}
                    selectedCharacter={selectedCharacter}
                  />
                  
                  {/* Measurement Settings - show only when map has content */}
                  {mapData && (Object.keys(mapData.tiles?.floor || {}).length > 0 || Object.keys(mapData.tiles?.walls || {}).length > 0) && (
                    <div style={{ marginTop: '16px' }}>
                      <MeasurementSettings
                        gridSize={dmGameStore.measurementSettings.gridSize}
                        distancePerCell={dmGameStore.measurementSettings.distancePerCell}
                        units={dmGameStore.measurementSettings.units}
                        onGridSizeChange={(size) => dmGameStore.setMeasurementSettings({ ...dmGameStore.measurementSettings, gridSize: size })}
                        onDistancePerCellChange={(distance) => dmGameStore.setMeasurementSettings({ ...dmGameStore.measurementSettings, distancePerCell: distance })}
                        onUnitsChange={(units) => dmGameStore.setMeasurementSettings({ ...dmGameStore.measurementSettings, units })}
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
                onPlaceCharacter={handlePlaceCharacter}
                selectedCharacterId={selectedCharacter?.id}
                measurementSettings={dmGameStore.measurementSettings}
              />
            </div>
            
            {/* Right Info Panel */}
            <div style={{
              width: dmGameStore.isInfoPanelCollapsed ? '60px' : '320px',
              backgroundColor: '#0d1117',
              borderLeft: '1px solid #30363d',
              padding: '16px',
              overflowY: 'auto',
              transition: 'width 0.2s ease-in-out'
            }}>
              {/* Info Panel Header */}
              <div style={{
                display: 'flex',
                justifyContent: dmGameStore.isInfoPanelCollapsed ? 'center' : 'space-between',
                alignItems: 'center',
                marginBottom: dmGameStore.isInfoPanelCollapsed ? '0' : '16px'
              }}>
                {!dmGameStore.isInfoPanelCollapsed && (
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
                  onClick={() => dmGameStore.setInfoPanelCollapsed(!dmGameStore.isInfoPanelCollapsed)}
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
                  title={dmGameStore.isInfoPanelCollapsed ? "Expand info panel" : "Collapse info panel"}
                >
                  {dmGameStore.isInfoPanelCollapsed ? '◀' : '▶'}
                </button>
              </div>
              
              {!dmGameStore.isInfoPanelCollapsed && (
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
                      {dmGameStore.mapInfo?.name || 'Untitled Map'}
                    </h3>
                    
                    {dmGameStore.mapInfo?.updatedAt && (
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#7d8590' }}>
                        🕒 Last updated: {new Date(dmGameStore.mapInfo.updatedAt).toLocaleDateString()}
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
