import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import '@fontsource/archivo-black/400.css'
import '@fontsource-variable/space-grotesk'

import { AuthProvider } from './context/AuthContext'
import { QueryProvider } from './providers/query-provider'
import { ToastProvider } from './components/business/toast'
import { ConfirmProvider } from './components/business/confirm-dialog'
import ProtectedRoute from './components/ProtectedRoute'
import { AppLayout } from './components/layout/app-layout'
import { GoalLayout } from './components/layout/goal-layout'
import Login from './pages/Login'
import LoginOAuth from './pages/LoginOAuth'
import GoalListPage from './pages/GoalList'
import KnowledgePage from './pages/workspace/Knowledge'
import GlobalSettingsPage from './pages/GlobalSettings'
import DiscussPage from './pages/Discuss'
import GoalExecutionsPage from './pages/goal/GoalExecutions'
import GoalSettingsPage from './pages/goal/GoalSettings'
import SkillDetailPage from './pages/workspace/SkillDetail'
import ProfilePage from './pages/Profile'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <ToastProvider>
      <ConfirmProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<LoginOAuth />} />
            <Route path="/login-pat" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DiscussPage />} />
                <Route path="goals" element={<GoalListPage />} />
                <Route path="knowledge" element={<KnowledgePage />} />
                <Route path="settings" element={<GlobalSettingsPage />} />
                <Route path="skills/:skillId" element={<SkillDetailPage />} />
                <Route path="goals/:goalId" element={<GoalLayout />}>
                  <Route index element={<Navigate to="execute" replace />} />
                  <Route path="execute" element={<GoalExecutionsPage />} />
                  <Route path="settings" element={<GoalSettingsPage />} />
                </Route>
              </Route>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ConfirmProvider>
      </ToastProvider>
    </QueryProvider>
  </React.StrictMode>,
)
