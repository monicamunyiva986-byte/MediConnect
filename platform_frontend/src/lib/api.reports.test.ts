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

import { getBloodStocks, getHospitalResources, getOxygenSupplies } from './api'

describe('reports API integration', () => {
  beforeEach(() => get.mockReset())

  it('uses supported inventory, blood stock, and oxygen endpoints', async () => {
    const records = [{ id: 1 }]
    get.mockResolvedValue({ data: records })

    await expect(getHospitalResources()).resolves.toEqual(records)
    await expect(getBloodStocks()).resolves.toEqual(records)
    await expect(getOxygenSupplies()).resolves.toEqual(records)
    expect(get).toHaveBeenNthCalledWith(1, 'resources/stocks/')
    expect(get).toHaveBeenNthCalledWith(2, 'resources/blood/')
    expect(get).toHaveBeenNthCalledWith(3, 'resources/oxygen/')
  })
})
