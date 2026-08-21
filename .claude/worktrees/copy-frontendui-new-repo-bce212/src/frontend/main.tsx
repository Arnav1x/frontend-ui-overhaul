import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'
import { AgentTestingConsoleApp } from './agent-testing-console-app'
import { DirectToolsApp } from './direct-tools-app'
import { LiveTestProgress } from './live-test-progress'
import { getTestGenWindowView } from './window-view'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {getTestGenWindowView(window.location.search) === 'direct-tools' ? (
      <DirectToolsApp />
    ) : getTestGenWindowView(window.location.search) ===
      'agent-testing-console' ? (
      <AgentTestingConsoleApp />
    ) : getTestGenWindowView(window.location.search) ===
      'live-test-progress' ? (
      <LiveTestProgress />
    ) : (
      <App />
    )}
  </StrictMode>
)
