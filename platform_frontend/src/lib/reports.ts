import type { BloodStock, HospitalResource, OxygenSupply } from '../types'

export type ReportType = 'all' | 'resources' | 'blood' | 'oxygen'

export interface OperationalReportRow {
  id: string
  type: Exclude<ReportType, 'all'>
  facility: string
  item: string
  classification: string
  available: string
  capacity: string
  status: string
  details: string
  lastUpdated: string
}

export function filterReportRecords<T extends { hospital_name: string }>(
  records: readonly T[],
  facility: string,
): T[] {
  return facility === 'all' ? [...records] : records.filter((record) => record.hospital_name === facility)
}

export function buildOperationalReportRows(
  resources: readonly HospitalResource[],
  blood: readonly BloodStock[],
  oxygen: readonly OxygenSupply[],
): OperationalReportRow[] {
  return [
    ...resources.map((resource) => ({
      id: `resource-${resource.id}`,
      type: 'resources' as const,
      facility: resource.hospital_name,
      item: resource.resource_type.name,
      classification: resource.resource_type.category_name,
      available: `${resource.available_quantity} ${resource.unit}`,
      capacity: `${resource.total_capacity} ${resource.unit}`,
      status: resource.is_critical ? 'Critical' : resource.is_low_stock ? 'Low stock' : resource.is_active ? 'Active' : 'Inactive',
      details: resource.notes,
      lastUpdated: resource.last_updated,
    })),
    ...blood.map((stock) => ({
      id: `blood-${stock.id}`,
      type: 'blood' as const,
      facility: stock.hospital_name,
      item: `${stock.blood_group} ${stock.component}`,
      classification: stock.component,
      available: `${stock.units_available} units`,
      capacity: 'Not reported',
      status: stock.is_low_stock ? 'Low stock' : 'Available',
      details: [
        stock.batch_number ? `Batch ${stock.batch_number}` : '',
        stock.expiry_date ? `Expires ${stock.expiry_date}` : 'Expiry not reported',
        `${stock.units_reserved} reserved`,
      ].filter(Boolean).join(' · '),
      lastUpdated: stock.last_updated,
    })),
    ...oxygen.map((supply) => ({
      id: `oxygen-${supply.id}`,
      type: 'oxygen' as const,
      facility: supply.hospital_name,
      item: supply.location || supply.supply_type,
      classification: supply.supply_type,
      available: `${supply.available_units} / ${supply.number_of_units} units`,
      capacity: supply.capacity_litres === null ? 'Not reported' : `${supply.capacity_litres} L`,
      status: supply.is_low ? 'Low' : 'Reported normal',
      details: `${supply.current_level_litres} L current level`,
      lastUpdated: supply.last_updated,
    })),
  ]
}

const reportTypeLabels: Record<OperationalReportRow['type'], string> = {
  resources: 'Resource inventory',
  blood: 'Blood stock',
  oxygen: 'Oxygen supply',
}

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function buildOperationalReportCsv(rows: readonly OperationalReportRow[]): string {
  const header = ['Report type', 'Facility', 'Item', 'Category / type', 'Available', 'Capacity', 'Status', 'Details', 'Last updated']
  return [header, ...rows.map((row) => [
    reportTypeLabels[row.type],
    row.facility,
    row.item,
    row.classification,
    row.available,
    row.capacity,
    row.status,
    row.details,
    row.lastUpdated,
  ])].map((values) => values.map(csvCell).join(',')).join('\r\n')
}
