import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Droplets,
  FlaskConical,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Wind,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { WorkspaceNavigation } from './WorkspaceNavigation'
import { getOxygenSupplies } from '../lib/api'
import {
  buildOxygenRows,
  formatOxygenAmount,
  formatOxygenUpdatedAt,
  summarizeOxygen,
} from '../lib/oxygen'
import type { OxygenInventoryRow, OxygenLevelStatus, OxygenRecord } from '../lib/oxygen'
import { useAuthStore } from '../store/auth'
import { Card, CardHeader, CardTitle } from './ui/card'

const sampleRecords: OxygenRecord[] = [
  {
    id: 1,
    hospital: 1,
    hospital_name: 'Sample Central Hospital',
    supply_type: 'CYLINDER',
    capacity_litres: 500,
    current_level_litres: 385,
    number_of_units: 10,
    available_units: 9,
    low_level_threshold_pct: 20,
    location: 'ICU storage room',
    last_refilled: '2026-10-14T08:00:00Z',
    last_updated: '2026-10-15T08:30:00Z',
    level_percentage: 77,
    is_low: false,
    operational_units: 10,
  },
  {
    id: 2,
    hospital: 1,
    hospital_name: 'Sample Central Hospital',
    supply_type: 'LIQUID',
    capacity_litres: 2000,
    current_level_litres: 280,
    number_of_units: 2,
    available_units: 1,
    low_level_threshold_pct: 20,
    location: 'Main plant',
    last_refilled: '2026-10-11T09:00:00Z',
    last_updated: '2026-10-15T08:15:00Z',
    level_percentage: 14,
    is_low: true,
    operational_units: 1,
  },
  {
    id: 3,
    hospital: 2,
    hospital_name: 'Sample Riverside Clinic',
    supply_type: 'CYLINDER',
    capacity_litres: 120,
    current_level_litres: 0,
    number_of_units: 4,
    available_units: 0,
    low_level_threshold_pct: 20,
    location: 'Emergency store',
    last_refilled: null,
    last_updated: '2026-10-15T07:45:00Z',
    level_percentage: 0,
    is_low: true,
    operational_units: 0,
  },
  {
    id: 4,
    hospital: 2,
    hospital_name: 'Sample Riverside Clinic',
    supply_type: 'PIPELINE',
    capacity_litres: null,
    current_level_litres: 0,
    number_of_units: 1,
    available_units: 1,
    low_level_threshold_pct: 20,
    location: 'Maternity ward',
    last_refilled: null,
    last_updated: '2026-10-15T07:30:00Z',
    level_percentage: null,
    is_low: false,
    operational_units: 1,
  },
]

type StatusFilter = 'all' | 'available' | 'unavailable' | 'attention' | 'normal'

const statusStyles: Record<OxygenLevelStatus, string> = {
  critical: 'bg-[#fae9e4] text-[#a9503d]',
  low: 'bg-[#fbf1df] text-[#996b1d]',
  normal: 'bg-[#e5f2eb] text-[#28664e]',
  unknown: 'bg-[#eef1ef] text-[#66746c]',
}

const statusLabels: Record<OxygenLevelStatus, string> = {
  critical: 'Empty · critical',
  low: 'Low level',
  normal: 'Within threshold',
  unknown: 'Level unavailable',
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  tone: 'green' | 'coral' | 'amber' | 'dark'
}) {
  const toneClasses = {
    green: 'bg-[#e4f1eb] text-[#28664e]',
    coral: 'bg-[#fae9e4] text-[#a9503d]',
    amber: 'bg-[#fbf1df] text-[#996b1d]',
    dark: 'bg-[#e9eeeb] text-ink',
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted">{label}</p>
          <p className="mt-3 text-3xl font-semibold leading-none text-ink">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-md ${toneClasses[tone]}`}>
          <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted">{detail}</p>
    </Card>
  )
}

function LevelIndicator({ row }: { row: OxygenInventoryRow }) {
  const barColor = row.status === 'critical'
    ? 'bg-[#d97862]'
    : row.status === 'low'
      ? 'bg-[#d49a36]'
      : 'bg-[#3e8a69]'

  return (
    <div className="min-w-[150px]">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">
          {formatOxygenAmount(row.currentLevel)} L
          {row.capacity !== null && <span className="font-normal text-muted"> / {formatOxygenAmount(row.capacity)} L</span>}
        </span>
        <span className="text-muted">{row.levelPercent === null ? '—' : `${Math.round(row.levelPercent)}%`}</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-[#edf1ee]"
        role="progressbar"
        aria-label={`${row.identifier} oxygen level`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={row.levelPercent === null ? undefined : Math.round(row.levelPercent)}
        aria-valuetext={row.levelPercent === null ? 'Capacity not reported' : `${Math.round(row.levelPercent)} percent`}
      >
        {row.levelPercent !== null && (
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${row.levelPercent}%` }} />
        )}
      </div>
    </div>
  )
}

