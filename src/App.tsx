import { Link, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import Home from './pages/Home'
import Game from './pages/Game'
import { Action } from './pages/Action'
import AssetDesigner from './pages/AssetDesigner'
import { IconBrand } from './assets'
import { DragDropProvider } from './components/DragDropProvider'
import SettingsMenu from './components/SettingsMenu'
import { useWarpDistortion, useParchmentCreases } from './store/settingsStore'
import { useTileStore } from './store/tileStore'
import { useAssetStore } from './store/assetStore'

function App() {
  const enableWarpDistortion = useWarpDistortion()
  const enableParchmentCreases = useParchmentCreases()
  
  // Get store initialization functions
  const tileStore = useTileStore()
  const assetStore = useAssetStore()
  
  // Initialize stores on app startup
  useEffect(() => {
    const initializeStores = async () => {
      console.log('🚀 Initializing application stores...')
      
      try {
        // Load default tiles first (synchronous)
        tileStore.loadDefaultTiles()
        
        // Attempt migration from localStorage to file storage
        console.log('🔄 Checking for localStorage migration...')
        await tileStore.migrateFromLocalStorage()
        
        // Load imported tiles from file storage
        console.log('📁 Loading imported tiles from file storage...')
        await tileStore.loadImportedTiles()
        
        // Load assets
        console.log('🎨 Loading default assets...')
        await assetStore.loadDefaultAssets()
        
        console.log('📁 Loading imported assets...')
        await assetStore.loadImportedAssets()
        
        console.log('✅ All stores initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize stores:', error)
      }
    }
    
    initializeStores()
  }, [])
  
  // Build dynamic class names based on settings
  const appRootClasses = [
    'app-root',
    enableWarpDistortion && 'warp-distortion',
    enableParchmentCreases && 'parchment-creases'
  ].filter(Boolean).join(' ')
  
  return (
    <DragDropProvider>
      <div className={appRootClasses}>
        <header className="app-header">
          <div className="brand">
            <SettingsMenu />
            <img className="brand-logo" src={IconBrand} alt="" aria-hidden />
            <span className="brand-name">Dungeon Desktop</span>
          </div>
          <nav className="top-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/map-builder" className="nav-link">Map Builder</Link>
            <Link to="/dm-game" className="nav-link">DM Game</Link>
            <Link to="/assets" className="nav-link">Assets</Link>
          </nav>
        </header>

        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map-builder" element={<Game />} />
            <Route path="/dm-game" element={<Action />} />
            <Route path="/assets" element={<AssetDesigner />} />
          </Routes>
        </div>
      </div>
    </DragDropProvider>
  )
}

export default App
