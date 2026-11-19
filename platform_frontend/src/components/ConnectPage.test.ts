import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { clearCachedAccountData } from './ConnectPage'

describe('account connection cache boundary', () => {
  it('cancels and clears cached account records before changing sessions', async () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(['hospital-resources'], [{ id: 1 }])

    await clearCachedAccountData(queryClient)

    expect(queryClient.getQueryData(['hospital-resources'])).toBeUndefined()
  })
})
