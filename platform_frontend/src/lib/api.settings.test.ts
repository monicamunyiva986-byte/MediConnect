import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, patch, post } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get,
      patch,
      post,
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    }),
  },
}))

import { changePassword, getUserProfile, updateUserProfile } from './api'

describe('account settings API', () => {
  beforeEach(() => {
    get.mockReset()
    patch.mockReset()
    post.mockReset()
  })

  it('loads and persists the authenticated profile using the supported endpoint', async () => {
    const profile = { id: 7, email: 'user@example.test', first_name: 'Sam' }
    const update = { first_name: 'Sam', last_name: 'Lee', phone: '', license_number: '', specialization: '', years_of_experience: 0, bio: '', preferred_locations: [], availability_status: 'AVAILABLE' as const }
    get.mockResolvedValue({ data: profile })
    patch.mockResolvedValue({ data: profile })

    await expect(getUserProfile()).resolves.toEqual(profile)
    await expect(updateUserProfile(update)).resolves.toEqual(profile)
    expect(get).toHaveBeenCalledWith('auth/profile/')
    expect(patch).toHaveBeenCalledWith('auth/profile/', update)
  })

  it('submits password changes to the supported account endpoint', async () => {
    const request = { old_password: 'old', new_password: 'new', new_password_confirm: 'new' }
    post.mockResolvedValue({ data: { detail: 'Password updated successfully.' } })

    await expect(changePassword(request)).resolves.toEqual({ detail: 'Password updated successfully.' })
    expect(post).toHaveBeenCalledWith('auth/change-password/', request)
  })
})
