import { describe, expect, it } from 'vitest'
import { filterHospitalResources, summarizeHospitalResources, formatResourceUpdatedAt } from './resourceManagement'
import type { HospitalResource } from '../types'

const resource = (overrides: Partial<HospitalResource> = {}): HospitalResource => ({
  id: 1,
  hospital: 10,
  hospital_name: 'General Hospital',
  resource_type: {
    id: 4,
    category: 1,
    category_name: 'Critical Care',
    name: 'ICU Bed',
    code: 'ICU-001',
    is_active: true,
  },
  department: 1,
  total_capacity: 12,
  available_quantity: 4,
  reserved_quantity: 2,
  low_stock_threshold: 5,
  is_active: true,
  is_low_stock: false,
  is_critical: false,
  occupancy_rate: 0.67,
  unit: 'bed',
  last_updated: '2026-10-15T08:30:00Z',
  notes: 'Monitor in 4 hours',
  ...overrides,
})

describe('resource management helpers', () => {
  it('filters by facility, category, status, and search text', () => {
    const resources = [
      resource({ id: 1, hospital_name: 'General Hospital', resource_type: { ...resource().resource_type, category_name: 'Critical Care', name: 'ICU Bed' }, is_low_stock: true }),
      resource({ id: 2, hospital_name: 'West Wing', resource_type: { ...resource().resource_type, category_name: 'Surgery', name: 'Recovery Bed' }, is_low_stock: false }),
      resource({ id: 3, hospital_name: 'General Hospital', resource_type: { ...resource().resource_type, category_name: 'Critical Care', name: 'Ventilator' }, is_critical: true, notes: 'Backup unit' }),
      resource({ id: 4, hospital_name: 'General Hospital', resource_type: { ...resource().resource_type, category_name: 'Diagnostics', name: 'MRI Scanner' }, is_active: false }),
    ]

    expect(filterHospitalResources(resources, { facility: 'all', category: 'all', status: 'all', search: '' })).toHaveLength(4)
    expect(filterHospitalResources(resources, { facility: 'General Hospital', category: 'all', status: 'all', search: '' })).toHaveLength(3)
    expect(filterHospitalResources(resources, { facility: 'all', category: 'Critical Care', status: 'all', search: '' })).toHaveLength(2)
    expect(filterHospitalResources(resources, { facility: 'all', category: 'all', status: 'critical', search: '' })).toHaveLength(1)
    expect(filterHospitalResources(resources, { facility: 'all', category: 'all', status: 'all', search: 'backup' })).toHaveLength(1)
  })

  it('summarizes total capacity and flagged resource counts', () => {
    const resources = [
      resource({ id: 1, total_capacity: 12, available_quantity: 4, is_low_stock: true, is_critical: false }),
      resource({ id: 2, total_capacity: 8, available_quantity: 1, is_low_stock: true, is_critical: true }),
      resource({ id: 3, total_capacity: 5, available_quantity: 5, is_low_stock: false, is_critical: false }),
    ]

    expect(summarizeHospitalResources(resources)).toMatchObject({
      resourceTypes: 3,
      totalCapacity: 25,
      available: 10,
      lowStock: 2,
      critical: 1,
    })
  })

  it('formats dates robustly when last updated is missing or invalid', () => {
    expect(formatResourceUpdatedAt('2026-10-15T08:30:00Z')).toContain('Oct')
    expect(formatResourceUpdatedAt('not-a-date')).toBe('Not reported')
    expect(formatResourceUpdatedAt('')).toBe('Not reported')
  })
})
