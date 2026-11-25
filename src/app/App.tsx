import { Suspense, useCallback, useMemo, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { DialogProvider } from '../components/dialogs'
import SettingsPage from '../features/settings/SettingsPage'
import { ShellContext } from './shell'
import { TabBar } from './TabBar'
import { defaultTab, tabForPath, tabs } from './tabs'
import { useVisualViewport } from './viewport'

function Shell() {
  const location = useLocation()
  const { keyboardOpen } = useVisualViewport()
  const [hideRequests, setHideRequests] = useState(0)

  const hideTabBar = useCallback(() => {
    setHideRequests((n) => n + 1)
    return () => setHideRequests((n) => n - 1)
  }, [])
  const shellApi = useMemo(() => ({ hideTabBar }), [hideTabBar])

  const activeTab = tabForPath(location.pathname)
  const showTabBar = hideRequests === 0 && !keyboardOpen

  return (
    <ShellContext.Provider value={shellApi}>
      <div
        className="app-shell"
        style={{ ['--accent' as string]: activeTab?.accent ?? 'var(--accent-default)' }}
      >
        <main className="app-content">
          <Suspense fallback={<div className="loading" />}>
            <Routes>
              {tabs.map((tab) => {
                const Component = tab.component
                return <Route key={tab.id} path={`${tab.path}/*`} element={<Component />} />
              })}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to={defaultTab.path} replace />} />
            </Routes>
          </Suspense>
        </main>
        {showTabBar && <TabBar />}
      </div>
    </ShellContext.Provider>
  )
}

export default function App() {
  return (
    <HashRouter>
      <DialogProvider>
        <Shell />
      </DialogProvider>
    </HashRouter>
  )
}
