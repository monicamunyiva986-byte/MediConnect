import { describe, expect, it } from 'vitest'
import { buildOperationalReportCsv, buildOperationalReportRows, filterReportRecords } from './reports'
import type { BloodStock, HospitalResource, OxygenSupply } from '../types'

const resource = (overrides: Partial<HospitalResource> = {}): HospitalResource => ({
  id: 1,
  hospital: 10,
  hospital_name: 'Central Hospital',
  resource_type: { id: 1, category: 1, category_name: 'Equipment', name: 'Monitor', code: 'MON', is_active: true },
  department: null,
  total_capacity: 20,
  available_quantity: 12,
  reserved_quantity: 2,
  low_stock_threshold: 3,
  is_active: true,
  is_low_stock: false,
  is_critical: false,
  occupancy_rate: 30,
  unit: 'units',
  last_updated: '2026-10-16T08:00:00Z',
  notes: 'Ward stock',
  ...overrides,
})

const bloodStock: BloodStock = {
  id: 2,
  hospital: 10,
  hospital_name: 'Central Hospital',
  blood_group: 'O+',
  component: 'RBC',
  units_available: 8,
  units_reserved: 1,
  expiry_date: '2026-11-01',
  batch_number: 'LOT-42',
  low_stock_threshold: 3,
  last_updated: '2026-10-16T08:00:00Z',
  is_low_stock: false,
}

const oxygenRecord: OxygenSupply = {
  id: 3,
  hospital: 11,
  hospital_name: 'West Clinic',
  supply_type: 'CYLINDER',
  capacity_litres: '500',
  current_level_litres: '120',
  number_of_units: 4,
  available_units: 2,
  low_level_threshold_pct: 20,
  location: 'Store room',
  last_refilled: null,
  last_updated: '2026-10-16T08:00:00Z',
  level_percentage: '24',
  is_low: false,
}

describe('operational report helpers', () => {
  it('filters fetched report records by facility without changing their values', () => {
    const records = [bloodStock, { ...bloodStock, id: 4, hospital_name: 'West Clinic' }]
    expect(filterReportRecords(records, 'all')).toHaveLength(2)
    expect(filterReportRecords(records, 'Central Hospital')).toEqual([bloodStock])
  })

  it('builds rows for actual resource, blood, and oxygen records with their source status', () => {
    const rows = buildOperationalReportRows(
      [resource({ is_critical: true })],
      [bloodStock],
      [{ ...oxygenRecord, is_low: true }],
    )
    expect(rows).toMatchObject([
      { id: 'resource-1', type: 'resources', status: 'Critical', available: '12 units' },
      { id: 'blood-2', type: 'blood', item: 'O+ RBC', status: 'Available', details: expect.stringContaining('LOT-42') },
      { id: 'oxygen-3', type: 'oxygen', status: 'Low', capacity: '500 L' },
    ])
  })

  it('exports escaped CSV rows and empty optional details as real fetched values', () => {
    const rows = buildOperationalReportRows(
      [resource({ hospital_name: 'General, "North"' })],
      [],
      [],
    )
    const csv = buildOperationalReportCsv(rows)
    expect(csv).toContain('"General, ""North"""')
    expect(csv).toContain('"Resource inventory"')
    expect(csv.split('\r\n')).toHaveLength(2)
  })
})
