import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  ChevronDown,
  CircleHelp,
  Clock3,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link } from 'react-router-dom'
import { WorkspaceNavigation } from './WorkspaceNavigation'
import { getHospitalDepartments, getHospitals, getHospitalResources } from '../lib/api'
import { buildICUUnits, sampleUnits, summarizeICU } from '../lib/icu'
import { useAuthStore } from '../store/auth'
import type { Hospital } from '../types'
import { Card, CardHeader, CardTitle } from './ui/card'

const chartColors = { available: '#3e8a69', occupied: '#d97862', reserved: '#d49a36' }
const sampleHospital: Hospital = {
  id: 0,
  name: 'Sample Hospital',
  city: 'Demo location',
  country: '',
  is_active: true,
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: number | string
  detail: string
  icon: typeof BedDouble
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

function displayError(error: unknown): string {
  if (error instanceof Error && error.message.includes('Network Error')) {
    return 'The API could not be reached. Check that Django is running and the API URL is correct.'
  }
  return 'Could not load ICU data. Check your access and try again.'
}

export function ICUDashboard() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null)
  const isLive = Boolean(token)

  const hospitalsQuery = useQuery({
    queryKey: ['hospitals'],
    queryFn: getHospitals,
    enabled: isLive,
  })
  const resourcesQuery = useQuery({
    queryKey: ['hospital-resources'],
    queryFn: getHospitalResources,
    enabled: isLive && selectedHospitalId !== null,
  })
  const departmentsQuery = useQuery({
    queryKey: ['hospital-departments', selectedHospitalId],
    queryFn: () => getHospitalDepartments(selectedHospitalId!),
    enabled: isLive && selectedHospitalId !== null,
  })

  useEffect(() => {
    const hospitals = hospitalsQuery.data
    if (hospitals?.length && !hospitals.some((hospital) => hospital.id === selectedHospitalId)) {
      setSelectedHospitalId(hospitals[0].id)
    }
  }, [hospitalsQuery.data, selectedHospitalId])

  const selectedHospital = isLive
    ? hospitalsQuery.data?.find((hospital) => hospital.id === selectedHospitalId) ?? null
    : sampleHospital
  const liveUnits = useMemo(() => {
    if (!selectedHospitalId || !resourcesQuery.data) return []
    const hospitalResources = resourcesQuery.data.filter((resource) => resource.hospital === selectedHospitalId)
    return buildICUUnits(hospitalResources, departmentsQuery.data ?? [])
  }, [departmentsQuery.data, resourcesQuery.data, selectedHospitalId])
  const units = isLive ? liveUnits : sampleUnits
  const summary = useMemo(() => summarizeICU(units), [units])
  const alerts = units.filter((unit) => unit.available <= unit.threshold)
  const loading = isLive && (hospitalsQuery.isLoading || resourcesQuery.isLoading)
  const queryError = hospitalsQuery.error || resourcesQuery.error
  const chartData = units.map((unit) => ({
    name: unit.name,
    Available: unit.available,
    Occupied: unit.occupied,
    Reserved: unit.reserved,
  }))
  const refreshedAt = resourcesQuery.dataUpdatedAt
    ? new Date(resourcesQuery.dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  async function signOut() {
    await queryClient.cancelQueries()
    queryClient.clear()
    clearSession()
    setSelectedHospitalId(null)
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
        <WorkspaceNavigation current="/" />
        <div className="hidden flex-1 lg:block" />
        <div className="hidden border-t border-white/10 p-5 lg:block">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <ShieldCheck size={15} aria-hidden="true" /> Secure workspace
          </div>
          <p className="mt-2 text-[11px] leading-5 text-white/45">Hospital resource view. Patient records are not displayed.</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-5 py-3 shadow-sm backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="hidden sm:inline">Operations</span>
            <span className="hidden text-[#bdc7c1] sm:inline">/</span>
            <span className="font-semibold text-ink">ICU dashboard</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${isLive ? 'bg-[#e5f2eb] text-[#28664e]' : 'bg-[#fbf1df] text-[#8b641d]'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-[#3e8a69]' : 'bg-[#d49a36]'}`} />
              {isLive ? 'Signed in' : 'Sample data · not live'}
            </div>
            {isLive ? (
              <button onClick={signOut} className="inline-flex h-9 items-center gap-2 rounded-md border border-black/10 px-3 text-xs font-medium text-muted transition hover:bg-canvas hover:text-ink" type="button" title={user?.first_name || 'Sign out'}>
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
              <p className="text-xs font-semibold uppercase text-forest">Critical care</p>
              <h1 className="mt-2 text-[26px] font-semibold leading-tight text-ink sm:text-[30px]">ICU capacity overview</h1>
              <p className="mt-2 text-sm text-muted">Bed availability and utilization across intensive care units.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isLive && hospitalsQuery.data && hospitalsQuery.data.length > 0 && (
                <label className="relative">
                  <span className="sr-only">Select hospital</span>
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
                  <select
                    className="h-10 min-w-[210px] appearance-none rounded-md border border-[#d8e0db] bg-white py-2 pl-9 pr-9 text-sm font-medium text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/10"
                    onChange={(event) => setSelectedHospitalId(Number(event.target.value))}
                    value={selectedHospitalId ?? ''}
                  >
                    {hospitalsQuery.data.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={15} aria-hidden="true" />
                </label>
              )}
              {isLive && selectedHospitalId !== null && (
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d8e0db] bg-white px-3 text-xs font-medium text-ink transition hover:bg-[#f8faf9] disabled:opacity-60"
                  disabled={resourcesQuery.isFetching}
                  onClick={() => void resourcesQuery.refetch()}
                  type="button"
                  aria-label="Refresh ICU data"
                >
                  <RefreshCw className={resourcesQuery.isFetching ? 'animate-spin' : ''} size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#d7e6dd] bg-[#eaf3ee] px-4 py-3 text-xs text-[#355f4c]">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{selectedHospital?.name ?? (isLive ? 'Choose a hospital' : sampleHospital.name)}</span>
              {!isLive && <span className="rounded bg-white/70 px-2 py-1 text-[10px] font-bold uppercase">Demonstration only</span>}
            </div>
            <div className="inline-flex items-center gap-1.5 text-[#547665]">
              <Clock3 size={14} aria-hidden="true" />
              {isLive ? (refreshedAt ? `Updated ${refreshedAt}` : 'Waiting for resource data') : 'Example figures · no hospital data connected'}
            </div>
          </div>

          {loading && (
            <div className="mt-5 rounded-lg border border-black/[0.06] bg-white px-5 py-8 text-center text-sm text-muted" role="status">
              Loading hospital resource data…
            </div>
          )}
          {queryError && (
            <div className="mt-5 flex flex-col gap-3 rounded-lg border border-[#f0c9be] bg-[#fff6f3] p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p className="text-sm text-[#914c3c]">{displayError(queryError)}</p>
              <button
                className="inline-flex h-9 w-fit items-center gap-2 rounded-md border border-[#e6b9ad] bg-white px-3 text-xs font-semibold text-[#914c3c] hover:bg-[#fff1ed]"
                onClick={() => {
                  if (hospitalsQuery.error) void hospitalsQuery.refetch()
                  else void resourcesQuery.refetch()
                }}
                type="button"
              >
                <RefreshCw size={14} aria-hidden="true" /> Retry
              </button>
            </div>
          )}
          {isLive && !loading && !queryError && hospitalsQuery.data?.length === 0 && (
            <div className="mt-5 rounded-lg border border-dashed border-[#cbd8d0] bg-white px-5 py-10 text-center">
              <Building2 className="mx-auto text-muted" size={24} aria-hidden="true" />
              <h2 className="mt-3 text-sm font-semibold text-ink">No hospitals are available for this account</h2>
              <p className="mt-1 text-sm text-muted">Ask an administrator to grant hospital access, then retry.</p>
            </div>
          )}

          {!loading && !queryError && selectedHospital && (
            <>
              {isLive && units.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-[#cbd8d0] bg-white px-5 py-10 text-center">
                  <BedDouble className="mx-auto text-muted" size={24} aria-hidden="true" />
                  <h2 className="mt-3 text-sm font-semibold text-ink">No ICU bed resources registered</h2>
                  <p className="mt-1 text-sm text-muted">This hospital has no active resource type with “ICU” in its category or name.</p>
                </div>
              ) : (
                <>
                  <section aria-label="ICU bed summary" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Total capacity" value={summary.capacity} detail="Registered ICU beds" icon={BedDouble} tone="dark" />
                    <MetricCard label="Available beds" value={summary.available} detail="Ready for allocation" icon={ArrowUpRight} tone="green" />
                    <MetricCard label="Occupied beds" value={summary.occupied} detail={`${summary.occupancyPercent}% of total capacity`} icon={ArrowDownRight} tone="coral" />
                    <MetricCard label="Reserved beds" value={summary.reserved} detail="Allocated, not yet occupied" icon={ShieldCheck} tone="amber" />
                  </section>

                  <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
                    <Card className="p-5 sm:p-6">
                      <CardHeader>
                        <div>
                          <CardTitle>Bed availability by unit</CardTitle>
                          <p className="mt-1.5 text-xs text-muted">Current capacity split · beds</p>
                        </div>
                        <CircleHelp className="text-[#a3aea8]" size={17} aria-label="Reserved beds are allocated but not occupied" />
                      </CardHeader>
                      <div className="mt-6 h-[260px] w-full" role="img" aria-label="Stacked bar chart showing available, occupied, and reserved ICU beds by unit">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ top: 2, right: 16, bottom: 0, left: 4 }} barSize={19}>
                            <CartesianGrid horizontal={false} stroke="#edf1ee" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#89958e', fontSize: 11 }} />
                            <YAxis type="category" dataKey="name" width={105} axisLine={false} tickLine={false} tick={{ fill: '#58665e', fontSize: 11 }} />
                            <Tooltip cursor={{ fill: '#f4f7f5' }} contentStyle={{ border: '1px solid #e4eae6', borderRadius: 6, fontSize: 12 }} />
                            <Bar dataKey="Available" stackId="beds" fill={chartColors.available} radius={[4, 0, 0, 4]} />
                            <Bar dataKey="Occupied" stackId="beds" fill={chartColors.occupied} />
                            <Bar dataKey="Reserved" stackId="beds" fill={chartColors.reserved} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 border-t border-black/[0.05] pt-4">
                        {Object.entries(chartColors).map(([label, color]) => (
                          <div key={label} className="flex items-center gap-2 text-[11px] capitalize text-muted">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />{label}
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-5 sm:p-6">
                      <CardHeader>
                        <div>
                          <CardTitle>Capacity utilization</CardTitle>
                          <p className="mt-1.5 text-xs text-muted">Occupied beds against total capacity</p>
                        </div>
                        <span className="rounded bg-[#fae9e4] px-2 py-1 text-xs font-semibold text-[#a9503d]">{summary.occupancyPercent}%</span>
                      </CardHeader>
                      <div className="relative mx-auto mt-2 h-[190px] max-w-[260px]" role="img" aria-label={`${summary.occupancyPercent}% of ICU beds are occupied`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[{ name: 'Occupied', value: summary.occupied }, { name: 'Available', value: summary.available }, { name: 'Reserved', value: summary.reserved }]} dataKey="value" nameKey="name" innerRadius={62} outerRadius={83} startAngle={90} endAngle={-270} paddingAngle={2} stroke="none">
                              {[chartColors.occupied, chartColors.available, chartColors.reserved].map((color) => <Cell key={color} fill={color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ border: '1px solid #e4eae6', borderRadius: 6, fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[30px] font-semibold leading-none text-ink">{summary.occupancyPercent}%</span>
                          <span className="mt-1.5 text-[11px] text-muted">in use</span>
                        </div>
                      </div>
                      <div className="space-y-3 border-t border-black/[0.05] pt-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-muted"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: chartColors.occupied }} /> Occupied</span>
                          <span className="font-semibold text-ink">{summary.occupied} beds</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-muted"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: chartColors.available }} /> Available</span>
                          <span className="font-semibold text-ink">{summary.available} beds</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-muted"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: chartColors.reserved }} /> Reserved</span>
                          <span className="font-semibold text-ink">{summary.reserved} beds</span>
                        </div>
                      </div>
                    </Card>
                  </section>

                  <Card className="mt-4 p-5 sm:p-6">
                    <CardHeader>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle>Bed availability alerts</CardTitle>
                          {alerts.length > 0 && <span className="rounded-full bg-[#fae9e4] px-2 py-0.5 text-[10px] font-bold text-[#a9503d]">{alerts.length}</span>}
                        </div>
                        <p className="mt-1.5 text-xs text-muted">Units at or below their configured available-bed threshold</p>
                      </div>
                      <AlertTriangle className={alerts.length ? 'text-[#c87a32]' : 'text-[#a3aea8]'} size={18} aria-hidden="true" />
                    </CardHeader>
                    {alerts.length > 0 ? (
                      <div className="mt-4 divide-y divide-black/[0.05]">
                        {alerts.map((unit) => (
                          <div key={unit.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#fbf1df] text-[#996b1d]"><AlertTriangle size={15} aria-hidden="true" /></span>
                              <div>
                                <p className="text-sm font-medium text-ink">{unit.name}</p>
                                <p className="mt-0.5 text-xs text-muted">Available beds reached the set threshold</p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-[#a9503d]">{unit.available} available · threshold {unit.threshold}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-md bg-[#eef5f0] px-3 py-3 text-sm text-[#3c6c54]">No ICU units are currently at their available-bed threshold.</p>
                    )}
                  </Card>
                </>
              )}
            </>
          )}

          {isLive && !loading && !queryError && selectedHospital && units.length > 0 && (
            <p className="mt-5 text-center text-[11px] text-muted">
              Resource counts are shown as returned by the hospital API. No patient-identifiable data is requested or displayed.
              {refreshedAt ? ` Refreshed at ${refreshedAt}.` : ''}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}