function supplyTypeLabel(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatAttention(row: OxygenInventoryRow): string {
  return row.status === 'critical'
    ? 'Reported oxygen level is empty.'
    : row.status === 'low'
      ? 'Reported oxygen level is at or below the configured threshold.'
      : ''
}

export function OxygenDashboard() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const isLive = Boolean(token)
  const [selectedFacility, setSelectedFacility] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const oxygenQuery = useQuery({
    queryKey: ['oxygen-supplies'],
    queryFn: getOxygenSupplies,
    enabled: isLive,
  })
  const signOutMutation = useMutation({
    mutationFn: async () => {
      await queryClient.cancelQueries()
    },
    onSuccess: () => {
      queryClient.clear()
      clearSession()
    },
  })

  const records = isLive ? oxygenQuery.data ?? [] : sampleRecords
  const rows = useMemo(() => buildOxygenRows(records), [records])
  const summary = useMemo(() => summarizeOxygen(rows), [rows])
  const facilities = useMemo(() => [...new Set(rows.map((row) => row.facility))].sort(), [rows])
  const alerts = rows.filter((row) => row.status === 'critical' || row.status === 'low')
  const visibleRows = rows.filter((row) => {
    if (selectedFacility !== 'all' && row.facility !== selectedFacility) return false
    if (statusFilter === 'available' && row.availableUnits === 0) return false
    if (statusFilter === 'unavailable' && row.availableUnits > 0) return false
    if (statusFilter === 'attention' && row.status !== 'critical' && row.status !== 'low') return false
    if (statusFilter === 'normal' && row.status !== 'normal') return false
    return true
  })
  const loading = isLive && oxygenQuery.isLoading
  const refreshedAt = oxygenQuery.dataUpdatedAt
    ? new Date(oxygenQuery.dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

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
        <WorkspaceNavigation current="/oxygen" />
        <div className="hidden flex-1 lg:block" />
        <div className="hidden border-t border-white/10 p-5 lg:block">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <ShieldCheck size={15} aria-hidden="true" /> Secure workspace
          </div>
          <p className="mt-2 text-[11px] leading-5 text-white/45">Oxygen supply data only. Patient records are not displayed.</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-5 py-3 shadow-sm backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="hidden sm:inline">Operations</span>
            <span className="hidden text-[#bdc7c1] sm:inline">/</span>
            <span className="font-semibold text-ink">Oxygen monitoring</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${isLive ? 'bg-[#e5f2eb] text-[#28664e]' : 'bg-[#fbf1df] text-[#8b641d]'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-[#3e8a69]' : 'bg-[#d49a36]'}`} />
              {isLive ? 'Signed in' : 'Sample data · not live'}
            </div>
            {isLive ? (
              <button
                onClick={() => signOutMutation.mutate()}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-black/10 px-3 text-xs font-medium text-muted transition hover:bg-canvas hover:text-ink disabled:opacity-60"
                type="button"
                disabled={signOutMutation.isPending}
                title={user?.first_name || 'Sign out'}
              >
                <LogOut size={15} aria-hidden="true" /> <span className="hidden sm:inline">Sign out</span>
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
              <p className="text-xs font-semibold uppercase text-forest">Critical supplies</p>
              <h1 className="mt-2 text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">Oxygen monitoring</h1>
              <p className="mt-2 text-sm text-muted">Storage levels, availability, and supply alerts across facilities.</p>
            </div>
            {isLive && (
              <button
                className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-[#d8e0db] bg-white px-3 text-xs font-medium text-ink transition hover:bg-[#f8faf9] disabled:opacity-60"
                disabled={oxygenQuery.isFetching}
                onClick={() => void oxygenQuery.refetch()}
                type="button"
                aria-label="Refresh oxygen data"
              >
                <RefreshCw className={oxygenQuery.isFetching ? 'animate-spin' : ''} size={15} aria-hidden="true" />
                <span>Refresh</span>
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#d7e6dd] bg-[#eaf3ee] px-4 py-3 text-xs text-[#355f4c]">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{isLive ? 'Authenticated session' : 'Demonstration facilities'}</span>
              {!isLive && <span className="rounded bg-white/70 px-2 py-1 text-[10px] font-bold uppercase">Demonstration only</span>}
            </div>
            <div className="inline-flex items-center gap-1.5 text-[#547665]">
              <span>{isLive ? (refreshedAt ? `Fetched ${refreshedAt}` : 'Waiting for oxygen data') : 'Example figures · no hospital data connected'}</span>
            </div>
          </div>

          {loading && (
            <div className="mt-5 rounded-lg border border-black/[0.06] bg-white px-5 py-8 text-center text-sm text-muted" role="status">
              Loading oxygen supply data…
            </div>
          )}
          {isLive && oxygenQuery.error && (
            <div className="mt-5 flex flex-col gap-3 rounded-lg border border-[#f0c9be] bg-[#fff6f3] p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p className="text-sm text-[#914c3c]">Could not load oxygen data. Check your access and confirm Django is running at the configured API URL.</p>
              <button
                className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-[#e6b9ad] bg-white px-3 text-xs font-semibold text-[#914c3c] hover:bg-[#fff1ed]"
                onClick={() => void oxygenQuery.refetch()}
                type="button"
              >
                <RefreshCw size={14} aria-hidden="true" /> Retry
              </button>
            </div>
          )}
          {isLive && !loading && !oxygenQuery.error && rows.length === 0 && (
            <div className="mt-5 rounded-lg border border-dashed border-[#cbd8d0] bg-white px-5 py-10 text-center">
              <Wind className="mx-auto text-muted" size={24} aria-hidden="true" />
              <h2 className="mt-3 text-sm font-semibold text-ink">No oxygen supplies are registered</h2>
              <p className="mt-1 text-sm text-muted">No oxygen supply records were returned for this account.</p>
            </div>
          )}

          {!loading && !oxygenQuery.error && rows.length > 0 && (
            <>
              <section aria-label="Oxygen supply summary" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Total storage units" value={formatOxygenAmount(summary.totalUnits)} detail="Across listed supply records" icon={FlaskConical} tone="dark" />
                <MetricCard
                  label={isLive ? 'Units available' : 'Units operational'}
                  value={isLive && summary.operationalUnits === null ? formatOxygenAmount(summary.availableUnits) : formatOxygenAmount(summary.operationalUnits ?? 0)}
                  detail={isLive ? 'Availability count from API; operational health is not reported' : 'Demonstration status only'}
                  icon={CheckCircle2}
                  tone="green"
                />
                <MetricCard label="Units requiring attention" value={formatOxygenAmount(summary.attentionUnits)} detail="Supply units at low or empty levels" icon={AlertTriangle} tone={summary.attentionUnits ? 'amber' : 'green'} />
                <MetricCard label="Overall capacity" value={`${formatOxygenAmount(summary.capacity)} L`} detail="Sum of reported capacities" icon={Droplets} tone="coral" />
              </section>

              <Card className="mt-4 p-5 sm:p-6">
                <CardHeader className="flex-col sm:flex-row sm:items-center">
                  <div>
                    <CardTitle>Oxygen inventory</CardTitle>
                    <p className="mt-1.5 text-xs text-muted">One row per oxygen supply record; identifiers are dashboard references.</p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <label className="sr-only" htmlFor="oxygen-facility-filter">Filter by facility</label>
                    <select
                      id="oxygen-facility-filter"
                      className="h-10 min-w-[190px] rounded-md border border-[#d8e0db] bg-white px-3 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10"
                      value={selectedFacility}
                      onChange={(event) => setSelectedFacility(event.target.value)}
                    >
                      <option value="all">All facilities</option>
                      {facilities.map((facility) => <option key={facility} value={facility}>{facility}</option>)}
                    </select>
                    <label className="sr-only" htmlFor="oxygen-status-filter">Filter by status</label>
                    <select
                      id="oxygen-status-filter"
                      className="h-10 min-w-[190px] rounded-md border border-[#d8e0db] bg-white px-3 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10"
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                    >
                      <option value="all">All statuses</option>
                      <option value="available">Units available</option>
                      <option value="unavailable">No units available</option>
                      <option value="attention">Needs oxygen attention</option>
                      <option value="normal">Within level threshold</option>
                    </select>
                  </div>
                </CardHeader>
                {visibleRows.length > 0 ? (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead>
                        <tr className="border-y border-black/[0.06] text-[11px] font-semibold uppercase tracking-wide text-muted">
                          <th className="px-3 py-3">Facility / supply</th>
                          <th className="px-3 py-3">Reference</th>
                          <th className="px-3 py-3">Current oxygen level</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3">Last updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.05]">
                        {visibleRows.map((row) => (
                          <tr key={row.id} className="align-middle">
                            <td className="px-3 py-4">
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#e5f2eb] text-forest">
                                  <Building2 size={17} aria-hidden="true" />
                                </span>
                                <div>
                                  <p className="font-semibold text-ink">{row.facility}</p>
                                  <p className="mt-1 text-xs text-muted">{supplyTypeLabel(row.supplyType)} · {row.location || 'Location not reported'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <p className="font-medium text-ink">{row.identifier}</p>
                              <p className="mt-1 text-xs text-muted">{row.totalUnits} {row.totalUnits === 1 ? 'unit' : 'units'}</p>
                            </td>
                            <td className="px-3 py-4"><LevelIndicator row={row} /></td>
                            <td className="px-3 py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[row.status]}`}>
                                {statusLabels[row.status]}
                              </span>
                              <p className="mt-1.5 text-xs text-muted">
                                {row.operationalUnits !== null
                                  ? `${row.operationalUnits}/${row.totalUnits} operational · sample`
                                  : `${row.availableUnits}/${row.totalUnits} available`}
                              </p>
                            </td>
                            <td className="px-3 py-4 text-xs text-muted">{formatOxygenUpdatedAt(row.lastUpdated)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-5 rounded-md bg-[#f4f7f5] px-4 py-6 text-center text-sm text-muted">
                    No oxygen records match these filters. Try selecting another facility or status.
                  </p>
                )}
              </Card>

              <Card className="mt-4 p-5 sm:p-6">
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>Oxygen level alerts</CardTitle>
                      {alerts.length > 0 && (
                        <span className="rounded-full bg-[#fae9e4] px-2 py-0.5 text-[10px] font-bold text-[#a9503d]">{alerts.length}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted">
                      {isLive ? 'Warnings use the backend low-level flag; critical means reported level is empty.' : 'Demonstration alerts based on sample figures only.'}
                    </p>
                  </div>
                  <AlertTriangle className={alerts.length ? 'text-[#c87a32]' : 'text-[#a3aea8]'} size={18} aria-hidden="true" />
                </CardHeader>
                {alerts.length > 0 ? (
                  <div className="mt-4 divide-y divide-black/[0.05]">
                    {alerts.map((row) => (
                      <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-md ${row.status === 'critical' ? 'bg-[#fae9e4] text-[#a9503d]' : 'bg-[#fbf1df] text-[#996b1d]'}`}>
                            <AlertTriangle size={15} aria-hidden="true" />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-ink">{row.facility} · {row.identifier}</p>
                            <p className="mt-0.5 text-xs text-muted">{formatAttention(row)}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold ${row.status === 'critical' ? 'text-[#a9503d]' : 'text-[#996b1d]'}`}>
                          {row.levelPercent === null ? 'Capacity not reported' : `${Math.round(row.levelPercent)}% remaining`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-md bg-[#eef5f0] px-3 py-3 text-sm text-[#3c6c54]">
                    {isLive ? 'No low-level oxygen warnings were reported by the API.' : 'No sample oxygen supplies are currently at a low level.'}
                  </p>
                )}
              </Card>

              <div className="mt-5 flex items-start gap-2 rounded-md border border-[#dce4df] bg-white px-4 py-3 text-xs leading-5 text-muted">
                <ShieldCheck className="mt-0.5 shrink-0 text-forest" size={15} aria-hidden="true" />
                <p>
                  {isLive
                    ? 'Oxygen levels and availability are returned by the connected API. Equipment operational health is not provided by the current backend.'
                    : 'All facilities, levels, timestamps, and operational statuses shown are demonstration data and are not live hospital readings.'}
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
