import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../store/auth'
import { AnalyticsApiError, AnalyticsDashboard, AnalyticsEmptyState, AnalyticsLoadingState } from './AnalyticsDashboard'

describe('analytics dashboard route and states', () => {
  afterEach(() => useAuthStore.getState().clearSession())

  it('shows a no-mock live-connection prompt while disconnected', () => {
    const html = renderToStaticMarkup(createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(StaticRouter, { location: '/analytics' }, createElement(AnalyticsDashboard)),
    ))
    expect(html).toContain('Analytics dashboard')
    expect(html).toContain('Connect to view verified analytics')
    expect(html).toContain('No sample metrics')
    expect(html).toContain('not historical trends')
  })

  it('renders accessible loading, empty, and retryable error states', () => {
    const loading = renderToStaticMarkup(createElement(AnalyticsLoadingState))
    const empty = renderToStaticMarkup(createElement(AnalyticsEmptyState, { filtered: true }))
    const error = renderToStaticMarkup(createElement(AnalyticsApiError, {
      title: 'Resource inventory could not be loaded.',
      onRetry: () => undefined,
    }))

    expect(loading).toContain('role="status"')
    expect(empty).toContain('No data for this facility')
    expect(error).toContain('role="alert"')
    expect(error).toContain('Resource inventory could not be loaded.')
    expect(error).toContain('>Retry</button>')
  })
})
