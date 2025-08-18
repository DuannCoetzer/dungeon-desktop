import React, { useState, useCallback } from 'react'
import { useGenerationParams, useUIStore } from '../uiStore'
import type { GenerationParameters } from '../uiStore'
import { generateMap } from '../protocol'

// Define presets for generation parameters
const PRESETS: Record<string, GenerationParameters> = {
  default: {
    seed: undefined,
    roomCount: 8,
    corridorWidth: 3,
    roomSizeMin: 4,
    roomSizeMax: 12,
    complexity: 0.5,
    noiseScale: 1.0,
    biomeThresholds: { water: 0.3, grass: 0.6, mountain: 0.8 },
    assetDensity: 0.5
  },
  dense: {
    seed: undefined,
    roomCount: 15,
    corridorWidth: 2,
    roomSizeMin: 3,
    roomSizeMax: 8,
    complexity: 0.8,
    noiseScale: 1.5,
    biomeThresholds: { water: 0.2, grass: 0.5, mountain: 0.7 },
    assetDensity: 0.8
  },
  sparse: {
    seed: undefined,
    roomCount: 4,
    corridorWidth: 4,
    roomSizeMin: 6,
    roomSizeMax: 16,
    complexity: 0.3,
    noiseScale: 0.7,
    biomeThresholds: { water: 0.4, grass: 0.7, mountain: 0.9 },
    assetDensity: 0.2
  },
  organic: {
    seed: undefined,
    roomCount: 10,
    corridorWidth: 3,
    roomSizeMin: 5,
    roomSizeMax: 14,
    complexity: 0.7,
    noiseScale: 2.0,
    biomeThresholds: { water: 0.25, grass: 0.65, mountain: 0.85 },
    assetDensity: 0.6
  },
  geometric: {
    seed: undefined,
    roomCount: 12,
    corridorWidth: 3,
    roomSizeMin: 4,
    roomSizeMax: 10,
    complexity: 0.4,
    noiseScale: 0.5,
    biomeThresholds: { water: 0.33, grass: 0.66, mountain: 0.8 },
    assetDensity: 0.4
  }
}

// Validation functions
const validateSeed = (seed: string): boolean => {
  return seed.length === 0 || /^[a-zA-Z0-9_-]*$/.test(seed)
}

const validateRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max
}

const validateBiomeThresholds = (thresholds: GenerationParameters['biomeThresholds']): boolean => {
  return thresholds.water >= 0 && thresholds.water <= 1 &&
         thresholds.grass >= 0 && thresholds.grass <= 1 &&
         thresholds.mountain >= 0 && thresholds.mountain <= 1 &&
         thresholds.water < thresholds.grass &&
         thresholds.grass < thresholds.mountain
}

// Slider component with validation
interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
  error?: string
}

const SliderControl: React.FC<SliderControlProps> = ({ 
  label, value, min, max, step, unit = '', onChange, error 
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#a3aab8', marginBottom: 4 }}>
          {label}
        </label>
        <input 
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ 
            width: '100%',
            accentColor: '#7c8cff'
          }}
        />
        {error && <div style={{ fontSize: '10px', color: '#ff6b6b', marginTop: 2 }}>{error}</div>}
      </div>
      <span style={{ 
        width: 60, 
        textAlign: 'right', 
        fontSize: '12px',
        color: error ? '#ff6b6b' : '#e5e7eb'
      }}>
        {value.toFixed(step < 1 ? 2 : 0)}{unit}
      </span>
    </div>
  )
}

// Text input component with validation
interface TextInputProps {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
  error?: string
}

const TextInput: React.FC<TextInputProps> = ({ label, value, placeholder, onChange, error }) => {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', color: '#a3aab8', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 8px',
          background: '#141821',
          border: `1px solid ${error ? '#ff6b6b' : '#1f2430'}`,
          borderRadius: '4px',
          color: '#e5e7eb',
          fontSize: '12px',
        }}
      />
      {error && <div style={{ fontSize: '10px', color: '#ff6b6b', marginTop: 2 }}>{error}</div>}
    </div>
  )
}

// Dropdown component for presets
interface DropdownProps {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}

