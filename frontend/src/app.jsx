import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCurrentUser, selectIsAuthenticated } from './store/userslice'
import Navbar    from './components/layout/navbar'
import Sidebar   from './components/layout/sidebar'
import Home      from './pages/home'
import Dashboard from './pages/dashboard'
import Roadmap   from './pages/roadmap'
import Interview from './pages/interview'
import Profile   from './pages/profile'

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <Sidebar />
      <div className="page-wrapper">
        <div className="page-content">
          {children}
        </div>
      </div>
    </>
  )
}

function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  return isAuthenticated ? children : <Navigate to="/" replace />
}

export default function App() {
  const dispatch        = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)

  // Re-fetch fresh user from server whenever the app loads
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCurrentUser())
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
        } />
        <Route path="/roadmap" element={
          <ProtectedRoute><Layout><Roadmap /></Layout></ProtectedRoute>
        } />
        <Route path="/interview" element={
          <ProtectedRoute><Layout><Interview /></Layout></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}