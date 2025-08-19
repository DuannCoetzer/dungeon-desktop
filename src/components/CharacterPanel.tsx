import React, { useState } from 'react'
import { useDrag } from 'react-dnd'
import type { CharacterToken } from '../protocol'
import type { PendingCharacter } from '../store/dmGameStore'
import { useAssetStore } from '../store/assetStore'

interface CharacterPanelProps {
  characters: CharacterToken[]
  pendingCharacters: PendingCharacter[]
  onAddCharacter: (character: { name: string; color: string; size: number; isVisible: boolean; avatarAssetId?: string; notes?: string; revealRange?: number }) => void
  onUpdateCharacter: (id: string, updates: Partial<CharacterToken>) => void
  onDeleteCharacter: (id: string) => void
  onRemovePendingCharacter: (id: string) => void
  onSelectCharacter?: (character: CharacterToken | null) => void
  selectedCharacter?: CharacterToken | null
}

interface NewCharacterForm {
  name: string
  color: string
  size: number
  isVisible: boolean
  avatarAssetId?: string
  notes: string
  revealRange?: number
}

const DEFAULT_COLORS = [
  '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff',
  '#ff8844', '#88ff44', '#4488ff', '#ff4488', '#8844ff', '#44ff88'
]

// Draggable pending character component
function DraggablePendingCharacter({ character, onRemove }: { 
  character: PendingCharacter
  onRemove: (id: string) => void 
}) {
  const assetStore = useAssetStore()
  
  const [{ isDragging }, drag] = useDrag({
    type: 'pending-character',
    item: { character },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={drag}
      style={{
        padding: '8px',
        marginBottom: '6px',
        backgroundColor: '#0d1117',
        border: '2px dashed #3b82f6',
        borderRadius: '4px',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: isDragging ? 0.5 : 1,
        transition: 'opacity 0.2s'
      }}
      title="Drag to map to place character"
    >
      <div
        style={{
          width: '12px',
          height: '12px',
          backgroundColor: character.color,
          borderRadius: '50%',
          opacity: character.isVisible ? 1 : 0.3
        }}
      />
      
      {character.avatarAssetId && (
        <img 
          src={assetStore.getAssetById(character.avatarAssetId)?.src} 
          alt="Avatar" 
          style={{ 
            width: '16px', 
            height: '16px', 
            borderRadius: '50%',
            border: '1px solid #30363d'
          }} 
        />
      )}
      
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: '500' }}>
          {character.name}
        </div>
        <div style={{ fontSize: '10px', color: '#7d8590' }}>
          {character.size}x • Drag to place
          {!character.isVisible && ' • Hidden'}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(character.id)
        }}
        style={{
          padding: '2px 6px',
          backgroundColor: '#dc2626',
          color: '#fff',
          border: 'none',
          borderRadius: '3px',
          fontSize: '10px',
          cursor: 'pointer'
        }}
        title="Delete pending character"
      >
        ✖
      </button>
    </div>
  )
}

