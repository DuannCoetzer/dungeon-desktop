import React, { useEffect, useState } from 'react'
import { useMapStore, useTiles, useAssetInstances, useCurrentLayer } from '../mapStore'
import { useUIStore, useSelectedTool, useBrushSettings } from '../uiStore'
import { useDungeonStore } from '../store'
import { 
  setTile, 
  eraseTile, 
  addAssetInstance,
  getMapData,
  resetMap,
  subscribeToMapChanges
} from '../protocol'
import type { AssetInstance } from '../store'

// Example component showing direct protocol usage
export const ProtocolExample: React.FC = () => {
  const [mapData, setMapData] = useState(getMapData())
  
  useEffect(() => {
    // Subscribe to protocol changes
    const unsubscribe = subscribeToMapChanges((newMapData) => {
      setMapData(newMapData)
    })
    
    return unsubscribe
  }, [])
  
  const handleSetTile = () => {
    // Directly use protocol functions
    setTile('floor', 5, 5, 'floor')
    setTile('walls', 5, 6, 'wall')
  }
  
  const handleEraseTile = () => {
    eraseTile('floor', 5, 5)
    eraseTile('walls', 5, 6)
  }
  
  const handleAddAsset = () => {
    const assetInstance: AssetInstance = {
      id: `asset_${Date.now()}`,
      assetId: 'test_asset',
      x: 10,
      y: 10,
      width: 32,
      height: 32,
      rotation: 0,
      gridWidth: 1,
      gridHeight: 1
    }
    addAssetInstance(assetInstance)
  }
  
  const handleReset = () => {
    resetMap()
  }
  
  const tileCount = Object.keys(mapData.tiles.floor).length + 
                   Object.keys(mapData.tiles.walls).length + 
                   Object.keys(mapData.tiles.objects).length
  
  return (
    <div className="protocol-example">
      <h3>Direct Protocol Usage Example</h3>
      <div>
        <p>Map Version: {mapData.version}</p>
        <p>Total Tiles: {tileCount}</p>
        <p>Asset Instances: {mapData.assetInstances.length}</p>
        <p>Last Updated: {mapData.updatedAt}</p>
      </div>
      
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={handleSetTile}>Add Test Tiles</button>
        <button onClick={handleEraseTile}>Erase Test Tiles</button>
        <button onClick={handleAddAsset}>Add Asset</button>
        <button onClick={handleReset}>Reset Map</button>
      </div>
      
      <div style={{ marginTop: 16 }}>
        <h4>Map Data (JSON)</h4>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: 8, 
          borderRadius: 4, 
          fontSize: '12px',
          maxHeight: '200px',
          overflow: 'auto'
        }}>
          {JSON.stringify(mapData, null, 2)}
        </pre>
      </div>
    </div>
  )
}

// Example component using the new store architecture
export const NewStoreExample: React.FC = () => {
  // Map state from map store
  const tiles = useTiles()
  const assetInstances = useAssetInstances()
  const currentLayer = useCurrentLayer()
  const { setTile: mapSetTile, eraseTile: mapEraseTile, setLayer } = useMapStore()
  
  // UI state from UI store
  const selectedTool = useSelectedTool()
  const brushSettings = useBrushSettings()
  const { setSelectedTool, setBrushSize } = useUIStore()
  
  const handleToolChange = (tool: typeof selectedTool) => {
    setSelectedTool(tool)
  }
  
  const handleBrushSizeChange = (size: number) => {
    setBrushSize(size)
  }
  
  const handleLayerChange = (layer: typeof currentLayer) => {
    setLayer(layer)
  }
  
  const handleDrawTile = () => {
    // Using store actions (which call protocol functions under the hood)
    mapSetTile(2, 2, 'floor')
  }
  
  const handleEraseTile = () => {
    mapEraseTile(2, 2)
  }
  
  const tileCount = Object.keys(tiles.floor).length + 
                   Object.keys(tiles.walls).length + 
                   Object.keys(tiles.objects).length
  
  return (
    <div className="new-store-example">
      <h3>New Store Architecture Example</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* UI State */}
        <div>
          <h4>UI State (useUIStore)</h4>
          <div>
            <label>
              Tool: 
              <select 
                value={selectedTool} 
                onChange={(e) => handleToolChange(e.target.value as typeof selectedTool)}
              >
                <option value="select">Select</option>
                <option value="draw">Draw</option>
                <option value="erase">Erase</option>
                <option value="rect">Rectangle</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>
              Brush Size: {brushSettings.size}
              <input
                type="range"
                min="1"
                max="10"
                value={brushSettings.size}
                onChange={(e) => handleBrushSizeChange(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
        
        {/* Map State */}
        <div>
          <h4>Map State (useMapStore)</h4>
          <div>
            <label>
              Current Layer: 
              <select 
                value={currentLayer} 
                onChange={(e) => handleLayerChange(e.target.value as typeof currentLayer)}
              >
                <option value="floor">Floor</option>
                <option value="walls">Walls</option>
                <option value="objects">Objects</option>
                <option value="assets">Assets</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 8 }}>
            <p>Total Tiles: {tileCount}</p>
            <p>Asset Instances: {assetInstances.length}</p>
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={handleDrawTile}>Draw Tile (2,2)</button>
        <button onClick={handleEraseTile}>Erase Tile (2,2)</button>
      </div>
    </div>
  )
}

