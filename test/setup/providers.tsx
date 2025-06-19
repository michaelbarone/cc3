import { AuthProvider } from '@/app/lib/auth/auth-context'
import { IframeProvider } from '@/app/lib/state/iframe-state'
import { lightTheme } from '@/app/theme/theme'
import { ThemeProvider } from '@mui/material/styles'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import React, { ReactNode } from 'react'

// Define default mock session
const defaultSession = {
  data: null,
  status: 'unauthenticated',
  expires: new Date(Date.now() + 2 * 86400).toISOString()
}

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  session?: typeof defaultSession
  activeUrlId?: string
}

const renderWithProviders = (
  ui: React.ReactElement,
  { session = defaultSession, activeUrlId, ...options }: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <SessionProvider session={session}>
      <ThemeProvider theme={lightTheme}>
        <AuthProvider>
          <IframeProvider initialActiveUrlId={activeUrlId}>
            {children}
          </IframeProvider>
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { renderWithProviders as render }