export function CharacterPanel({
  characters,
  pendingCharacters,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onRemovePendingCharacter,
  onSelectCharacter,
  selectedCharacter
}: CharacterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAddingCharacter, setIsAddingCharacter] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null)
  const [newCharacter, setNewCharacter] = useState<NewCharacterForm>({
    name: '',
    color: DEFAULT_COLORS[0],
    size: 1,
    isVisible: true,
    avatarAssetId: undefined,
    notes: '',
    revealRange: 3
  })
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  
  const assetStore = useAssetStore()

  const handleAddCharacter = () => {
    if (newCharacter.name.trim()) {
      onAddCharacter({
        name: newCharacter.name.trim(),
        color: newCharacter.color,
        size: newCharacter.size,
        isVisible: newCharacter.isVisible,
        avatarAssetId: newCharacter.avatarAssetId,
        notes: newCharacter.notes.trim() || undefined,
        revealRange: newCharacter.revealRange
      })
      
      setNewCharacter({
        name: '',
        color: DEFAULT_COLORS[0],
        size: 1,
        isVisible: true,
        avatarAssetId: undefined,
        notes: '',
        revealRange: 3
      })
      setIsAddingCharacter(false)
      setShowAvatarPicker(false)
    }
  }

  const handleUpdateCharacter = (character: CharacterToken, updates: Partial<CharacterToken>) => {
    onUpdateCharacter(character.id, updates)
    // Don't close the editing form automatically - let user click "Done Editing"
  }

  const handleSelectCharacter = (character: CharacterToken) => {
    if (onSelectCharacter) {
      onSelectCharacter(selectedCharacter?.id === character.id ? null : character)
    }
  }

  return (
    <div style={{
      width: '280px',
      backgroundColor: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '8px',
      padding: '16px',
      color: '#e6e6e6'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isCollapsed ? '0' : '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600'
        }}>
          🎭 Characters ({characters.length})
        </h3>
        
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {!isCollapsed && (
            <button
              onClick={() => setIsAddingCharacter(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#238636',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + Add
            </button>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#7d8590',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Add Character Form */}
          {isAddingCharacter && (
            <div style={{
              padding: '12px',
              backgroundColor: '#0d1117',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '1px solid #30363d'
            }}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
              Character Name
            </label>
            <input
              type="text"
              value={newCharacter.name}
              onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
              placeholder="Enter character name"
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: '#21262d',
                border: '1px solid #30363d',
                borderRadius: '4px',
                color: '#e6e6e6',
                fontSize: '12px'
              }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
              Color
            </label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {DEFAULT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewCharacter({ ...newCharacter, color })}
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: color,
                    border: newCharacter.color === color ? '2px solid #fff' : '1px solid #30363d',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Avatar Selection */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
              Avatar (Optional)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {newCharacter.avatarAssetId ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <img 
                    src={assetStore.getAssetById(newCharacter.avatarAssetId)?.src} 
                    alt="Avatar" 
                    style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%',
                      border: '1px solid #30363d'
                    }} 
                  />
                  <button
                    onClick={() => setNewCharacter({ ...newCharacter, avatarAssetId: undefined })}
                    style={{
                      padding: '2px 6px',
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    ✖
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#238636',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  🖼️ Select Avatar
                </button>
              )}
            </div>
            
            {/* Avatar Picker */}
            {showAvatarPicker && (
              <div style={{
                marginTop: '6px',
                padding: '8px',
                backgroundColor: '#21262d',
                border: '1px solid #30363d',
                borderRadius: '4px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                  {assetStore.allAssets.filter(asset => 
                    asset.category === 'characters'
                  ).map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => {
                        setNewCharacter({ ...newCharacter, avatarAssetId: asset.id })
                        setShowAvatarPicker(false)
                      }}
                      style={{
                        padding: '2px',
                        backgroundColor: 'transparent',
                        border: '1px solid #30363d',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        aspectRatio: '1',
                        overflow: 'hidden'
                      }}
                      title={asset.name}
                    >
                      <img 
                        src={asset.src} 
                        alt={asset.name} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          borderRadius: '2px'
                        }} 
                      />
                    </button>
                  ))}
                </div>
                {assetStore.allAssets.filter(asset => 
                  asset.category === 'characters'
                ).length === 0 && (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#7d8590', 
                    fontSize: '10px', 
                    padding: '12px' 
                  }}>
                    No character avatars found. Upload images to the Asset Manager and categorize them as "Characters".
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
              Size: {newCharacter.size}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={newCharacter.size}
              onChange={(e) => setNewCharacter({ ...newCharacter, size: parseFloat(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
              Fog Reveal Range: {newCharacter.revealRange || 3} tiles
            </label>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={newCharacter.revealRange || 3}
              onChange={(e) => setNewCharacter({ ...newCharacter, revealRange: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '10px', color: '#7d8590', marginTop: '2px' }}>
              How many tiles around this character will reveal fog of war
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={newCharacter.isVisible}
                onChange={(e) => setNewCharacter({ ...newCharacter, isVisible: e.target.checked })}
                style={{ marginRight: '6px' }}
              />
              Visible to players
            </label>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleAddCharacter}
              disabled={!newCharacter.name.trim()}
              style={{
                flex: 1,
                padding: '6px 12px',
                backgroundColor: newCharacter.name.trim() ? '#238636' : '#6e7681',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: newCharacter.name.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Add Character
            </button>
            <button
              onClick={() => setIsAddingCharacter(false)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6e7681',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pending Characters */}
      {pendingCharacters.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: '#f0f6fc',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            📝 Ready to Place ({pendingCharacters.length})
          </h4>
          <div style={{ 
            padding: '8px', 
            backgroundColor: '#161b22', 
            borderRadius: '6px',
            border: '1px solid #30363d',
            marginBottom: '12px'
          }}>
            <div style={{
              fontSize: '11px',
              color: '#7d8590',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              💡 Drag characters below to the map to place them
            </div>
            {pendingCharacters.map(character => (
              <DraggablePendingCharacter
                key={character.id}
                character={character}
                onRemove={onRemovePendingCharacter}
              />
            ))}
          </div>
        </div>
      )}

      {/* Placed Characters */}
      <div style={{ marginBottom: '8px' }}>
        <h4 style={{
          margin: '0',
          fontSize: '14px',
          fontWeight: '600',
          color: '#f0f6fc'
        }}>
          🗺️ On Map ({characters.length})
        </h4>
      </div>
      
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {characters.length === 0 && pendingCharacters.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#7d8590',
            fontSize: '14px',
            padding: '20px'
          }}>
            No characters created yet
          </div>
        ) : characters.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#7d8590',
            fontSize: '12px',
            padding: '16px',
            fontStyle: 'italic'
          }}>
            Characters will appear here once placed on the map
          </div>
        ) : (
          characters.map(character => (
            <div
              key={character.id}
              onClick={() => handleSelectCharacter(character)}
              style={{
                padding: '8px',
                marginBottom: '6px',
                backgroundColor: selectedCharacter?.id === character.id ? '#1f2937' : '#0d1117',
                border: selectedCharacter?.id === character.id ? '1px solid #3b82f6' : '1px solid #30363d',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: character.color,
                  borderRadius: '50%',
                  opacity: character.isVisible ? 1 : 0.3
                }}
              />
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '500' }}>
                  {character.name}
                </div>
                <div style={{ fontSize: '10px', color: '#7d8590' }}>
                  ({character.x}, {character.y}) • {character.size}x • Reveals {character.revealRange || 3} tiles
                  {!character.isVisible && ' • Hidden'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingCharacter(editingCharacter === character.id ? null : character.id)
                  }}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: editingCharacter === character.id ? '#3b82f6' : '#6b7280',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                  title="Edit character settings"
                >
                  ⚙️
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdateCharacter(character.id, { isVisible: !character.isVisible })
                  }}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: character.isVisible ? '#f59e0b' : '#6b7280',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                  title={character.isVisible ? 'Hide character' : 'Show character'}
                >
                  {character.isVisible ? '👁' : '🙈'}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteCharacter(character.id)
                  }}
                  style={{
                    padding: '2px 6px',
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                  title="Delete character"
                >
                  ✖
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Character Editing Form */}
      {editingCharacter && (() => {
        const character = characters.find(c => c.id === editingCharacter)
        return character ? (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#0d1117',
            border: '1px solid #3b82f6',
            borderRadius: '6px'
          }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#3b82f6' }}>Editing: {character.name}</h5>
            
            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Reveal Range: {character.revealRange || 3} tiles</label>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={character.revealRange || 3}
                onChange={(e) => handleUpdateCharacter(character, { revealRange: parseInt(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '10px', color: '#7d8590', marginTop: '2px' }}>
                How many tiles around this character will reveal fog of war
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Size: {character.size}x</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={character.size}
                onChange={(e) => handleUpdateCharacter(character, { size: parseFloat(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
              <button
                onClick={() => setEditingCharacter(null)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  backgroundColor: '#238636',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Done Editing
              </button>
            </div>
          </div>
        ) : null
      })()}

      {selectedCharacter && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#0d1117',
          borderRadius: '4px',
          border: '1px solid #30363d',
          fontSize: '11px',
          color: '#7d8590'
        }}>
          💡 Click on the map to move {selectedCharacter.name}
        </div>
      )}
        </>
      )}
    </div>
  )
}
