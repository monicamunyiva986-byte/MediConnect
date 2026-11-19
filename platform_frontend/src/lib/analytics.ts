import type { HospitalResource, OxygenSupply } from '../types'

export interface AnalyticsSummary {
  resourceRecords: number
  availableResourceRecords: number
  lowStockRecords: number
  criticalRecords: number
  oxygenRecords: number
  oxygenUnits: number
  oxygenAvailableUnits: number
  lowOxygenRecords: number
}

export interface ResourceCategoryAnalytics {
  category: string
  resourceRecords: number
  availableRecords: number
  flaggedRecords: number
}

export interface OxygenAnalytics {
  facility: string
  supplyType: string
  location: string
  levelPercent: number | null
  low: boolean
}

export function filterAnalyticsByFacility<T extends { hospital_name: string }>(
  records: readonly T[],
  facility: string,
): T[] {
  return facility === 'all' ? [...records] : records.filter((record) => record.hospital_name === facility)
}

export function summarizeAnalytics(
  resources: readonly HospitalResource[],
  oxygen: readonly OxygenSupply[],
): AnalyticsSummary {
  return {
    resourceRecords: resources.length,
    availableResourceRecords: resources.filter((resource) => resource.available_quantity > 0).length,
    lowStockRecords: resources.filter((resource) => resource.is_low_stock).length,
    criticalRecords: resources.filter((resource) => resource.is_critical).length,
    oxygenRecords: oxygen.length,
    oxygenUnits: oxygen.reduce((sum, supply) => sum + supply.number_of_units, 0),
    oxygenAvailableUnits: oxygen.reduce((sum, supply) => sum + supply.available_units, 0),
    lowOxygenRecords: oxygen.filter((supply) => supply.is_low).length,
  }
}

export function groupResourcesByCategory(
  resources: readonly HospitalResource[],
): ResourceCategoryAnalytics[] {
  const categories = new Map<string, ResourceCategoryAnalytics>()
  for (const resource of resources) {
    const category = resource.resource_type.category_name
    const current = categories.get(category) ?? { category, resourceRecords: 0, availableRecords: 0, flaggedRecords: 0 }
    current.resourceRecords += 1
    current.availableRecords += Number(resource.available_quantity > 0)
    current.flaggedRecords += Number(resource.is_low_stock || resource.is_critical)
    categories.set(category, current)
  }
  return [...categories.values()].sort((left, right) => left.category.localeCompare(right.category))
}

function toFiniteNumber(value: number | string | null): number | null {
  if (value === null || (typeof value === 'string' && value.trim() === '')) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function buildOxygenAnalytics(oxygen: readonly OxygenSupply[]): OxygenAnalytics[] {
  return oxygen.map((supply) => ({
    facility: supply.hospital_name,
    supplyType: supply.supply_type,
    location: supply.location,
    levelPercent: toFiniteNumber(supply.level_percentage),
    low: supply.is_low,
  }))
}

function csvCell(value: string | number | boolean | null): string {
  const text = value === null ? '' : String(value)
  const safeText = typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safeText.replace(/"/g, '""')}"`
}

export function buildAnalyticsCsv(
  resources: readonly HospitalResource[],
  oxygen: readonly OxygenSupply[],
): string {
  const rows: Array<Array<string | number | boolean | null>> = [
    ['Record type', 'Facility', 'Resource or supply', 'Category or type', 'Quantity unit', 'Capacity', 'Available', 'Reserved', 'Level percent', 'Low', 'Critical', 'Last updated'],
    ...resources.map((resource) => [
      'Resource',
      resource.hospital_name,
      resource.resource_type.name,
      resource.resource_type.category_name,
      resource.unit,
      resource.total_capacity,
      resource.available_quantity,
      resource.reserved_quantity,
      null,
      resource.is_low_stock,
      resource.is_critical,
      resource.last_updated,
    ]),
    ...oxygen.map((supply) => [
      'Oxygen',
      supply.hospital_name,
      supply.location,
      supply.supply_type,
      'units',
      supply.capacity_litres,
      supply.available_units,
      null,
      toFiniteNumber(supply.level_percentage),
      supply.is_low,
      null,
      supply.last_updated,
    ]),
  ]
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}
