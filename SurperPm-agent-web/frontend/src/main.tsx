import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/Layout'
import Config from './pages/Config'
import Goal from './pages/Goal'
import Knowledge from './pages/Knowledge'
import Setup from './pages/Setup'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/goal" replace />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/config" element={<Config />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/goal" element={<Goal />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
