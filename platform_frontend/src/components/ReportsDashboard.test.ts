import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../store/auth'
import { ReportsDashboard, ReportsEmptyState, ReportsErrorNotice, ReportsLoadingState } from './ReportsDashboard'

describe('Reports page route and states', () => {
  afterEach(() => useAuthStore.getState().clearSession())

  it('shows a disconnected prompt without demonstration records', () => {
    const html = renderToStaticMarkup(createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(StaticRouter, { location: '/reports' }, createElement(ReportsDashboard)),
    ))
    expect(html).toContain('>Reports</span>')
    expect(html).toContain('Connect to access operational reports')
    expect(html).toContain('No sample records')
  })

  it('renders accessible loading, empty, and retryable error states', () => {
    const loading = renderToStaticMarkup(createElement(ReportsLoadingState))
    const empty = renderToStaticMarkup(createElement(ReportsEmptyState, { filtered: true }))
    const error = renderToStaticMarkup(createElement(ReportsErrorNotice, {
      title: 'Blood stock could not be loaded.',
      onRetry: () => undefined,
    }))
    expect(loading).toContain('role="status"')
    expect(empty).toContain('No records match these filters')
    expect(error).toContain('role="alert"')
    expect(error).toContain('Blood stock could not be loaded.')
    expect(error).toContain('>Retry</button>')
  })
})
