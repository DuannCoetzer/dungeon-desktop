import React, { useState, useRef, useEffect } from 'react'
import { deserializeMap, setMapData, getMapData, subscribeToMapChanges, addCharacter, updateCharacter, deleteCharacter, moveCharacter, getCharacters } from '../protocol'
import { ActionMapViewer } from '../components/ActionMapViewer'
import { CharacterPanel } from '../components/CharacterPanel'
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

      setMapData(data)
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
    setMapData(null)
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
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        backgroundColor: '#161b22',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          margin: 0,
          color: '#f0f6fc'
        }}>
          🎭 Action Mode - Map Explorer
        </h1>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {mapInfo && (
            <div style={{
              fontSize: '14px',
              color: '#7d8590',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <span>📍 {mapInfo.name}</span>
              {mapInfo.updatedAt && (
                <span>🕒 {new Date(mapInfo.updatedAt).toLocaleDateString()}</span>
              )}
            </div>
          )}
          
          <button
            onClick={handleImportMap}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#238636',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            📁 {isLoading ? 'Loading...' : 'Import Map'}
          </button>

          {mapData && (
            <button
              onClick={handleCloseMap}
              style={{
                padding: '8px 16px',
                backgroundColor: '#da3633',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ✖️ Close Map
            </button>
          )}
        </div>
      </header>

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
                Welcome to Action Mode
              </h2>
              
              <p style={{
                fontSize: '16px',
                color: '#8b949e',
                marginBottom: '32px',
                lineHeight: 1.6
              }}>
                Import and explore dungeon maps created in the Game page. 
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
          /* Map viewer */
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              right: '16px',
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '6px',
              padding: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  🗺️ {mapInfo?.name}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#7d8590' }}>
                  Read-only mode - Drag to pan, scroll to zoom
                </p>
              </div>
              
              <div style={{ fontSize: '12px', color: '#7d8590' }}>
                Content: {Object.keys(mapData.tiles?.floor || {}).length} floor, {Object.keys(mapData.tiles?.walls || {}).length} walls{Object.keys(mapData.tiles?.objects || {}).length > 0 && `, ${Object.keys(mapData.tiles.objects).length} objects`}{mapData.assetInstances && mapData.assetInstances.length > 0 && `, ${mapData.assetInstances.length} assets`}
              </div>
            </div>

            {/* Map viewer */}
            <div style={{
              position: 'absolute',
              top: '80px', // Leave space for info bar
              left: '0',
              right: '0',
              bottom: '0'
            }}>
              <ActionMapViewer mapData={mapData} />
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
