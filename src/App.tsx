import { Link, Route, Routes } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Game from './pages/Game'
import { Action } from './pages/Action'
import AssetDesigner from './pages/AssetDesigner'
import { IconBrand } from './assets'
import { DragDropProvider } from './components/DragDropProvider'
import SettingsMenu from './components/SettingsMenu'
import { useWarpDistortion, useParchmentCreases } from './store/settingsStore'

function App() {
  const enableWarpDistortion = useWarpDistortion()
  const enableParchmentCreases = useParchmentCreases()
  
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
