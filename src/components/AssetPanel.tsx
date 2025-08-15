import { useState, useEffect } from 'react'
import { useDrag } from 'react-dnd'
import type { Asset } from '../store'

// Individual draggable asset item
function AssetItem({ asset }: { asset: Asset }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'asset',
    item: { asset },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  return (
    <div
      ref={drag as any}
      className="asset-item"
      style={{
        padding: '8px',
        border: '1px solid #444',
        borderRadius: '4px',
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        textAlign: 'center',
        backgroundColor: '#1a1a1a',
        transition: 'opacity 0.2s',
      }}
    >
      <img
        src={asset.thumb}
        alt={asset.name}
        style={{
          width: '48px',
          height: '48px',
          objectFit: 'contain',
          display: 'block',
          margin: '0 auto 4px',
          pointerEvents: 'none',
        }}
      />
      <div style={{ fontSize: '12px', color: '#ccc', fontWeight: '500' }}>
        {asset.name}
      </div>
    </div>
  )
}

export function AssetPanel() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAssets() {
      try {
        const response = await fetch('/assets/manifest.json')
        if (!response.ok) {
          throw new Error(`Failed to load assets: ${response.statusText}`)
        }
        const data = await response.json()
        setAssets(data.assets || [])
      } catch (err) {
        console.error('Error loading assets:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadAssets()
  }, [])

  if (loading) {
    return (
      <div className="toolbar-section">
        <h3 className="toolbar-title">Assets</h3>
        <div style={{ color: '#888', fontSize: '14px', padding: '8px' }}>
          Loading assets...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="toolbar-section">
        <h3 className="toolbar-title">Assets</h3>
        <div style={{ color: '#ff6b6b', fontSize: '12px', padding: '8px' }}>
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="toolbar-section">
      <h3 className="toolbar-title">Assets</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          maxHeight: '300px',
          overflowY: 'auto',
        }}
      >
        {assets.map((asset) => (
          <AssetItem key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  )
}
