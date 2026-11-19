import type { OxygenSupply } from '../types'

export interface OxygenRecord extends OxygenSupply {
  operational_units?: number
}

export type OxygenLevelStatus = 'critical' | 'low' | 'normal' | 'unknown'

export interface OxygenInventoryRow {
  id: number
  facility: string
  identifier: string
  supplyType: string
  location: string
  currentLevel: number
  capacity: number | null
  levelPercent: number | null
  status: OxygenLevelStatus
  availableUnits: number
  totalUnits: number
  operationalUnits: number | null
  lastUpdated: string | null
}

export interface OxygenSummary {
  totalUnits: number
  availableUnits: number
  operationalUnits: number | null
  attentionUnits: number
  capacity: number
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

export function buildOxygenRows(records: readonly OxygenRecord[]): OxygenInventoryRow[] {
  return records.map((record) => {
    const currentLevel = toFiniteNumber(record.current_level_litres) ?? 0
    const capacity = toFiniteNumber(record.capacity_litres)
    const levelPercent = capacity !== null && capacity > 0
      ? Math.min(100, Math.max(0, (currentLevel / capacity) * 100))
      : null
    const status: OxygenLevelStatus = capacity !== null && capacity > 0 && currentLevel <= 0
      ? 'critical'
      : record.is_low
        ? 'low'
        : capacity === null || capacity <= 0
          ? 'unknown'
          : 'normal'

    return {
      id: record.id,
      facility: record.hospital_name,
      identifier: `OXY-${String(record.id).padStart(3, '0')}`,
      supplyType: record.supply_type,
      location: record.location,
      currentLevel,
      capacity,
      levelPercent,
      status,
      availableUnits: record.available_units,
      totalUnits: record.number_of_units,
      operationalUnits: record.operational_units ?? null,
      lastUpdated: record.last_updated || null,
    }
  })
}

export function summarizeOxygen(rows: readonly OxygenInventoryRow[]): OxygenSummary {
  return rows.reduce<OxygenSummary>((summary, row) => ({
    totalUnits: summary.totalUnits + row.totalUnits,
    availableUnits: summary.availableUnits + row.availableUnits,
    operationalUnits: summary.operationalUnits === null || row.operationalUnits === null
      ? null
      : summary.operationalUnits + row.operationalUnits,
    attentionUnits: summary.attentionUnits + (row.status === 'critical' || row.status === 'low' ? row.totalUnits : 0),
    capacity: summary.capacity + (row.capacity ?? 0),
  }), {
    totalUnits: 0,
    availableUnits: 0,
    operationalUnits: 0,
    attentionUnits: 0,
    capacity: 0,
  })
}

export function formatOxygenAmount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)
}

export function formatOxygenUpdatedAt(value: string | null): string {
  if (!value) return 'Not reported'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not reported'
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