// Example showing backward compatibility
export const BackwardCompatibilityExample: React.FC = () => {
  // Using the old store API (which now delegates to new stores)
  const tiles = useDungeonStore(state => state.tiles)
  const tool = useDungeonStore(state => state.tool)
  const currentLayer = useDungeonStore(state => state.currentLayer)
  const setTool = useDungeonStore(state => state.setTool)
  const setTile = useDungeonStore(state => state.setTile)
  const eraseTile = useDungeonStore(state => state.eraseTile)
  
  const handleOldAPIUsage = () => {
    // This still works but now delegates to the new stores
    setTile(3, 3, 'wall')
  }
  
  const tileCount = Object.keys(tiles.floor).length + 
                   Object.keys(tiles.walls).length + 
                   Object.keys(tiles.objects).length
  
  return (
    <div className="backward-compatibility-example">
      <h3>Backward Compatibility Example</h3>
      <p>Using the old useDungeonStore API (delegates to new stores)</p>
      
      <div>
        <p>Current Tool: {tool}</p>
        <p>Current Layer: {currentLayer}</p>
        <p>Total Tiles: {tileCount}</p>
      </div>
      
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={() => setTool('draw')}>Set Tool: Draw</button>
        <button onClick={() => setTool('erase')}>Set Tool: Erase</button>
        <button onClick={handleOldAPIUsage}>Add Wall Tile (3,3)</button>
        <button onClick={() => eraseTile(3, 3)}>Erase Tile (3,3)</button>
      </div>
    </div>
  )
}

// Main example component combining all demonstrations
export const StoreArchitectureDemo: React.FC = () => {
  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <h1>New Store Architecture Demonstration</h1>
      
      <div style={{ marginBottom: 32 }}>
        <h2>Architecture Overview</h2>
        <div style={{ background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
          <h3>Three-Layer Architecture:</h3>
          <ol>
            <li><strong>Protocol Layer</strong> - Core map data operations with persistence</li>
            <li><strong>Store Layer</strong> - Reactive state management with Zustand</li>
            <li><strong>Component Layer</strong> - React components consuming store state</li>
          </ol>
          
          <h4>Key Benefits:</h4>
          <ul>
            <li>🔄 Separation of concerns: UI state vs. persistent map data</li>
            <li>📡 Protocol functions abstract storage and state management</li>
            <li>⚡ Actions like setTile and addAssetInstance call protocol functions</li>
            <li>🔙 Backward compatibility with existing useDungeonStore API</li>
            <li>📊 Better state organization and maintainability</li>
          </ul>
        </div>
      </div>
      
      <div style={{ display: 'grid', gap: 24 }}>
        <ProtocolExample />
        <NewStoreExample />
        <BackwardCompatibilityExample />
      </div>
      
      <div style={{ marginTop: 32, padding: 16, background: '#e8f4fd', borderRadius: 8 }}>
        <h3>Migration Guide</h3>
        <p><strong>New Code:</strong> Use <code>useMapStore</code> for persistent map data and <code>useUIStore</code> for editor state.</p>
        <p><strong>Existing Code:</strong> Continue using <code>useDungeonStore</code> - it now delegates to the new stores automatically.</p>
        <p><strong>Protocol Functions:</strong> For advanced scenarios, use protocol functions directly for map operations.</p>
      </div>
    </div>
  )
}
