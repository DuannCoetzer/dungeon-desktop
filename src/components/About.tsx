import React from 'react'

interface AboutProps {
  onClose: () => void
}

export function About({ onClose }: AboutProps) {
  const currentYear = new Date().getFullYear()
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        border: '1px solid #333',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🗺️</div>
          <h1 style={{ 
            color: '#fff', 
            fontSize: '28px', 
            margin: '0 0 8px 0',
            fontWeight: '600'
          }}>
            Dungeon Desktop
          </h1>
          <p style={{ 
            color: '#888', 
            fontSize: '16px',
            margin: '0',
            fontStyle: 'italic'
          }}>
            Professional D&D Map Creation Tool
          </p>
          <p style={{ 
            color: '#666', 
            fontSize: '14px',
            margin: '8px 0 0 0'
          }}>
            Version 1.0.0
          </p>
        </div>

        {/* Studio Cosmic North Branding */}
        <div style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px',
          textAlign: 'center',
          border: '1px solid #444'
        }}>
          <h2 style={{ 
            color: '#7c8cff', 
            fontSize: '20px', 
            margin: '0 0 12px 0',
            fontWeight: '600'
          }}>
            🌌 Studio Cosmic North
          </h2>
          <p style={{ 
            color: '#ccc', 
            fontSize: '14px',
            lineHeight: '1.5',
            margin: '0 0 12px 0'
          }}>
            Creators of professional tabletop gaming tools and digital experiences.
            Crafting innovative software for dungeon masters, players, and storytellers worldwide.
          </p>
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <a 
              href="https://studiocosmicnorth.com" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#7c8cff',
                textDecoration: 'none',
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '4px',
                backgroundColor: '#333',
                border: '1px solid #555'
              }}
            >
              🌐 Website
            </a>
            <a 
              href="https://studiocosmicnorth.com/support" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#7c8cff',
                textDecoration: 'none',
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '4px',
                backgroundColor: '#333',
                border: '1px solid #555'
              }}
            >
              💬 Support
            </a>
            <a 
              href="https://studiocosmicnorth.com/dungeondesktop" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#7c8cff',
                textDecoration: 'none',
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '4px',
                backgroundColor: '#333',
                border: '1px solid #555'
              }}
            >
              📚 Documentation
            </a>
          </div>
        </div>

        {/* Features */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: '#fff', 
            fontSize: '18px', 
            margin: '0 0 12px 0',
            fontWeight: '600'
          }}>
            ✨ Features
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <div style={{ color: '#ccc', fontSize: '14px' }}>
              🎨 Tile-based map building
            </div>
            <div style={{ color: '#ccc', fontSize: '14px' }}>
              🖼️ Asset management system
            </div>
            <div style={{ color: '#ccc', fontSize: '14px' }}>
              🎭 Character token support
            </div>
            <div style={{ color: '#ccc', fontSize: '14px' }}>
              📐 Measurement tools
            </div>
            <div style={{ color: '#ccc', fontSize: '14px' }}>
              🌍 Multiple map modes
            </div>
            <div style={{ color: '#ccc', fontSize: '14px' }}>
              💾 Export capabilities
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: '#fff', 
            fontSize: '18px', 
            margin: '0 0 12px 0',
            fontWeight: '600'
          }}>
            ⚙️ Built With
          </h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {['React', 'TypeScript', 'Tauri', 'Rust', 'Vite', 'Canvas API'].map(tech => (
              <span key={tech} style={{
                backgroundColor: '#333',
                color: '#ccc',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                border: '1px solid #555'
              }}>
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Legal */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: '#fff', 
            fontSize: '18px', 
            margin: '0 0 12px 0',
            fontWeight: '600'
          }}>
            📄 Legal
          </h3>
          <div style={{ color: '#888', fontSize: '12px', lineHeight: '1.5' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              Copyright © {currentYear} <strong style={{ color: '#7c8cff' }}>Studio Cosmic North</strong>. All rights reserved.
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              Dungeon Desktop is proprietary software developed by Studio Cosmic North.
              This software is licensed, not sold.
            </p>
            <p style={{ margin: '0' }}>
              D&D is a trademark of Wizards of the Coast LLC. This software is not affiliated 
              with or endorsed by Wizards of the Coast LLC.
            </p>
          </div>
        </div>

        {/* System Info */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            color: '#fff', 
            fontSize: '18px', 
            margin: '0 0 12px 0',
            fontWeight: '600'
          }}>
            🔧 System Information
          </h3>
          <div style={{ 
            backgroundColor: '#2a2a2a', 
            borderRadius: '4px', 
            padding: '12px',
            border: '1px solid #444'
          }}>
            <div style={{ color: '#ccc', fontSize: '12px', fontFamily: 'monospace' }}>
              <div>Platform: {navigator.platform}</div>
              <div>User Agent: {navigator.userAgent.split(' ').slice(-2).join(' ')}</div>
              <div>Screen: {window.screen.width}×{window.screen.height}</div>
              <div>Language: {navigator.language}</div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#7c8cff',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#6a7cf0'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#7c8cff'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
