import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getBloodStocks, getHospitalResources, getOxygenSupplies } from '../lib/api'
import {
  buildOperationalReportCsv,
  buildOperationalReportRows,
  filterReportRecords,
} from '../lib/reports'
import type { ReportType } from '../lib/reports'
import { formatResourceUpdatedAt } from '../lib/resourceManagement'
import { useAuthStore } from '../store/auth'
import { Card, CardHeader, CardTitle } from './ui/card'
import { WorkspaceNavigation } from './WorkspaceNavigation'

const reportOptions: Array<{ value: ReportType; label: string }> = [
  { value: 'all', label: 'All operational reports' },
  { value: 'resources', label: 'Resource inventory' },
  { value: 'blood', label: 'Blood stock' },
  { value: 'oxygen', label: 'Oxygen supply' },
]

export function ReportsLoadingState() {
  return <div className="mt-5 rounded-lg border border-black/[0.06] bg-white px-5 py-8 text-center text-sm text-muted" role="status">Loading report data…</div>
}

export function ReportsEmptyState({ filtered }: { filtered: boolean }) {
  return (
    <Card className="mt-5 px-5 py-10 text-center">
      <FileSpreadsheet className="mx-auto text-muted" size={25} aria-hidden="true" />
      <h2 className="mt-3 text-sm font-semibold text-ink">{filtered ? 'No records match these filters' : 'No report data available'}</h2>
      <p className="mt-1 text-sm text-muted">The connected APIs returned no records for this report.</p>
    </Card>
  )
}

