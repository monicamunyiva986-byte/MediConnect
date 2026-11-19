import { describe, expect, it } from 'vitest'
import { buildICUUnits, isICUResource, sampleUnits, summarizeICU } from './icu'
import type { Department, HospitalResource } from '../types'

const department = (overrides: Partial<Department> = {}): Department => ({
  id: 1,
  name: 'Cardiac ICU',
  hospital: 10,
  is_active: true,
  ...overrides,
})

const resource = (overrides: Partial<HospitalResource> = {}): HospitalResource => ({
  id: 1,
  hospital: 10,
  hospital_name: 'General Hospital',
  resource_type: {
    id: 1,
    category: 2,
    category_name: 'Critical Care',
    name: 'ICU Bed',
    code: 'ICU-BED',
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
  notes: 'High acuity unit',
  ...overrides,
})

describe('ICU resource helpers', () => {
  it('flags active ICU resources by category or name', () => {
    expect(isICUResource(resource())).toBe(true)
    expect(isICUResource(resource({ is_active: false }))).toBe(false)
    expect(isICUResource(resource({
      resource_type: {
        ...resource().resource_type,
        category_name: 'General Wards',
        name: 'Ward Bed',
      },
    }))).toBe(false)
    expect(isICUResource(resource({
      resource_type: {
        ...resource().resource_type,
        category_name: 'Support',
        name: 'ICU Monitoring',
      },
    }))).toBe(true)
  })

  it('builds ICU units with occupied totals and department names', () => {
    const departments = [department({ id: 1, name: 'Cardiac ICU' }), department({ id: 2, name: 'Neuro ICU' })]
    const units = buildICUUnits([
      resource({ id: 1, department: 1, total_capacity: 12, available_quantity: 4, reserved_quantity: 2, low_stock_threshold: 5 }),
      resource({ id: 2, department: 2, total_capacity: 10, available_quantity: 3, reserved_quantity: 1, low_stock_threshold: 3 }),
    ], departments)

    expect(units).toHaveLength(2)
    expect(units[0]).toMatchObject({
      id: 1,
      name: 'Cardiac ICU',
      capacity: 12,
      available: 4,
      occupied: 6,
      reserved: 2,
      threshold: 5,
    })
    expect(units[1]).toMatchObject({
      id: 2,
      name: 'Neuro ICU',
      capacity: 10,
      available: 3,
      occupied: 6,
      reserved: 1,
      threshold: 3,
    })
  })

  it('summarizes occupancy across all ICU units', () => {
    const units = [
      { id: 1, name: 'Medical ICU', capacity: 12, available: 4, occupied: 6, reserved: 2, threshold: 5 },
      { id: 2, name: 'Surgical ICU', capacity: 18, available: 7, occupied: 9, reserved: 2, threshold: 6 },
    ]

    expect(summarizeICU(units)).toMatchObject({
      capacity: 30,
      available: 11,
      occupied: 15,
      reserved: 4,
      occupancyPercent: 50,
    })
  })

  it('keeps sample units available for demo mode', () => {
    expect(sampleUnits.length).toBeGreaterThan(0)
    expect(sampleUnits[0]).toMatchObject({ name: 'Medical ICU' })
  })
})
