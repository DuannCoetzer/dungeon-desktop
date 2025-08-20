import React from 'react'
import { Link } from 'react-router-dom'
import { IconBrand } from '../assets'

export default function Home() {
  return (
    <main className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-icon">
            <img src={IconBrand} alt="Dungeon Desktop" className="hero-logo" />
          </div>
          <h1 className="hero-title">Dungeon Desktop</h1>
          <p className="hero-subtitle">
            A powerful desktop application for creating immersive dungeon maps and managing D&D adventures
          </p>
          
          <div className="hero-actions">
            <Link to="/map-builder" className="cta-button primary">
              🗺️ Start Building Maps
            </Link>
            <Link to="/dm-game" className="cta-button secondary">
              🎭 Launch DM Game
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section - Commented out for cleaner parchment look */}
      {/*
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number" data-target="10000">0</div>
            <div className="stat-label">Maps Created</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-target="250">0</div>
            <div className="stat-label">Built-in Assets</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-target="50">0</div>
            <div className="stat-label">Tile Types</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-target="99">0</div>
            <div className="stat-label">Satisfaction %</div>
          </div>
        </div>
      </section>
      */}

      {/* Features Section */}
      <section className="features">
        <h2 className="section-title">Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🏗️</div>
            <h3 className="feature-title">Map Builder</h3>
            <p className="feature-description">
              Create detailed dungeon maps with an intuitive tile-based editor. Paint floors, walls, and add custom assets.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎮</div>
            <h3 className="feature-title">DM Game Mode</h3>
            <p className="feature-description">
              Import and explore your maps in a dedicated gameplay view. Perfect for running D&D sessions.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3 className="feature-title">Asset Manager</h3>
            <p className="feature-description">
              Organize and import custom assets. Build your own library of tiles, objects, and decorations.
            </p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📁</div>
            <h3 className="feature-title">Export & Share</h3>
            <p className="feature-description">
              Export maps as high-resolution images or share JSON files with other DMs and players.
            </p>
          </div>
        </div>
      </section>

      {/* Credits Section */}
      <section className="credits">
        <h2 className="section-title">Credits & Tributes</h2>
        <div className="credits-content">
          <div className="credits-section">
            <h3 className="credits-category">Development</h3>
            <ul className="credits-list">
              <li><strong>Lead Developer:</strong> Studio Cosmic North</li>
              <li><strong>UI/UX Design:</strong> Modern React Architecture</li>
              <li><strong>Framework:</strong> Built with React + TypeScript</li>
              <li><strong>Desktop Runtime:</strong> Powered by Tauri</li>
            </ul>
          </div>
          
          <div className="credits-section">
            <h3 className="credits-category">Special Thanks</h3>
            <ul className="credits-list">
              <li><strong>D&D Community:</strong> For inspiring countless adventures</li>
              <li><strong>Open Source:</strong> React, Tauri, and the amazing dev community</li>
              <li><strong>Dungeon Masters:</strong> The unsung heroes of tabletop gaming</li>
              <li><strong>Players:</strong> Who bring maps to life with imagination</li>
            </ul>
          </div>
          
          <div className="credits-section">
            <h3 className="credits-category">Inspiration</h3>
            <ul className="credits-list">
              <li><strong>Classic RPGs:</strong> The golden age of dungeon crawlers</li>
              <li><strong>Tabletop Gaming:</strong> 40+ years of D&D tradition</li>
              <li><strong>Digital Tools:</strong> Making the impossible, possible</li>
              <li><strong>Creative Community:</strong> Artists, writers, and world builders</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="app-footer">
        <div className="footer-content">
          <div className="footer-info">
            <p className="footer-text">
              Built with ❤️ for the tabletop gaming community
            </p>
            <p className="footer-version">
              Version 1.0.0 • {new Date().getFullYear()} Studio Cosmic North
            </p>
          </div>
          
          <div className="footer-links">
            <Link to="/assets" className="footer-link">Asset Library</Link>
            <a href="#" className="footer-link" onClick={(e) => {
              e.preventDefault()
              alert('GitHub repository coming soon!')
            }}>GitHub</a>
            <a href="#" className="footer-link" onClick={(e) => {
              e.preventDefault()
              alert('Documentation coming soon!')
            }}>Documentation</a>
          </div>
        </div>
      </section>
    </main>
  )
}

