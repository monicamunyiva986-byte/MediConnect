import type { HospitalResource } from '../types'

export type ResourceStatusFilter = 'all' | 'low' | 'critical' | 'inactive'

export interface ResourceSummary {
  resourceTypes: number
  totalCapacity: number
  available: number
  lowStock: number
  critical: number
}

export function filterHospitalResources(
  resources: readonly HospitalResource[],
  filters: {
    facility: string
    category: string
    status: ResourceStatusFilter
    search: string
  },
): HospitalResource[] {
  const search = filters.search.trim().toLowerCase()
  return resources.filter((resource) => {
    if (filters.facility !== 'all' && resource.hospital_name !== filters.facility) return false
    if (filters.category !== 'all' && resource.resource_type.category_name !== filters.category) return false
    if (filters.status === 'low' && !resource.is_low_stock) return false
    if (filters.status === 'critical' && !resource.is_critical) return false
    if (filters.status === 'inactive' && resource.is_active) return false
    if (!search) return true
    return [
      resource.hospital_name,
      resource.resource_type.name,
      resource.resource_type.category_name,
      resource.resource_type.code,
      resource.unit,
      resource.notes,
    ].some((value) => value.toLowerCase().includes(search))
  })
}

export function summarizeHospitalResources(resources: readonly HospitalResource[]): ResourceSummary {
  return resources.reduce<ResourceSummary>((summary, resource) => ({
    resourceTypes: summary.resourceTypes + 1,
    totalCapacity: summary.totalCapacity + resource.total_capacity,
    available: summary.available + resource.available_quantity,
    lowStock: summary.lowStock + Number(resource.is_low_stock),
    critical: summary.critical + Number(resource.is_critical),
  }), {
    resourceTypes: 0,
    totalCapacity: 0,
    available: 0,
    lowStock: 0,
    critical: 0,
  })
}

export function formatResourceUpdatedAt(value: string): string {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Not reported'
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
