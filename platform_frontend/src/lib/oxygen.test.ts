import { describe, expect, it } from 'vitest'
import { buildOxygenRows, formatOxygenAmount, formatOxygenUpdatedAt, summarizeOxygen } from './oxygen'
import type { OxygenRecord } from './oxygen'

const oxygenRecord = (overrides: Partial<OxygenRecord> = {}): OxygenRecord => ({
  id: 1,
  hospital: 2,
  hospital_name: 'Sample Hospital',
  supply_type: 'CYLINDER',
  capacity_litres: '100.0',
  current_level_litres: '45.0',
  number_of_units: 4,
  available_units: 3,
  low_level_threshold_pct: 20,
  location: 'ICU storage',
  last_refilled: null,
  last_updated: '2026-10-15T08:30:00Z',
  level_percentage: '45.0',
  is_low: false,
  operational_units: 4,
  ...overrides,
})

describe('oxygen inventory calculations', () => {
  it('calculates level percentages and marks verified low and empty supplies', () => {
    expect(buildOxygenRows([oxygenRecord()])[0]).toMatchObject({ levelPercent: 45, status: 'normal' })
    expect(buildOxygenRows([oxygenRecord({ is_low: true })])[0].status).toBe('low')
    expect(buildOxygenRows([oxygenRecord({ current_level_litres: 0, is_low: true })])[0].status).toBe('critical')
  })

  it('handles missing capacity without inventing a percentage or critical level', () => {
    expect(buildOxygenRows([oxygenRecord({ capacity_litres: null, is_low: false })])[0])
      .toMatchObject({ levelPercent: null, status: 'unknown', capacity: null })
  })

  it('summarizes unit counts and known capacity', () => {
    const rows = buildOxygenRows([
      oxygenRecord(),
      oxygenRecord({ id: 2, capacity_litres: null, is_low: true, operational_units: 1 }),
    ])
    expect(summarizeOxygen(rows)).toMatchObject({
      totalUnits: 8,
      availableUnits: 6,
      operationalUnits: 5,
      attentionUnits: 4,
      capacity: 100,
    })
  })

  it('formats amounts and invalid timestamps safely', () => {
    expect(formatOxygenAmount(1234)).toBe('1,234')
    expect(formatOxygenUpdatedAt('not-a-date')).toBe('Not reported')
  })
})