export function ReportsErrorNotice({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-md border border-[#f0c9bd] bg-[#fff6f3] p-4 text-sm text-[#8f4635]" role="alert">
      <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
      <div className="flex-1"><p className="font-semibold">{title}</p><p className="mt-1">The request failed. Check the backend connection and your access, then retry.</p></div>
      <button onClick={onRetry} className="rounded border border-[#e4b6a9] px-3 py-1.5 text-xs font-semibold" type="button">Retry</button>
    </div>
  )
}

export function ReportsDashboard() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const isLive = Boolean(token)
  const [facility, setFacility] = useState('all')
  const [reportType, setReportType] = useState<ReportType>('all')

  const resourcesQuery = useQuery({
    queryKey: ['hospital-resources'],
    queryFn: getHospitalResources,
    enabled: isLive,
  })
  const bloodQuery = useQuery({
    queryKey: ['blood-stocks'],
    queryFn: getBloodStocks,
    enabled: isLive,
  })
  const oxygenQuery = useQuery({
    queryKey: ['oxygen-supplies'],
    queryFn: getOxygenSupplies,
    enabled: isLive,
  })

  const resources = resourcesQuery.data ?? []
  const blood = bloodQuery.data ?? []
  const oxygen = oxygenQuery.data ?? []
  const facilities = useMemo(
    () => [...new Set([
      ...resources.map((record) => record.hospital_name),
      ...blood.map((record) => record.hospital_name),
      ...oxygen.map((record) => record.hospital_name),
    ])].sort(),
    [resources, blood, oxygen],
  )
  const filteredResources = useMemo(() => filterReportRecords(resources, facility), [resources, facility])
  const filteredBlood = useMemo(() => filterReportRecords(blood, facility), [blood, facility])
  const filteredOxygen = useMemo(() => filterReportRecords(oxygen, facility), [oxygen, facility])
  const allRows = useMemo(
    () => buildOperationalReportRows(filteredResources, filteredBlood, filteredOxygen),
    [filteredResources, filteredBlood, filteredOxygen],
  )
  const rows = useMemo(
    () => reportType === 'all' ? allRows : allRows.filter((row) => row.type === reportType),
    [allRows, reportType],
  )
  const queries = [resourcesQuery, bloodQuery, oxygenQuery]
  const loading = isLive && queries.some((query) => query.isLoading)
  const errors = [
    resourcesQuery.isError ? { title: 'Resource inventory could not be loaded.', retry: () => void resourcesQuery.refetch() } : null,
    bloodQuery.isError ? { title: 'Blood stock could not be loaded.', retry: () => void bloodQuery.refetch() } : null,
    oxygenQuery.isError ? { title: 'Oxygen supply data could not be loaded.', retry: () => void oxygenQuery.refetch() } : null,
  ].filter((error): error is NonNullable<typeof error> => error !== null)
  const busy = queries.some((query) => query.isFetching)
  const noFetchedRecords = resourcesQuery.data === undefined && bloodQuery.data === undefined && oxygenQuery.data === undefined

  async function signOut() {
    await queryClient.cancelQueries()
    queryClient.clear()
    clearSession()
  }

  async function refresh() {
    await Promise.all(queries.map((query) => query.refetch()))
  }

  function exportCsv() {
    const csv = buildOperationalReportCsv(rows)
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `mediconnect-${reportType}-report.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      <aside className="flex shrink-0 flex-col bg-navy text-white lg:sticky lg:top-0 lg:h-screen lg:w-[236px]">
        <div className="flex items-center gap-3 px-5 py-5 lg:px-6 lg:py-7">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d8eee4] text-forest"><Activity size={21} aria-hidden="true" /></span>
          <div><p className="text-[15px] font-semibold">MediConnect</p><p className="mt-0.5 text-[11px] text-white/55">CARE OPERATIONS</p></div>
        </div>
        <WorkspaceNavigation current="/reports" />
        <div className="hidden flex-1 lg:block" />
        <div className="hidden border-t border-white/10 p-5 lg:block">
          <div className="flex items-center gap-2 text-xs text-white/70"><ShieldCheck size={15} aria-hidden="true" /> Secure workspace</div>
          <p className="mt-2 text-[11px] leading-5 text-white/45">Operational reports from current API records only.</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-5 py-3 shadow-sm backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="hidden sm:inline">Operations</span><span className="hidden text-[#bdc7c1] sm:inline">/</span>
            <span className="font-semibold text-ink">Reports</span>
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
              <p className="text-xs font-semibold uppercase text-forest">Operational records</p>
              <h1 className="mt-2 text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">Reports</h1>
              <p className="mt-2 text-sm text-muted">Review and export current inventory, blood stock, and oxygen supply records.</p>
            </div>
            {isLive && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d8e0db] bg-white px-3 text-xs font-medium text-ink transition hover:bg-[#f8faf9] disabled:opacity-60"
                  disabled={busy}
                  onClick={() => void refresh()}
                  type="button"
                  aria-label="Refresh report data"
                >
                  <RefreshCw className={busy ? 'animate-spin' : ''} size={15} aria-hidden="true" />Refresh
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-forest px-3 text-xs font-semibold text-white transition hover:bg-[#164333] disabled:opacity-60"
                  disabled={!rows.length}
                  onClick={exportCsv}
                  type="button"
                >
                  <Download size={15} aria-hidden="true" />Export CSV
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 rounded-md border border-[#d7e6dd] bg-[#eaf3ee] px-4 py-3 text-xs text-[#355f4c] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{isLive ? 'Authenticated session' : 'Reports require a live connection'}</span>
              {!isLive && <span className="rounded bg-white/70 px-2 py-1 text-[10px] font-bold uppercase">No sample records</span>}
            </div>
            <span>Current API records only · no generated history or estimated values</span>
          </div>

          {!isLive && (
            <Card className="mt-5 p-6 sm:p-8">
              <div className="mx-auto max-w-xl text-center">
                <FileSpreadsheet className="mx-auto text-forest" size={30} aria-hidden="true" />
                <h2 className="mt-3 text-base font-semibold text-ink">Connect to access operational reports</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Reports use records returned by the authenticated resource, blood stock, and oxygen APIs. No demonstration records are shown.</p>
                <Link to="/connect" className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-forest px-4 text-xs font-semibold text-white transition hover:bg-[#164333]">
                  <ShieldCheck size={15} aria-hidden="true" />Connect live data
                </Link>
              </div>
            </Card>
          )}

          {isLive && (
            <>
              <div className="mt-5 grid gap-3 rounded-md border border-black/[0.06] bg-white p-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="report-type" className="block text-xs font-semibold text-ink">Report type</label>
                  <select id="report-type" value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-[#3e8a69]/15">
                    {reportOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="report-facility" className="block text-xs font-semibold text-ink">Facility</label>
                  <select id="report-facility" value={facility} onChange={(event) => setFacility(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-[#3e8a69]/15">
                    <option value="all">All facilities</option>
                    {facilities.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              </div>

              {errors.map((error) => <ReportsErrorNotice key={error.title} title={error.title} onRetry={error.retry} />)}
              {errors.length > 0 && !noFetchedRecords && (
                <p className="mt-3 text-xs text-[#8f4635]" role="status">Partial report: only successfully fetched record types are included.</p>
              )}
              {loading && <ReportsLoadingState />}
              {!loading && !errors.length && rows.length === 0 && <ReportsEmptyState filtered={reportType !== 'all' || facility !== 'all'} />}
              {!loading && errors.length > 0 && noFetchedRecords && (
                <p className="mt-3 text-xs text-muted">No report rows are available until a request succeeds.</p>
              )}
              {!loading && rows.length > 0 && (
                <Card className="mt-5 overflow-hidden">
                  <CardHeader className="flex-col border-b border-black/[0.06] p-5 sm:flex-row sm:items-center">
                    <div>
                      <CardTitle>{reportOptions.find((option) => option.value === reportType)?.label}</CardTitle>
                      <p className="mt-1 text-xs text-muted">{rows.length} fetched record{rows.length === 1 ? '' : 's'} · CSV export follows these filters</p>
                    </div>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="bg-[#f7f9f8] text-[11px] uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Report</th>
                          <th className="px-5 py-3 font-semibold">Facility</th>
                          <th className="px-5 py-3 font-semibold">Item</th>
                          <th className="px-5 py-3 font-semibold">Available</th>
                          <th className="px-5 py-3 font-semibold">Capacity</th>
                          <th className="px-5 py-3 font-semibold">Status</th>
                          <th className="px-5 py-3 font-semibold">Details</th>
                          <th className="px-5 py-3 font-semibold">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.05]">
                        {rows.map((row) => (
                          <tr key={row.id} className="align-top">
                            <td className="px-5 py-4 text-xs font-medium text-ink">{reportOptions.find((option) => option.value === row.type)?.label}</td>
                            <td className="px-5 py-4 text-xs text-muted">{row.facility}</td>
                            <td className="px-5 py-4"><span className="font-medium text-ink">{row.item}</span><span className="mt-1 block text-xs text-muted">{row.classification}</span></td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-ink">{row.available}</td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{row.capacity}</td>
                            <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === 'Critical' || row.status === 'Low' ? 'bg-[#fae9e4] text-[#a9503d]' : row.status === 'Low stock' ? 'bg-[#fbf1df] text-[#996b1d]' : 'bg-[#e5f2eb] text-[#28664e]'}`}>{row.status}</span></td>
                            <td className="max-w-[260px] px-5 py-4 text-xs text-muted">{row.details || 'Not reported'}</td>
                            <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatResourceUpdatedAt(row.lastUpdated)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
              <p className="mt-4 text-xs leading-5 text-muted">Reports reflect the current records returned by the selected APIs. The backend does not provide historical report periods or report-generation endpoints. A failed API is shown as an error and is not replaced with sample data.</p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
