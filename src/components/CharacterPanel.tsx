import React, { useState } from 'react'
import type { CharacterToken } from '../protocol'

interface CharacterPanelProps {
  characters: CharacterToken[]
  onAddCharacter: (character: Omit<CharacterToken, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdateCharacter: (id: string, updates: Partial<CharacterToken>) => void
  onDeleteCharacter: (id: string) => void
  onSelectCharacter?: (character: CharacterToken | null) => void
  selectedCharacter?: CharacterToken | null
}

interface NewCharacterForm {
  name: string
  color: string
  size: number
  isVisible: boolean
  notes: string
}

const DEFAULT_COLORS = [
  '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff',
  '#ff8844', '#88ff44', '#4488ff', '#ff4488', '#8844ff', '#44ff88'
]

export function CharacterPanel({
  characters,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onSelectCharacter,
  selectedCharacter
}: CharacterPanelProps) {
  const [isAddingCharacter, setIsAddingCharacter] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<string | null>(null)
  const [newCharacter, setNewCharacter] = useState<NewCharacterForm>({
    name: '',
    color: DEFAULT_COLORS[0],
    size: 1,
    isVisible: true,
    notes: ''
  })

  const handleAddCharacter = () => {
    if (newCharacter.name.trim()) {
      onAddCharacter({
        name: newCharacter.name.trim(),
        x: 0, // Will be set when placed on map
        y: 0,
        color: newCharacter.color,
        size: newCharacter.size,
        isVisible: newCharacter.isVisible,
        notes: newCharacter.notes.trim() || undefined
      })
      
      setNewCharacter({
        name: '',
        color: DEFAULT_COLORS[0],
        size: 1,
        isVisible: true,
        notes: ''
      })
      setIsAddingCharacter(false)
    }
  }

  const handleUpdateCharacter = (character: CharacterToken, updates: Partial<CharacterToken>) => {
    onUpdateCharacter(character.id, updates)
    setEditingCharacter(null)
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
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600'
        }}>
          🎭 Characters ({characters.length})
        </h3>
        
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
      </div>

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

      {/* Character List */}
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {characters.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#7d8590',
            fontSize: '14px',
            padding: '20px'
          }}>
            No characters placed yet
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
                  ({character.x}, {character.y}) • {character.size}x
                  {!character.isVisible && ' • Hidden'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
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
    </div>
  )
}
