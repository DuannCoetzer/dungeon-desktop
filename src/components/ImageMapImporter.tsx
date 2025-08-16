import React, { useState, useRef, useCallback } from 'react'
import { useMapStore } from '../mapStore'
import type { MapData } from '../protocol'

interface ImageMapImporterProps {
  onClose: () => void
  onImported?: () => void
}

export function ImageMapImporter({ onClose, onImported }: ImageMapImporterProps) {
  const [file, setFile] = useState<File | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { loadMapData } = useMapStore()

  // Handle file selection - just set the file, don't process yet
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.type.startsWith('image/')) {
      setProcessingError('Please select a valid image file')
      return
    }

    setFile(selectedFile)
    setProcessingError(null)
  }, [])

  // Process image and convert to map data
  const processImageToMap = useCallback((file: File): Promise<MapData> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      const img = new Image()
      img.onload = () => {
        // Set canvas size based on image, but limit to reasonable map size
        const maxSize = 100 // Maximum map dimension
        const scale = Math.min(maxSize / img.width, maxSize / img.height)
        canvas.width = Math.floor(img.width * scale)
        canvas.height = Math.floor(img.height * scale)
        
        // Draw scaled image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        const mapData: MapData = {
          tiles: {
            floor: {},
            walls: {},
            objects: {}
          },
          assetInstances: [],
          characters: [],
          version: '1.0.0'
        }
        
        // Convert pixels to tiles
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            const a = data[i + 3]
            
            // Skip transparent pixels
            if (a < 128) continue
            
            const key = `${x},${y}`
            
            // Convert colors to tile types based on brightness and color
            const brightness = (r + g + b) / 3
            const isReddish = r > g + 30 && r > b + 30
            const isGreenish = g > r + 30 && g > b + 30
            const isBluish = b > r + 30 && b > g + 30
            
            if (brightness < 50) {
              // Very dark = walls
              mapData.tiles.walls[key] = 'wall'
            } else if (isBluish) {
              // Blue = water
              mapData.tiles.floor[key] = 'water'
            } else if (isGreenish && brightness > 100) {
              // Green = grass
              mapData.tiles.floor[key] = 'grass'
            } else if (isReddish) {
              // Red = lava or special floor
              mapData.tiles.floor[key] = 'lava'
            } else if (brightness > 200) {
              // Very bright = stone floor
              mapData.tiles.floor[key] = 'floor-stone-smooth'
            } else if (brightness > 120) {
              // Medium brightness = rough stone
              mapData.tiles.floor[key] = 'floor-stone-rough'
            } else {
              // Darker = dirt
              mapData.tiles.floor[key] = 'dirt'
            }
          }
        }
        
        resolve(mapData)
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      // Convert file to data URL
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })
  }, [])

  // Handle the actual import when user clicks Import button
  const handleImport = useCallback(async () => {
    if (!file) return
    
    try {
      setProcessingError(null)
      const mapData = await processImageToMap(file)
      loadMapData(mapData)
      onImported?.()
      onClose()
    } catch (error) {
      setProcessingError(error instanceof Error ? error.message : 'Failed to process image')
    }
  }, [file, processImageToMap, loadMapData, onImported, onClose])


  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2d3748',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        color: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'white'
          }}>Import Map from Image</h2>
          <button
            onClick={onClose}
            style={{
              color: '#9ca3af',
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        {/* File Upload */}
        <div style={{ marginBottom: '24px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Select Image File
          </button>
          {file && (
            <span style={{
              marginLeft: '12px',
              color: '#d1d5db'
            }}>
              Selected: {file.name}
            </span>
          )}
        </div>

        {processingError && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#7f1d1d',
            color: '#fecaca',
            borderRadius: '4px'
          }}>
            {processingError}
          </div>
        )}

        <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '24px' }}>
          Upload an image to convert it into a map. The image will be analyzed pixel by pixel:<br/>
          • <strong>Dark areas</strong> (black/very dark) → Walls<br/>
          • <strong>Blue areas</strong> → Water tiles<br/>
          • <strong>Green areas</strong> → Grass tiles<br/>
          • <strong>Red areas</strong> → Lava tiles<br/>
          • <strong>Bright areas</strong> → Stone floors<br/>
          • <strong>Medium areas</strong> → Rough stone or dirt<br/>
          The image will be scaled to fit within a 100x100 tile map.
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4b5563',
              color: 'white',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          
          {file && (
            <button
              onClick={handleImport}
              style={{
                padding: '8px 16px',
                backgroundColor: '#059669',
                color: 'white',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Import Map
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
