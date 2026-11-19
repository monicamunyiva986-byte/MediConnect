import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, AlertTriangle, ClipboardList, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getHospitalResources, getResourceTransactions } from '../lib/api'
import { formatResourceUpdatedAt } from '../lib/resourceManagement'
import { useAuthStore } from '../store/auth'
import type { ResourceTransaction } from '../types'
import { Card, CardHeader, CardTitle } from './ui/card'
import { WorkspaceNavigation } from './WorkspaceNavigation'

function transactionLabel(transaction: ResourceTransaction): string {
  return transaction.transaction_type.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function readableError(error: unknown): string {
  if (error instanceof Error && error.message.includes('Network Error')) {
    return 'The API could not be reached. Check that Django is running and the API URL is correct.'
  }
  return 'Could not load audit history. Check your access and try again.'
}

export function NoAuditResourcesState() {
  return (
    <Card className="mt-5 px-5 py-10 text-center">
      <ClipboardList className="mx-auto text-muted" size={25} aria-hidden="true" />
      <h2 className="mt-3 text-sm font-semibold text-ink">No resources are available</h2>
      <p className="mt-1 text-sm text-muted">The connected API returned no resources to inspect.</p>
    </Card>
  )
}

export function AuditLoadingState({ message }: { message: string }) {
  return (
    <div className="mt-5 rounded-lg border border-black/[0.06] bg-white px-5 py-8 text-center text-sm text-muted" role="status">
      {message}
    </div>
  )
}

export function AuditErrorNotice({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry: () => void
}) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-md border border-[#f0c9bd] bg-[#fff6f3] p-4 text-sm text-[#8f4635]" role="alert">
      <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
      <div className="flex-1"><p className="font-semibold">{title}</p><p className="mt-1">{message}</p></div>
      <button onClick={onRetry} className="rounded border border-[#e4b6a9] px-3 py-1.5 text-xs font-semibold" type="button">Retry</button>
    </div>
  )
}

