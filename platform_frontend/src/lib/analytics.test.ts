import { describe, expect, it } from 'vitest'
import { buildAnalyticsCsv, buildOxygenAnalytics, filterAnalyticsByFacility, groupResourcesByCategory, summarizeAnalytics } from './analytics'
import type { HospitalResource, OxygenSupply } from '../types'

const resource = (overrides: Partial<HospitalResource> = {}): HospitalResource => ({
  id: 1,
  hospital: 10,
  hospital_name: 'Central Hospital',
  resource_type: { id: 1, category: 1, category_name: 'Equipment', name: 'Monitor', code: 'MON', is_active: true },
  department: 1,
  total_capacity: 10,
  available_quantity: 6,
  reserved_quantity: 2,
  low_stock_threshold: 2,
  is_active: true,
  is_low_stock: false,
  is_critical: false,
  occupancy_rate: 20,
  unit: 'units',
  last_updated: '2026-10-16T08:00:00Z',
  notes: '',
  ...overrides,
})

const oxygenSupply = (overrides: Partial<OxygenSupply> = {}): OxygenSupply => ({
  id: 1,
  hospital: 10,
  hospital_name: 'Central Hospital',
  supply_type: 'CYLINDER',
  capacity_litres: 1000,
  current_level_litres: 500,
  number_of_units: 4,
  available_units: 3,
  low_level_threshold_pct: 20,
  location: 'ICU store',
  last_refilled: null,
  last_updated: '2026-10-16T08:00:00Z',
  level_percentage: '50',
  is_low: false,
  ...overrides,
})

describe('analytics helpers', () => {
  it('filters live records by selected facility', () => {
    const resources = [resource(), resource({ id: 2, hospital_name: 'West Clinic' })]
    expect(filterAnalyticsByFacility(resources, 'all')).toHaveLength(2)
    expect(filterAnalyticsByFacility(resources, 'West Clinic')).toEqual([resources[1]])
  })

  it('summarizes current resource and oxygen snapshots', () => {
    const summary = summarizeAnalytics(
      [resource({ is_low_stock: true }), resource({ id: 2, is_critical: true, total_capacity: 5, available_quantity: 1 })],
      [oxygenSupply(), oxygenSupply({ id: 2, is_low: true, number_of_units: 2, available_units: 0 })],
    )
    expect(summary).toMatchObject({
      resourceRecords: 2,
      availableResourceRecords: 2,
      lowStockRecords: 1,
      criticalRecords: 1,
      oxygenRecords: 2,
      oxygenUnits: 6,
      oxygenAvailableUnits: 3,
      lowOxygenRecords: 1,
    })
  })

  it('groups resource capacity and availability by category', () => {
    const result = groupResourcesByCategory([
      resource(),
      resource({ id: 2, total_capacity: 5, available_quantity: 2, resource_type: { ...resource().resource_type, category_name: 'Beds' } }),
      resource({ id: 3, total_capacity: 8, available_quantity: 4 }),
    ])
    expect(result).toEqual([
      { category: 'Beds', resourceRecords: 1, availableRecords: 1, flaggedRecords: 0 },
      { category: 'Equipment', resourceRecords: 2, availableRecords: 2, flaggedRecords: 0 },
    ])
  })

  it('keeps unknown oxygen percentages null and exports properly escaped CSV', () => {
    const oxygen = [oxygenSupply({ hospital_name: '=Unsafe Name', level_percentage: 'unknown' })]
    expect(buildOxygenAnalytics(oxygen)[0].levelPercent).toBeNull()
    const csv = buildAnalyticsCsv([resource({ hospital_name: 'Hospital, "A"' })], oxygen)
    expect(csv).toContain('"Hospital, ""A"""')
    expect(csv).toContain("\"'=Unsafe Name\"")
    expect(csv.split('\r\n')).toHaveLength(3)
  })
})
