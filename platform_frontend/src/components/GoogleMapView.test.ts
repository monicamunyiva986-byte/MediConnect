import { describe, expect, it } from 'vitest'
import { calculateStraightLineDistanceKm } from './GoogleMapView'

describe('hospital map distance calculations', () => {
  it('returns zero for the same point', () => {
    expect(calculateStraightLineDistanceKm(
      { lat: -1.2864, lng: 36.8172 },
      { lat: -1.2864, lng: 36.8172 },
    )).toBe(0)
  })

  it('calculates a finite distance between two locations', () => {
    const distance = calculateStraightLineDistanceKm(
      { lat: -1.2864, lng: 36.8172 },
      { lat: -4.0435, lng: 39.6682 },
    )
    expect(distance).toBeGreaterThan(400)
    expect(distance).toBeLessThan(450)
  })
})
