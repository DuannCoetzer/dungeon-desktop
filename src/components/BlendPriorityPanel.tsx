import React, { useState } from 'react'
import { useTileStore, useAllTiles } from '../store/tileStore'

interface BlendPriorityPanelProps {
  className?: string
}

export function BlendPriorityPanel({ className = '' }: BlendPriorityPanelProps) {
  const tileStore = useTileStore()
  const allTiles = useAllTiles()
  const [selectedTileId, setSelectedTileId] = useState<string>('')
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>({})
  const [isApplying, setIsApplying] = useState(false)
  
  // Only show floor tiles that can blend
  const floorTiles = allTiles.filter(tile => tile.category === 'floors')
  const selectedTile = floorTiles.find(t => t.id === selectedTileId)
  
  // Get the effective priority (pending change or current value)
  const getEffectivePriority = (tileId: string) => {
    return pendingChanges[tileId] !== undefined ? pendingChanges[tileId] : (allTiles.find(t => t.id === tileId)?.blendPriority || 1)
  }
  
  const handlePriorityChange = (tileId: string, newPriority: number) => {
    setPendingChanges(prev => ({ ...prev, [tileId]: newPriority }))
  }
  
  const handlePriorityClick = (currentPriority: number, increment: boolean) => {
    if (!selectedTile) return
    const newPriority = increment 
      ? Math.min(10, currentPriority + 1)
      : Math.max(0, currentPriority - 1)
    handlePriorityChange(selectedTile.id, newPriority)
  }
  
  const applyChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return
    
    setIsApplying(true)
    try {
      // Apply all pending changes at once
      for (const [tileId, priority] of Object.entries(pendingChanges)) {
        await tileStore.updateTile(tileId, { blendPriority: priority })
      }
      
      // Clear pending changes after successful application
      setPendingChanges({})
    } catch (error) {
      console.error('Failed to apply blend priority changes:', error)
      alert('Failed to apply changes. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }
  
  const discardChanges = () => {
    setPendingChanges({})
  }
  
  const hasPendingChanges = Object.keys(pendingChanges).length > 0
  
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
            title={`${tile.name} (Priority: ${getEffectivePriority(tile.id)}${pendingChanges[tile.id] !== undefined ? ' - PENDING' : ''})`}
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
              background: pendingChanges[tile.id] !== undefined ? 'rgba(251, 191, 36, 0.9)' : 'rgba(0, 0, 0, 0.8)',
              color: pendingChanges[tile.id] !== undefined ? '#000' : '#fff',
              fontSize: '10px',
              fontWeight: '600',
              padding: '2px 4px',
              borderRadius: '3px',
              minWidth: '16px',
              textAlign: 'center',
              border: pendingChanges[tile.id] !== undefined ? '1px solid #f59e0b' : 'none'
            }}>
              {getEffectivePriority(tile.id)}
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
                color: pendingChanges[selectedTile.id] !== undefined ? '#f59e0b' : '#888'
              }}>
                {pendingChanges[selectedTile.id] !== undefined ? 'Pending' : 'Current'} Priority: {getEffectivePriority(selectedTile.id)}
                {pendingChanges[selectedTile.id] !== undefined && (
                  <span style={{ color: '#888', marginLeft: '8px' }}>was {selectedTile.blendPriority || 1}</span>
                )}
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
              onClick={() => handlePriorityClick(getEffectivePriority(selectedTile.id), false)}
              disabled={getEffectivePriority(selectedTile.id) <= 0}
              style={{
                width: '32px',
                height: '32px',
                background: getEffectivePriority(selectedTile.id) <= 0 ? '#333' : '#dc2626',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: getEffectivePriority(selectedTile.id) <= 0 ? 'not-allowed' : 'pointer',
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
              color: pendingChanges[selectedTile.id] !== undefined ? '#f59e0b' : '#7c8cff',
              padding: '8px 16px',
              background: pendingChanges[selectedTile.id] !== undefined ? '#fef3c7' : '#141821',
              border: `1px solid ${pendingChanges[selectedTile.id] !== undefined ? '#f59e0b' : '#2a3441'}`,
              borderRadius: '4px'
            }}>
              {getEffectivePriority(selectedTile.id)}
            </div>
            
            <button
              onClick={() => handlePriorityClick(getEffectivePriority(selectedTile.id), true)}
              disabled={getEffectivePriority(selectedTile.id) >= 10}
              style={{
                width: '32px',
                height: '32px',
                background: getEffectivePriority(selectedTile.id) >= 10 ? '#333' : '#059669',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: getEffectivePriority(selectedTile.id) >= 10 ? 'not-allowed' : 'pointer',
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
          
          {/* Apply/Discard Changes */}
          {hasPendingChanges && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              color: '#92400e'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                📝 {Object.keys(pendingChanges).length} Pending Change{Object.keys(pendingChanges).length !== 1 ? 's' : ''}
              </div>
              
              <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={discardChanges}
                  disabled={isApplying}
                  style={{
                    padding: '6px 12px',
                    background: '#e5e7eb',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    color: '#374151',
                    fontSize: '11px',
                    cursor: isApplying ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    opacity: isApplying ? 0.6 : 1
                  }}
                  title="Discard all pending changes"
                >
                  Discard
                </button>
                
                <button
                  onClick={applyChanges}
                  disabled={isApplying}
                  style={{
                    padding: '6px 12px',
                    background: isApplying ? '#9ca3af' : '#059669',
                    border: '1px solid #047857',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: isApplying ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  title="Apply all pending changes"
                >
                  {isApplying ? 'Applying...' : 'Apply Changes'}
                </button>
              </div>
            </div>
          )}
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