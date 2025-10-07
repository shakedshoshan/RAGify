import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import { Provider } from 'react-redux'
import { store } from './store/store'
import { AuthProvider } from './contexts/AuthContext'
import Navigation from './components/Navigation'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { 
  HomePage, 
  ProjectsPage,
  ProjectDetailsPage,
  TextPage, 
  ChatbotTestingPage,
  LoginPage, 
  RegisterPage, 
  ProfilePage 
} from './pages'

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route 
                path="/projects" 
                element={
                  <ProtectedRoute>
                    <ProjectsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/projects/:projectId" 
                element={
                  <ProtectedRoute>
                    <ProjectDetailsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/text" 
                element={
                  <ProtectedRoute>
                    <TextPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/chatbot-testing" 
                element={
                  <ProtectedRoute>
                    <ChatbotTestingPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </Provider>
  )
}

export default App