const Dropdown: React.FC<DropdownProps> = ({ label, value, options, onChange }) => {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', color: '#a3aab8', marginBottom: 4 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 8px',
          background: '#141821',
          border: '1px solid #1f2430',
          borderRadius: '4px',
          color: '#e5e7eb',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function GenerationParametersPanel() {
  const params = useGenerationParams()
  const setGenerationParams = useUIStore(state => state.setGenerationParams)
  const clearAllTempState = useUIStore(state => state.clearAllTempState)
  const [selectedPreset, setSelectedPreset] = useState<string>('custom')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate a random seed
  const generateRandomSeed = useCallback(() => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const seed = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    setGenerationParams({ seed })
    setSelectedPreset('custom')
  }, [setGenerationParams])

  // Update parameter with validation
  const updateParam = useCallback((key: keyof GenerationParameters, value: any) => {
    const newParams = { ...params, [key]: value }
    
    // Validate the parameter
    const newErrors = { ...errors }
    
    switch (key) {
      case 'seed':
        if (value && !validateSeed(value)) {
          newErrors.seed = 'Seed must contain only letters, numbers, hyphens, and underscores'
        } else {
          delete newErrors.seed
        }
        break
      case 'roomCount':
        if (!validateRange(value, 1, 50)) {
          newErrors.roomCount = 'Room count must be between 1 and 50'
        } else {
          delete newErrors.roomCount
        }
        break
      case 'corridorWidth':
        if (!validateRange(value, 1, 10)) {
          newErrors.corridorWidth = 'Corridor width must be between 1 and 10'
        } else {
          delete newErrors.corridorWidth
        }
        break
      case 'roomSizeMin':
        if (!validateRange(value, 2, 30) || value >= params.roomSizeMax) {
          newErrors.roomSizeMin = 'Min room size must be between 2 and 30, and less than max'
        } else {
          delete newErrors.roomSizeMin
        }
        break
      case 'roomSizeMax':
        if (!validateRange(value, 3, 50) || value <= params.roomSizeMin) {
          newErrors.roomSizeMax = 'Max room size must be between 3 and 50, and greater than min'
        } else {
          delete newErrors.roomSizeMax
        }
        break
      case 'complexity':
        if (!validateRange(value, 0, 1)) {
          newErrors.complexity = 'Complexity must be between 0 and 1'
        } else {
          delete newErrors.complexity
        }
        break
      case 'noiseScale':
        if (!validateRange(value, 0.1, 5)) {
          newErrors.noiseScale = 'Noise scale must be between 0.1 and 5'
        } else {
          delete newErrors.noiseScale
        }
        break
      case 'assetDensity':
        if (!validateRange(value, 0, 1)) {
          newErrors.assetDensity = 'Asset density must be between 0 and 1'
        } else {
          delete newErrors.assetDensity
        }
        break
    }

    // Validate biome thresholds whenever any threshold changes
    if (key === 'biomeThresholds' || key.includes('biome')) {
      if (!validateBiomeThresholds(newParams.biomeThresholds)) {
        newErrors.biomeThresholds = 'Thresholds must be 0-1 and water < grass < mountain'
      } else {
        delete newErrors.biomeThresholds
      }
    }

    setErrors(newErrors)
    setGenerationParams({ [key]: value })
    setSelectedPreset('custom') // Switch to custom when manually changing values
  }, [params, errors, setGenerationParams])

  // Update biome threshold
  const updateBiomeThreshold = useCallback((biome: keyof GenerationParameters['biomeThresholds'], value: number) => {
    const newThresholds = { ...params.biomeThresholds, [biome]: value }
    updateParam('biomeThresholds', newThresholds)
  }, [params.biomeThresholds, updateParam])

  // Apply preset
  const applyPreset = useCallback((presetName: string) => {
    if (presetName === 'custom') return
    
    const preset = PRESETS[presetName]
    if (preset) {
      setGenerationParams(preset)
      setSelectedPreset(presetName)
      setErrors({}) // Clear errors when applying preset
    }
  }, [setGenerationParams])

  // Handle generate button click
  const handleGenerate = useCallback(async () => {
    // Check for validation errors
    if (Object.keys(errors).length > 0) {
      return // Don't generate if there are validation errors
    }

    setIsGenerating(true)
    try {
      // Clear any existing tool preview state
      clearAllTempState()
      
      // Generate the map using current parameters
      generateMap(params)
    } catch (error) {
      console.error('Failed to generate map:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [params, errors, clearAllTempState])

  const presetOptions = [
    { value: 'custom', label: 'Custom' },
    { value: 'default', label: 'Default' },
    { value: 'dense', label: 'Dense' },
    { value: 'sparse', label: 'Sparse' },
    { value: 'organic', label: 'Organic' },
    { value: 'geometric', label: 'Geometric' }
  ]

  return (
    <div className="toolbar-section">
      <h3 className="toolbar-title">Generation Parameters</h3>
      
      <div style={{ display: 'grid', gap: 12 }}>
        {/* Presets */}
        <Dropdown
          label="Presets"
          value={selectedPreset}
          options={presetOptions}
          onChange={applyPreset}
        />

        {/* Seed */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'end' }}>
          <TextInput
            label="Seed"
            value={params.seed || ''}
            placeholder="Leave empty for random"
            onChange={(value) => updateParam('seed', value || undefined)}
            error={errors.seed}
          />
          <button
            className="tool-button"
            onClick={generateRandomSeed}
            style={{ padding: '6px 8px', fontSize: '10px' }}
          >
            🎲
          </button>
        </div>

        {/* Basic Parameters */}
        <SliderControl
          label="Room Count"
          value={params.roomCount}
          min={1}
          max={50}
          step={1}
          onChange={(value) => updateParam('roomCount', value)}
          error={errors.roomCount}
        />

        <SliderControl
          label="Corridor Width"
          value={params.corridorWidth}
          min={1}
          max={10}
          step={1}
          onChange={(value) => updateParam('corridorWidth', value)}
          error={errors.corridorWidth}
        />

        <SliderControl
          label="Min Room Size"
          value={params.roomSizeMin}
          min={2}
          max={30}
          step={1}
          onChange={(value) => updateParam('roomSizeMin', value)}
          error={errors.roomSizeMin}
        />

        <SliderControl
          label="Max Room Size"
          value={params.roomSizeMax}
          min={3}
          max={50}
          step={1}
          onChange={(value) => updateParam('roomSizeMax', value)}
          error={errors.roomSizeMax}
        />

        <SliderControl
          label="Complexity"
          value={params.complexity}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => updateParam('complexity', value)}
          error={errors.complexity}
        />

        {/* Advanced Parameters */}
        <div style={{ borderTop: '1px solid #22262e', paddingTop: 12, marginTop: 8, display: 'none' }}>
          <SliderControl
            label="Noise Scale"
            value={params.noiseScale}
            min={0.1}
            max={5}
            step={0.1}
            onChange={(value) => updateParam('noiseScale', value)}
            error={errors.noiseScale}
          />

          <SliderControl
            label="Asset Density"
            value={params.assetDensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => updateParam('assetDensity', value)}
            error={errors.assetDensity}
          />

          {/* Biome Thresholds */}
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#a3aab8', marginBottom: 8 }}>
              Biome Thresholds
            </label>
            {errors.biomeThresholds && (
              <div style={{ fontSize: '10px', color: '#ff6b6b', marginBottom: 8 }}>
                {errors.biomeThresholds}
              </div>
            )}
            
            <SliderControl
              label="Water"
              value={params.biomeThresholds.water}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateBiomeThreshold('water', value)}
            />

            <SliderControl
              label="Grass"
              value={params.biomeThresholds.grass}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateBiomeThreshold('grass', value)}
            />

            <SliderControl
              label="Mountain"
              value={params.biomeThresholds.mountain}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateBiomeThreshold('mountain', value)}
            />
          </div>
        </div>
        
        {/* Generate Button */}
        <div style={{ borderTop: '1px solid #22262e', paddingTop: 12, marginTop: 12 }}>
          <button
            className="tool-button"
            onClick={handleGenerate}
            disabled={isGenerating || Object.keys(errors).length > 0}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: isGenerating ? '#4a4d54' : '#7c8cff',
              color: isGenerating ? '#9ca3af' : '#ffffff',
              cursor: isGenerating || Object.keys(errors).length > 0 ? 'not-allowed' : 'pointer',
              opacity: isGenerating || Object.keys(errors).length > 0 ? 0.6 : 1
            }}
          >
            {isGenerating ? '⏳ Generating...' : '🗺️ Generate Map'}
          </button>
          {Object.keys(errors).length > 0 && (
            <div style={{ fontSize: '10px', color: '#ff6b6b', marginTop: 4, textAlign: 'center' }}>
              Fix validation errors before generating
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
