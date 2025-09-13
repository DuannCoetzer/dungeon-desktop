import React, { useState } from 'react'
import { useTileStore, useAllTiles } from '../store/tileStore'

interface BlendPriorityPanelProps {
  className?: string
}

export function BlendPriorityPanel({ className = '' }: BlendPriorityPanelProps) {
  const tileStore = useTileStore()
  const allTiles = useAllTiles()
  const [selectedTileId, setSelectedTileId] = useState<string>('')
  
  // Only show floor tiles that can blend
  const floorTiles = allTiles.filter(tile => tile.category === 'floors')
  const selectedTile = floorTiles.find(t => t.id === selectedTileId)
  
  const handlePriorityChange = async (tileId: string, newPriority: number) => {
    await tileStore.updateTile(tileId, { blendPriority: newPriority })
  }
  
  const handlePriorityClick = (currentPriority: number, increment: boolean) => {
    if (!selectedTile) return
    const newPriority = increment 
      ? Math.min(10, (currentPriority || 1) + 1)
      : Math.max(0, (currentPriority || 1) - 1)
    handlePriorityChange(selectedTile.id, newPriority)
  }
  
  return (
    <div className={`blend-priority-panel ${className}`} style={{
      padding: '16px',
      background: '#141821',
      border: '1px solid #2a3441',
      borderRadius: '8px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '600',
          color: '#e6e6e6'
        }}>
          Tile Blend Priorities
        </h3>
        <div style={{
          fontSize: '10px',
          color: '#888',
          textAlign: 'right'
        }}>
          Higher numbers blend into lower ones
        </div>
      </div>
      
      {/* Tile Selection Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
        gap: '8px',
        marginBottom: '16px',
        maxHeight: '200px',
        overflowY: 'auto',
        padding: '4px'
      }}>
        {floorTiles.map(tile => (
          <div
            key={tile.id}
            onClick={() => setSelectedTileId(tile.id)}
            style={{
              position: 'relative',
              aspectRatio: '1',
              background: selectedTileId === tile.id ? '#7c8cff' : '#1f2430',
              border: `2px solid ${selectedTileId === tile.id ? '#7c8cff' : '#2a3441'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}
            title={`${tile.name} (Priority: ${tile.blendPriority || 1})`}
          >
            <img
              src={tile.thumb || tile.src}
              alt={tile.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            
            {/* Priority Badge */}
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: '600',
              padding: '2px 4px',
              borderRadius: '3px',
              minWidth: '16px',
              textAlign: 'center'
            }}>
              {tile.blendPriority || 1}
            </div>
          </div>
        ))}
      </div>
      
      {/* Priority Control for Selected Tile */}
      {selectedTile && (
        <div style={{
          padding: '16px',
          background: '#1f2430',
          border: '1px solid #2a3441',
          borderRadius: '6px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <img
              src={selectedTile.thumb || selectedTile.src}
              alt={selectedTile.name}
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'cover',
                borderRadius: '4px',
                border: '1px solid #2a3441'
              }}
            />
            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: '500',
                color: '#e6e6e6',
                marginBottom: '2px'
              }}>
                {selectedTile.name}
              </div>
              <div style={{
                fontSize: '10px',
                color: '#888'
              }}>
                Current Priority: {selectedTile.blendPriority || 1}
              </div>
            </div>
          </div>
          
          {/* Priority Adjustment Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => handlePriorityClick(selectedTile.blendPriority || 1, false)}
              disabled={(selectedTile.blendPriority || 1) <= 0}
              style={{
                width: '32px',
                height: '32px',
                background: (selectedTile.blendPriority || 1) <= 0 ? '#333' : '#dc2626',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (selectedTile.blendPriority || 1) <= 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              title="Decrease priority"
            >
              −
            </button>
            
            <div style={{
              minWidth: '80px',
              textAlign: 'center',
              fontSize: '18px',
              fontWeight: '600',
              color: '#7c8cff',
              padding: '8px 16px',
              background: '#141821',
              border: '1px solid #2a3441',
              borderRadius: '4px'
            }}>
              {selectedTile.blendPriority || 1}
            </div>
            
            <button
              onClick={() => handlePriorityClick(selectedTile.blendPriority || 1, true)}
              disabled={(selectedTile.blendPriority || 1) >= 10}
              style={{
                width: '32px',
                height: '32px',
                background: (selectedTile.blendPriority || 1) >= 10 ? '#333' : '#059669',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: (selectedTile.blendPriority || 1) >= 10 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              title="Increase priority"
            >
              +
            </button>
          </div>
          
          {/* Priority Guidelines */}
          <div style={{
            marginTop: '12px',
            fontSize: '10px',
            color: '#666',
            lineHeight: '1.4',
            textAlign: 'center'
          }}>
            <div><strong>Guidelines:</strong></div>
            <div>Grass: 1 • Stone: 2-3 • Wood: 4 • Cobblestone: 5 • Walls: 10</div>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {floorTiles.length === 0 && (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: '#888',
          fontSize: '12px'
        }}>
          No floor tiles available for blend priority settings.
        </div>
      )}
    </div>
  )
}