export function AuditCentreDashboard() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const isLive = Boolean(token)
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null)

  const resourcesQuery = useQuery({
    queryKey: ['hospital-resources'],
    queryFn: getHospitalResources,
    enabled: isLive,
  })
  const transactionsQuery = useQuery({
    queryKey: ['resource-transactions', selectedResourceId],
    queryFn: () => {
      if (selectedResourceId === null) throw new Error('Select a resource before loading transactions.')
      return getResourceTransactions(selectedResourceId)
    },
    enabled: isLive && selectedResourceId !== null,
  })

  useEffect(() => {
    const resources = resourcesQuery.data ?? []
    if (resources.length && !resources.some((resource) => resource.id === selectedResourceId)) {
      setSelectedResourceId(resources[0].id)
    } else if (!resources.length && selectedResourceId !== null) {
      setSelectedResourceId(null)
    }
  }, [resourcesQuery.data, selectedResourceId])

  const selectedResource = resourcesQuery.data?.find((resource) => resource.id === selectedResourceId)
  const busy = resourcesQuery.isFetching || transactionsQuery.isFetching

  async function signOut() {
    await queryClient.cancelQueries()
    queryClient.clear()
    clearSession()
    setSelectedResourceId(null)
  }

  async function refresh() {
    await resourcesQuery.refetch()
    if (selectedResourceId !== null) await transactionsQuery.refetch()
  }

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      <aside className="flex shrink-0 flex-col bg-navy text-white lg:sticky lg:top-0 lg:h-screen lg:w-[236px]">
        <div className="flex items-center gap-3 px-5 py-5 lg:px-6 lg:py-7">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d8eee4] text-forest">
            <Activity size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[15px] font-semibold">MediConnect</p>
            <p className="mt-0.5 text-[11px] text-white/55">CARE OPERATIONS</p>
          </div>
        </div>
        <WorkspaceNavigation current="/audit" />
        <div className="hidden flex-1 lg:block" />
        <div className="hidden border-t border-white/10 p-5 lg:block">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <ShieldCheck size={15} aria-hidden="true" /> Secure workspace
          </div>
          <p className="mt-2 text-[11px] leading-5 text-white/45">Resource transaction history. Not a system-wide audit trail.</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-5 py-3 shadow-sm backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="hidden sm:inline">Operations</span>
            <span className="hidden text-[#bdc7c1] sm:inline">/</span>
            <span className="font-semibold text-ink">Audit Centre</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${isLive ? 'bg-[#e5f2eb] text-[#28664e]' : 'bg-[#fbf1df] text-[#8b641d]'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-[#3e8a69]' : 'bg-[#d49a36]'}`} />
              {isLive ? 'Signed in' : 'Not connected'}
            </div>
            {isLive ? (
              <button onClick={signOut} className="inline-flex h-9 items-center gap-2 rounded-md border border-black/10 px-3 text-xs font-medium text-muted transition hover:bg-canvas hover:text-ink" type="button" title={user?.first_name || 'Sign out'}>
                <LogOut size={15} aria-hidden="true" /><span className="hidden sm:inline">Sign out</span>
              </button>
            ) : (
              <Link to="/connect" className="inline-flex h-9 items-center gap-2 rounded-md bg-forest px-3 text-xs font-semibold text-white transition hover:bg-[#164333]">
                <ShieldCheck size={15} aria-hidden="true" /> Connect live data
              </Link>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-7 sm:px-8 sm:pt-9">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase text-forest">Governance &amp; traceability</p>
              <h1 className="mt-2 text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">Audit Centre</h1>
              <p className="mt-2 text-sm text-muted">Review recorded stock transactions for a selected hospital resource.</p>
            </div>
            {isLive && (
              <button
                className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#d8e0db] bg-white px-3 text-xs font-medium text-ink transition hover:bg-[#f8faf9] disabled:opacity-60"
                disabled={busy || resourcesQuery.isError}
                onClick={() => void refresh()}
                type="button"
                aria-label="Refresh audit history"
              >
                <RefreshCw className={busy ? 'animate-spin' : ''} size={15} aria-hidden="true" />Refresh
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 rounded-md border border-[#d7e6dd] bg-[#eaf3ee] px-4 py-3 text-xs text-[#355f4c] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{isLive ? 'Authenticated session' : 'Audit history requires a live connection'}</span>
              {!isLive && <span className="rounded bg-white/70 px-2 py-1 text-[10px] font-bold uppercase">No sample records</span>}
            </div>
            <span>Up to 50 transactions for the selected resource · not a complete system-wide audit trail</span>
          </div>

          {!isLive && (
            <Card className="mt-5 p-6 sm:p-8">
              <div className="mx-auto max-w-xl text-center">
                <ClipboardList className="mx-auto text-forest" size={30} aria-hidden="true" />
                <h2 className="mt-3 text-base font-semibold text-ink">Connect to view verified audit records</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Audit records are never demonstrated with mock entries. Connect to the backend to load a resource list and its recorded transactions.</p>
                <Link to="/connect" className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-forest px-4 text-xs font-semibold text-white transition hover:bg-[#164333]">
                  <ShieldCheck size={15} aria-hidden="true" /> Connect live data
                </Link>
              </div>
            </Card>
          )}

          {isLive && resourcesQuery.isLoading && (
            <AuditLoadingState message="Loading hospital resources…" />
          )}
          {isLive && resourcesQuery.isError && (
            <AuditErrorNotice
              title="Could not load resources"
              message={readableError(resourcesQuery.error)}
              onRetry={() => void resourcesQuery.refetch()}
            />
          )}
          {isLive && !resourcesQuery.isLoading && !resourcesQuery.isError && (resourcesQuery.data?.length ?? 0) === 0 && (
            <NoAuditResourcesState />
          )}

          {isLive && (resourcesQuery.data?.length ?? 0) > 0 && (
            <>
              <Card className="mt-5 p-4 sm:p-5">
                <label htmlFor="audit-resource" className="block text-xs font-semibold text-ink">Select resource</label>
                <select
                  id="audit-resource"
                  value={selectedResourceId ?? ''}
                  onChange={(event) => setSelectedResourceId(Number(event.target.value))}
                  className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-[#3e8a69]/15 sm:max-w-xl"
                >
                  {resourcesQuery.data?.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.hospital_name} · {resource.resource_type.name} · #{resource.id}
                    </option>
                  ))}
                </select>
                {selectedResource && (
                  <p className="mt-2 text-xs text-muted">
                    {selectedResource.available_quantity} {selectedResource.unit} available of {selectedResource.total_capacity} · {selectedResource.hospital_name}
                  </p>
                )}
              </Card>

              {transactionsQuery.isLoading && (
                <AuditLoadingState message="Loading transaction history…" />
              )}
              {transactionsQuery.isError && (
                <AuditErrorNotice
                  title="Could not load audit history"
                  message={readableError(transactionsQuery.error)}
                  onRetry={() => void transactionsQuery.refetch()}
                />
              )}
              {transactionsQuery.isSuccess && transactionsQuery.data.length === 0 && (
                <Card className="mt-5 px-5 py-10 text-center">
                  <ClipboardList className="mx-auto text-muted" size={25} aria-hidden="true" />
                  <h2 className="mt-3 text-sm font-semibold text-ink">No transactions recorded</h2>
                  <p className="mt-1 text-sm text-muted">The API returned no transaction records for this resource.</p>
                </Card>
              )}
              {transactionsQuery.isSuccess && transactionsQuery.data.length > 0 && (
                <Card className="mt-5 overflow-hidden">
                  <CardHeader className="flex-col border-b border-black/[0.06] p-5 sm:flex-row sm:items-center">
                    <div>
                      <CardTitle>Transaction history</CardTitle>
                      <p className="mt-1 text-xs text-muted">{transactionsQuery.data.length} record{transactionsQuery.data.length === 1 ? '' : 's'} returned for the selected resource</p>
                    </div>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[840px] text-left text-sm">
                      <thead className="bg-[#f7f9f8] text-[11px] uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Date &amp; time</th>
                          <th className="px-5 py-3 font-semibold">Transaction</th>
                          <th className="px-5 py-3 font-semibold">Quantity</th>
                          <th className="px-5 py-3 font-semibold">Available change</th>
                          <th className="px-5 py-3 font-semibold">Performed by</th>
                          <th className="px-5 py-3 font-semibold">Reason / reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.05]">
                        {transactionsQuery.data.map((transaction) => (
                          <tr key={transaction.id} className="align-top">
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatResourceUpdatedAt(transaction.created_at)}</td>
                            <td className="px-5 py-4"><span className="rounded-full bg-[#eaf3ee] px-2.5 py-1 text-xs font-semibold text-[#28664e]">{transactionLabel(transaction)}</span></td>
                            <td className="px-5 py-4 font-medium text-ink">{transaction.quantity} {selectedResource?.unit ?? 'units'}</td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-ink">{transaction.previous_available} <span className="text-muted">→</span> {transaction.new_available}</td>
                            <td className="px-5 py-4 text-xs text-muted">{transaction.performed_by_email || 'Not reported'}</td>
                            <td className="max-w-[260px] px-5 py-4 text-xs text-muted">
                              <span>{transaction.reason || 'No reason provided'}</span>
                              {transaction.reference && <span className="mt-1 block">Ref: {transaction.reference}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
