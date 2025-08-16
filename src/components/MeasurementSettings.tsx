import React from 'react'

interface MeasurementSettingsProps {
  gridSize: number
  distancePerCell: number
  units: string
  onGridSizeChange: (size: number) => void
  onDistancePerCellChange: (distance: number) => void
  onUnitsChange: (units: string) => void
}

export function MeasurementSettings({
  gridSize,
  distancePerCell,
  units,
  onGridSizeChange,
  onDistancePerCellChange,
  onUnitsChange
}: MeasurementSettingsProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  
  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '16px',
      backgroundColor: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '8px',
      padding: '16px',
      minWidth: '200px',
      fontSize: '14px',
      color: '#e6edf3'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isCollapsed ? '0' : '16px'
      }}>
        <h3 style={{
          margin: '0',
          fontSize: '16px',
          fontWeight: '600',
          color: '#f0f6fc'
        }}>Measurement Settings</h3>
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
          title={isCollapsed ? 'Expand settings' : 'Collapse settings'}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
      </div>
      
      {!isCollapsed && (
        <>
      <div style={{ marginBottom: '8px' }}>
        <label style={{
          display: 'block',
          color: '#ccc',
          fontSize: '12px',
          marginBottom: '4px'
        }}>
          Distance per cell:
        </label>
        <input
          type="number"
          value={distancePerCell}
          onChange={(e) => onDistancePerCellChange(Number(e.target.value))}
          min="0.5"
          step="0.5"
          style={{
            width: '100%',
            padding: '4px 6px',
            borderRadius: '3px',
            border: '1px solid #555',
            background: '#222',
            color: '#fff',
            fontSize: '12px'
          }}
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={{
          display: 'block',
          color: '#ccc',
          fontSize: '12px',
          marginBottom: '4px'
        }}>
          Units:
        </label>
        <select
          value={units}
          onChange={(e) => onUnitsChange(e.target.value)}
          style={{
            width: '100%',
            padding: '4px 6px',
            borderRadius: '3px',
            border: '1px solid #555',
            background: '#222',
            color: '#fff',
            fontSize: '12px'
          }}
        >
          <option value="ft">feet (ft)</option>
          <option value="m">meters (m)</option>
          <option value="sq">squares</option>
        </select>
      </div>

      <div style={{
        fontSize: '11px',
        color: '#888',
        marginTop: '10px',
        lineHeight: '1.3'
      }}>
        Right-click and drag to measure distances.<br/>
        Press ` (backtick) to clear all measurements.
      </div>
        </>
      )}
    </div>
  )
}
