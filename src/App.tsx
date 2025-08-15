import { Link, Route, Routes } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Game from './pages/Game'
import { Action } from './pages/Action'
import AssetDesigner from './pages/AssetDesigner'
import { IconBrand } from './assets'
import { DragDropProvider } from './components/DragDropProvider'

function App() {
  return (
    <DragDropProvider>
      <div className="app-root">
        <header className="app-header">
          <div className="brand">
            <img className="brand-logo" src={IconBrand} alt="" aria-hidden />
            <span className="brand-name">Dungeon Desktop</span>
          </div>
          <nav className="top-nav">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/game" className="nav-link">Game</Link>
            <Link to="/action" className="nav-link">Action</Link>
            <Link to="/assets" className="nav-link">Assets</Link>
          </nav>
        </header>

        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game" element={<Game />} />
            <Route path="/action" element={<Action />} />
            <Route path="/assets" element={<AssetDesigner />} />
          </Routes>
        </div>
      </div>
    </DragDropProvider>
  )
}

export default App
