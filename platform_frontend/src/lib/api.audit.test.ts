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

import { getResourceTransactions } from './api'

describe('resource transaction API', () => {
  beforeEach(() => get.mockReset())

  it('requests the selected resource transaction-history endpoint', async () => {
    const records = [{ id: 8, transaction_type: 'ADD' }]
    get.mockResolvedValue({ data: records })

    await expect(getResourceTransactions(23)).resolves.toBe(records)
    expect(get).toHaveBeenCalledWith('resources/stocks/23/transactions/')
  })

})
