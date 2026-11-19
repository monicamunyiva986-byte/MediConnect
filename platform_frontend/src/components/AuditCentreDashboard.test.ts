import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../store/auth'
import { AuditCentreDashboard, AuditErrorNotice, AuditLoadingState, NoAuditResourcesState } from './AuditCentreDashboard'

function renderAudit(queryClient = new QueryClient()) {
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(StaticRouter, { location: '/audit' }, createElement(AuditCentreDashboard)),
    ),
  )
}

describe('Audit Centre route and states', () => {
  afterEach(() => useAuthStore.getState().clearSession())

  it('shows no fabricated records while disconnected', () => {
    const html = renderAudit()

    expect(html).toContain('<h1')
    expect(html).toContain('Audit Centre')
    expect(html).toContain('Connect to view verified audit records')
    expect(html).toContain('No sample records')
    expect(html).not.toContain('Transaction history</')
  })

  it('shows a clear empty state when the live resource API returns no resources', () => {
    const html = renderToStaticMarkup(createElement(NoAuditResourcesState))

    expect(html).toContain('No resources are available')
    expect(html).toContain('connected API returned no resources')
  })

  it('renders accessible loading and retryable error states', () => {
    const loadingHtml = renderToStaticMarkup(
      createElement(AuditLoadingState, { message: 'Loading transaction history…' }),
    )
    const errorHtml = renderToStaticMarkup(
      createElement(AuditErrorNotice, {
        title: 'Could not load audit history',
        message: 'Check your access and try again.',
        onRetry: () => undefined,
      }),
    )

    expect(loadingHtml).toContain('role="status"')
    expect(loadingHtml).toContain('Loading transaction history')
    expect(errorHtml).toContain('role="alert"')
    expect(errorHtml).toContain('Could not load audit history')
    expect(errorHtml).toContain('>Retry</button>')
  })
})
