import type { Department, HospitalResource, ICUSummary, ICUUnit } from '../types'

export function isICUResource(resource: HospitalResource): boolean {
  const category = resource.resource_type.category_name.toLowerCase()
  const name = resource.resource_type.name.toLowerCase()
  return resource.is_active && (category.includes('icu') || name.includes('icu'))
}

export function buildICUUnits(
  resources: HospitalResource[],
  departments: Department[],
): ICUUnit[] {
  const departmentNames = new Map(departments.map((department) => [department.id, department.name]))

  return resources.filter(isICUResource).map((resource) => ({
    id: resource.id,
    name: resource.department === null
      ? resource.resource_type.name
      : departmentNames.get(resource.department) ?? `Department ${resource.department}`,
    capacity: resource.total_capacity,
    available: resource.available_quantity,
    occupied: Math.max(
      resource.total_capacity - resource.available_quantity - resource.reserved_quantity,
      0,
    ),
    reserved: resource.reserved_quantity,
    threshold: resource.low_stock_threshold,
  }))
}

export function summarizeICU(units: ICUUnit[]): ICUSummary {
  const summary = units.reduce(
    (totals, unit) => ({
      capacity: totals.capacity + unit.capacity,
      available: totals.available + unit.available,
      occupied: totals.occupied + unit.occupied,
      reserved: totals.reserved + unit.reserved,
    }),
    { capacity: 0, available: 0, occupied: 0, reserved: 0 },
  )

  return {
    ...summary,
    occupancyPercent: summary.capacity > 0
      ? Math.round((summary.occupied / summary.capacity) * 100)
      : 0,
  }
}

export const sampleUnits: ICUUnit[] = [
  { id: 1, name: 'Medical ICU', capacity: 24, available: 5, occupied: 17, reserved: 2, threshold: 5 },
  { id: 2, name: 'Surgical ICU', capacity: 18, available: 4, occupied: 13, reserved: 1, threshold: 4 },
  { id: 3, name: 'Cardiac ICU', capacity: 12, available: 2, occupied: 10, reserved: 0, threshold: 3 },
  { id: 4, name: 'Neuro ICU', capacity: 10, available: 3, occupied: 6, reserved: 1, threshold: 3 },
]