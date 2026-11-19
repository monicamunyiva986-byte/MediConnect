import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get,
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }),
  },
}))

import { getHospitalResources, getOxygenSupplies } from './api'

describe('analytics data API integration', () => {
  beforeEach(() => get.mockReset())

  it('uses the existing resource and oxygen list endpoints without inventing analytics endpoints', async () => {
    const resources = [{ id: 4 }]
    const oxygen = [{ id: 8 }]
    get.mockResolvedValueOnce({ data: resources }).mockResolvedValueOnce({ data: oxygen })

    await expect(getHospitalResources()).resolves.toEqual(resources)
    await expect(getOxygenSupplies()).resolves.toEqual(oxygen)
    expect(get).toHaveBeenNthCalledWith(1, 'resources/stocks/')
    expect(get).toHaveBeenNthCalledWith(2, 'resources/oxygen/')
  })
})
