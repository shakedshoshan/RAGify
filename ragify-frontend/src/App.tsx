import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Navigation from './components/Navigation'
import HomePage from './pages/HomePage'
import TextPage from './pages/TextPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/text" element={<TextPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
