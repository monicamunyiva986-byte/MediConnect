import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, BriefcaseMedical, Building2, CalendarClock, CheckCircle2, LogOut, Plus, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  addHospitalStaff,
  checkInAssignment,
  checkOutAssignment,
  closeContract,
  createBid,
  createContract,
  createDepartment,
  createHospital,
  getAssignments,
  getBids,
  getContract,
  getContracts,
  getHospital,
  getHospitalDepartments,
  getHospitals,
  getHospitalStaff,
  publishContract,
  reviewBid,
  searchUsers,
  updateAssignmentReview,
  updateHospital,
} from '../lib/api'
import { useAuthStore } from '../store/auth'
import type { Hospital, HospitalDetails, WorkContractCreate } from '../types'
import { Card, CardHeader, CardTitle } from './ui/card'
import { WorkspaceNavigation } from './WorkspaceNavigation'

type StaffingTab = 'contracts' | 'bids' | 'assignments' | 'facilities'

const initialContractForm = {
  title: '',
  description: '',
  contract_type: 'SHIFT',
  required_role: 'ANY',
  specialization_required: '',
  min_years_experience: '0',
  start_datetime: '',
  end_datetime: '',
  location_details: '',
  budget_min: '',
  budget_max: '',
  currency: 'KES',
  payment_type: 'SHIFT',
  urgency: 'NORMAL',
  max_bids: '',
  requirements: '',
  benefits: '',
}

type ContractForm = typeof initialContractForm

const emptyHospitalForm = {
  name: '',
  registration_number: '',
  address: '',
  city: '',
  state: '',
  country: 'Kenya',
  postal_code: '',
  phone: '',
  email: '',
  website: '',
  description: '',
}

type HospitalForm = typeof emptyHospitalForm

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()
}

function errorLabel(isError: boolean, message: string) {
  return isError ? <p role="alert" className="mt-3 rounded-md bg-[#fff1ed] px-3 py-2 text-sm text-[#9d4937]">{message}</p> : null
}

function TextInput({ label, value, onChange, required = false, type = 'text', min, step }: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  type?: string
  min?: number
  step?: number
}) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <input type={type} required={required} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-[#3e8a69]/15" />
    </label>
  )
}

export function StaffingDashboard() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const isLive = Boolean(token)
  const isHospitalAdmin = user?.role === 'HOSPITAL_ADMIN' || user?.role === 'ADMIN'
  const isProfessional = ['DOCTOR', 'NURSE', 'SPECIALIST'].includes(user?.role ?? '')
  const [tab, setTab] = useState<StaffingTab>('contracts')
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null)
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null)
  const [contractSearch, setContractSearch] = useState('')
  const [contractForm, setContractForm] = useState<ContractForm>(initialContractForm)
  const [bidForm, setBidForm] = useState({ proposed_rate: '', message: '', availability_confirmed: true })
  const [roleFilter, setRoleFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [specializationFilter, setSpecializationFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [hospitalForm, setHospitalForm] = useState<HospitalForm>(emptyHospitalForm)
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '' })
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [memberRole, setMemberRole] = useState('COORDINATOR')
  const [reviewAssignmentId, setReviewAssignmentId] = useState<number | null>(null)
  const [assignmentReview, setAssignmentReview] = useState({ rating: '5', feedback: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const hospitalsQuery = useQuery({ queryKey: ['hospitals'], queryFn: getHospitals, enabled: isLive })
  const contractsQuery = useQuery({ queryKey: ['contracts'], queryFn: getContracts, enabled: isLive })
  const bidsQuery = useQuery({ queryKey: ['bids'], queryFn: getBids, enabled: isLive })
  const assignmentsQuery = useQuery({ queryKey: ['assignments'], queryFn: getAssignments, enabled: isLive })
  const detailQuery = useQuery({
    queryKey: ['contract-detail', selectedContractId],
    queryFn: () => getContract(selectedContractId!),
    enabled: isLive && selectedContractId !== null && tab === 'contracts',
  })
  const hospitalDetailsQuery = useQuery({
    queryKey: ['hospital-detail', selectedHospitalId],
    queryFn: () => getHospital(selectedHospitalId!),
    enabled: isLive && isHospitalAdmin && selectedHospitalId !== null && tab === 'facilities',
  })
  const departmentsQuery = useQuery({
    queryKey: ['hospital-departments', selectedHospitalId],
    queryFn: () => getHospitalDepartments(selectedHospitalId!),
    enabled: isLive && isHospitalAdmin && selectedHospitalId !== null,
  })
  const staffQuery = useQuery({
    queryKey: ['hospital-staff', selectedHospitalId],
    queryFn: () => getHospitalStaff(selectedHospitalId!),
    enabled: isLive && isHospitalAdmin && selectedHospitalId !== null && tab === 'facilities',
  })
  const usersQuery = useQuery({
    queryKey: ['user-search', memberSearch],
    queryFn: () => searchUsers(memberSearch.trim()),
    enabled: isLive && isHospitalAdmin && tab === 'facilities' && memberSearch.trim().length >= 2,
  })

  useEffect(() => {
    const hospitals = hospitalsQuery.data
    if (hospitals?.length && !hospitals.some((hospital) => hospital.id === selectedHospitalId)) {
      setSelectedHospitalId(hospitals[0].id)
    }
  }, [hospitalsQuery.data, selectedHospitalId])

  useEffect(() => {
    setSelectedDepartmentId('')
  }, [selectedHospitalId])

  useEffect(() => {
    const hospital = hospitalDetailsQuery.data
    if (!hospital) return
    setHospitalForm({
      name: hospital.name,
      registration_number: hospital.registration_number,
      address: hospital.address,
      city: hospital.city,
      state: hospital.state,
      country: hospital.country,
      postal_code: hospital.postal_code,
      phone: hospital.phone,
      email: hospital.email,
      website: hospital.website,
      description: hospital.description,
    })
  }, [hospitalDetailsQuery.data])

  const invalidateMarketplace = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['contracts'] }),
      queryClient.invalidateQueries({ queryKey: ['bids'] }),
      queryClient.invalidateQueries({ queryKey: ['assignments'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ])
  }
  const contractMutation = useMutation({
    mutationFn: createContract,
    onSuccess: async () => {
      setContractForm(initialContractForm)
      setFormError(null)
      setFeedback('Draft contract created.')
      await invalidateMarketplace()
    },
    onError: () => setFormError('Contract could not be created. Check required fields and your hospital administrator access.'),
  })
  const publishMutation = useMutation({
    mutationFn: publishContract,
    onSuccess: invalidateMarketplace,
    onError: () => setFormError('Contract could not be published. Refresh and confirm it is still a draft.'),
  })
  const closeMutation = useMutation({
    mutationFn: closeContract,
    onSuccess: invalidateMarketplace,
    onError: () => setFormError('Bidding could not be closed. Refresh and confirm the contract is still open.'),
  })
  const bidMutation = useMutation({
    mutationFn: createBid,
    onSuccess: async () => {
      setSelectedContractId(null)
      setBidForm({ proposed_rate: '', message: '', availability_confirmed: true })
      setFeedback('Your bid was submitted.')
      await invalidateMarketplace()
    },
    onError: () => setFormError('Bid could not be submitted. It may be closed or you may already have bid on this contract.'),
  })
  const reviewMutation = useMutation({
    mutationFn: ({ bidId, decision }: { bidId: number; decision: 'ACCEPTED' | 'REJECTED' }) => reviewBid(bidId, decision, ''),
    onSuccess: invalidateMarketplace,
  })
  const assignmentMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'check-in' | 'check-out' }) =>
      action === 'check-in' ? checkInAssignment(id) : checkOutAssignment(id),
    onSuccess: invalidateMarketplace,
  })
  const assignmentReviewMutation = useMutation({
    mutationFn: ({ id, rating, feedback }: { id: number; rating: number; feedback: string }) =>
      updateAssignmentReview(id, {
        ...(isHospitalAdmin ? { rating_by_hospital: rating } : { rating_by_professional: rating }),
        feedback,
      }),
    onSuccess: async () => {
      setReviewAssignmentId(null)
      setAssignmentReview({ rating: '5', feedback: '' })
      await queryClient.invalidateQueries({ queryKey: ['assignments'] })
    },
    onError: () => setFormError('Assignment feedback could not be saved.'),
  })
  const createHospitalMutation = useMutation({
    mutationFn: createHospital,
    onSuccess: async (hospital) => {
      queryClient.setQueryData<Hospital[]>(['hospitals'], (current = []) => [
        ...current.filter((item) => item.id !== hospital.id),
        hospital,
      ])
      setSelectedHospitalId(hospital.id)
      setFeedback('Hospital created.')
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['hospitals'] })
    },
    onError: () => setFormError('Hospital could not be created. Complete all required facility details and confirm your permissions.'),
  })
  const updateHospitalMutation = useMutation({
    mutationFn: (hospital: Partial<HospitalDetails>) => updateHospital(selectedHospitalId!, hospital),
    onSuccess: async (hospital) => {
      await queryClient.setQueryData(['hospital-detail', hospital.id], hospital)
      setFeedback('Hospital details saved.')
      await queryClient.invalidateQueries({ queryKey: ['hospitals'] })
    },
    onError: () => setFormError('Hospital details could not be saved. Check the submitted values and your access.'),
  })
  const departmentMutation = useMutation({
    mutationFn: () => createDepartment({
      hospital: selectedHospitalId!,
      name: departmentForm.name.trim(),
      description: departmentForm.description.trim(),
    }),
    onSuccess: async () => {
      setDepartmentForm({ name: '', description: '' })
      setFeedback('Department created.')
      await queryClient.invalidateQueries({ queryKey: ['hospital-departments', selectedHospitalId] })
      await queryClient.invalidateQueries({ queryKey: ['hospital-detail', selectedHospitalId] })
    },
    onError: () => setFormError('Department could not be created. Check your hospital administrator access.'),
  })
  const memberMutation = useMutation({
    mutationFn: () => addHospitalStaff({
      user_id: Number(selectedUserId),
      hospital: selectedHospitalId!,
      department: selectedDepartmentId ? Number(selectedDepartmentId) : null,
      role_at_hospital: memberRole,
      is_primary: false,
    }),
    onSuccess: async () => {
      setFeedback('Team member added.')
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['hospital-staff', selectedHospitalId] })
    },
    onError: () => setFormError('Team member could not be added. Confirm the user is not already assigned to this hospital.'),
  })

  const contracts = contractsQuery.data ?? []
  const bids = bidsQuery.data ?? []
  const assignments = assignmentsQuery.data ?? []
  const myBids = useMemo(() => new Set(bids.filter((bid) => bid.bidder.id === user?.id).map((bid) => bid.contract)), [bids, user?.id])
  const visibleContracts = contracts.filter((contract) => {
    const text = `${contract.title} ${contract.hospital_name} ${contract.hospital_city} ${contract.specialization_required}`.toLowerCase()
    const startDate = new Date(contract.start_datetime).toISOString().slice(0, 10)
    return text.includes(contractSearch.toLowerCase())
      && (roleFilter === 'all' || contract.required_role === roleFilter)
      && (urgencyFilter === 'all' || contract.urgency === urgencyFilter)
      && contract.specialization_required.toLowerCase().includes(specializationFilter.toLowerCase())
      && contract.hospital_city.toLowerCase().includes(locationFilter.toLowerCase())
      && (!startDateFilter || startDate === startDateFilter)
  })

  async function signOut() {
    await queryClient.cancelQueries()
    queryClient.clear()
    clearSession()
  }

  function submitContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedHospitalId) {
      setFormError('Create or select a hospital before adding a contract.')
      return
    }
    if (!contractForm.start_datetime || !contractForm.end_datetime || new Date(contractForm.end_datetime) <= new Date(contractForm.start_datetime)) {
      setFormError('The contract end date must be after its start date.')
      return
    }
    setFormError(null)
    setFeedback(null)
    const payload: WorkContractCreate = {
      hospital_id: selectedHospitalId,
      department_id: selectedDepartmentId ? Number(selectedDepartmentId) : null,
      title: contractForm.title.trim(),
      description: contractForm.description.trim(),
      contract_type: contractForm.contract_type,
      required_role: contractForm.required_role,
      specialization_required: contractForm.specialization_required.trim(),
      min_years_experience: Number(contractForm.min_years_experience),
      start_datetime: new Date(contractForm.start_datetime).toISOString(),
      end_datetime: new Date(contractForm.end_datetime).toISOString(),
      location_details: contractForm.location_details.trim(),
      budget_min: contractForm.budget_min ? Number(contractForm.budget_min) : null,
      budget_max: contractForm.budget_max ? Number(contractForm.budget_max) : null,
      currency: contractForm.currency.toUpperCase(),
      payment_type: contractForm.payment_type,
      urgency: contractForm.urgency,
      max_bids: contractForm.max_bids ? Number(contractForm.max_bids) : null,
      requirements: contractForm.requirements.split(',').map((item) => item.trim()).filter(Boolean),
      benefits: contractForm.benefits.trim(),
      is_public: true,
    }
    contractMutation.mutate(payload)
  }

  function submitBid(event: FormEvent<HTMLFormElement>, contractId: number) {
    event.preventDefault()
    const proposedRate = Number(bidForm.proposed_rate)
    if (!Number.isFinite(proposedRate) || proposedRate < 0) {
      setFormError('Enter a valid proposed rate.')
      return
    }
    setFormError(null)
    bidMutation.mutate({
      contract: contractId,
      proposed_rate: proposedRate,
      currency: 'KES',
      message: bidForm.message.trim(),
      availability_confirmed: bidForm.availability_confirmed,
    })
  }

  function submitHospital(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFeedback(null)
    if (selectedHospitalId) {
      updateHospitalMutation.mutate(hospitalForm)
    } else {
      createHospitalMutation.mutate(hospitalForm)
    }
  }

  const tabs: Array<{ id: StaffingTab; label: string; icon: typeof BriefcaseMedical }> = [
    { id: 'contracts', label: 'Contracts', icon: BriefcaseMedical },
    { id: 'bids', label: 'Bids', icon: CheckCircle2 },
    { id: 'assignments', label: 'Assignments', icon: CalendarClock },
    ...(isHospitalAdmin ? [{ id: 'facilities' as const, label: 'Hospitals & team', icon: Building2 }] : []),
  ]

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      <aside className="flex shrink-0 flex-col bg-navy text-white lg:sticky lg:top-0 lg:h-screen lg:w-[236px]">
        <div className="flex items-center gap-3 px-5 py-5 lg:px-6 lg:py-7">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d8eee4] text-forest"><Activity size={21} aria-hidden="true" /></span>
          <div><p className="text-[15px] font-semibold">MediConnect</p><p className="mt-0.5 text-[11px] text-white/55">CARE OPERATIONS</p></div>
        </div>
        <WorkspaceNavigation current="/staffing" />
        <div className="hidden flex-1 lg:block" />
        <div className="hidden border-t border-white/10 p-5 lg:block">
          <div className="flex items-center gap-2 text-xs text-white/70"><ShieldCheck size={15} aria-hidden="true" /> Secure workspace</div>
          <p className="mt-2 text-[11px] leading-5 text-white/45">Staffing actions are checked by the MediConnect API.</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-5 py-3 shadow-sm backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-2 text-xs text-muted"><span className="hidden sm:inline">Operations</span><span className="hidden text-[#bdc7c1] sm:inline">/</span><span className="font-semibold text-ink">Staffing marketplace</span></div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${isLive ? 'bg-[#e5f2eb] text-[#28664e]' : 'bg-[#fbf1df] text-[#8b641d]'}`}>{isLive ? user?.full_name || user?.email : 'Not connected'}</span>
            {isLive ? <button onClick={signOut} type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-black/10 px-3 text-xs text-muted hover:bg-canvas"><LogOut size={15} aria-hidden="true" />Sign out</button> : <Link to="/connect" className="rounded-md bg-forest px-3 py-2 text-xs font-semibold text-white">Sign in</Link>}
          </div>
        </header>
        <div className="mx-auto max-w-[1180px] px-5 pb-10 pt-7 sm:px-8 sm:pt-9">
          <div>
            <p className="text-xs font-semibold uppercase text-forest">Workforce operations</p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight sm:text-[30px]">Staffing marketplace</h1>
            <p className="mt-2 text-sm text-muted">Browse shifts, manage bids and assignments, or coordinate your hospital team.</p>
          </div>

          {!isLive ? (
            <Card className="mt-5 p-7 text-center">
              <BriefcaseMedical className="mx-auto text-forest" size={30} aria-hidden="true" />
              <h2 className="mt-3 font-semibold">Sign in to access staffing</h2>
              <p className="mt-2 text-sm text-muted">Marketplace actions require an authenticated MediConnect account.</p>
              <Link to="/connect" className="mt-5 inline-flex h-10 items-center rounded-md bg-forest px-4 text-xs font-semibold text-white">Connect account</Link>
            </Card>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap gap-2 border-b border-black/[0.07] pb-3">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => { setTab(id); setFormError(null); setFeedback(null) }} aria-pressed={tab === id} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${tab === id ? 'bg-forest text-white' : 'bg-white text-muted hover:bg-[#edf3ef] hover:text-ink'}`}>
                    <Icon size={16} aria-hidden="true" />{label}
                  </button>
                ))}
              </div>

              {formError && <p role="alert" className="mt-4 rounded-md bg-[#fff1ed] px-3 py-2.5 text-sm text-[#9d4937]">{formError}</p>}
              {feedback && <p role="status" className="mt-4 rounded-md bg-[#eaf3ee] px-3 py-2.5 text-sm text-[#28664e]">{feedback}</p>}

              {tab === 'contracts' && (
                <section className="mt-5 space-y-4">
                  {isHospitalAdmin && (
                    <Card className="p-5 sm:p-6">
                      <CardHeader><div><CardTitle>Post a staffing need</CardTitle><p className="mt-1 text-xs text-muted">New contracts start as drafts. Publish them when ready for bids.</p></div><Plus size={18} className="text-forest" aria-hidden="true" /></CardHeader>
                      <form onSubmit={submitContract} className="mt-5 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="text-sm font-medium">Hospital
                            <select required value={selectedHospitalId ?? ''} onChange={(event) => setSelectedHospitalId(Number(event.target.value) || null)} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3">
                              <option value="">Select hospital</option>{(hospitalsQuery.data ?? []).map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
                            </select>
                          </label>
                          <label className="text-sm font-medium">Department
                            <select value={selectedDepartmentId} onChange={(event) => setSelectedDepartmentId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3">
                              <option value="">No department</option>{(departmentsQuery.data ?? []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                            </select>
                          </label>
                          <div className="sm:col-span-2"><TextInput required label="Contract title" value={contractForm.title} onChange={(value) => setContractForm({ ...contractForm, title: value })} /></div>
                          <label className="text-sm font-medium sm:col-span-2">Description
                            <textarea required rows={3} value={contractForm.description} onChange={(event) => setContractForm({ ...contractForm, description: event.target.value })} className="mt-2 w-full rounded-md border border-[#d5ded8] px-3 py-2" />
                          </label>
                          <label className="text-sm font-medium">Contract type
                            <select value={contractForm.contract_type} onChange={(event) => setContractForm({ ...contractForm, contract_type: event.target.value })} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3">
                              <option value="SHIFT">Single shift</option><option value="SHORT_TERM">Short-term</option><option value="LONG_TERM">Long-term / locum</option><option value="ON_CALL">On-call</option><option value="FULL_TIME">Full-time</option>
                            </select>
                          </label>
                          <label className="text-sm font-medium">Required role
                            <select value={contractForm.required_role} onChange={(event) => setContractForm({ ...contractForm, required_role: event.target.value })} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3">
                              <option value="ANY">Any qualified professional</option><option value="DOCTOR">Doctor</option><option value="NURSE">Nurse</option><option value="SPECIALIST">Specialist</option>
                            </select>
                          </label>
                          <TextInput label="Specialization" value={contractForm.specialization_required} onChange={(value) => setContractForm({ ...contractForm, specialization_required: value })} />
                          <TextInput label="Minimum years experience" type="number" min={0} step={1} value={contractForm.min_years_experience} onChange={(value) => setContractForm({ ...contractForm, min_years_experience: value })} />
                          <TextInput required label="Starts" type="datetime-local" value={contractForm.start_datetime} onChange={(value) => setContractForm({ ...contractForm, start_datetime: value })} />
                          <TextInput required label="Ends" type="datetime-local" value={contractForm.end_datetime} onChange={(value) => setContractForm({ ...contractForm, end_datetime: value })} />
                          <TextInput label="Ward / location" value={contractForm.location_details} onChange={(value) => setContractForm({ ...contractForm, location_details: value })} />
                          <label className="text-sm font-medium">Urgency
                            <select value={contractForm.urgency} onChange={(event) => setContractForm({ ...contractForm, urgency: event.target.value })} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3">
                              <option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="CRITICAL">Critical / emergency</option>
                            </select>
                          </label>
                          <TextInput label="Minimum budget" type="number" min={0} step={0.01} value={contractForm.budget_min} onChange={(value) => setContractForm({ ...contractForm, budget_min: value })} />
                          <TextInput label="Maximum budget" type="number" min={0} step={0.01} value={contractForm.budget_max} onChange={(value) => setContractForm({ ...contractForm, budget_max: value })} />
                          <TextInput label="Currency code" value={contractForm.currency} onChange={(value) => setContractForm({ ...contractForm, currency: value })} />
                          <label className="text-sm font-medium">Payment basis
                            <select value={contractForm.payment_type} onChange={(event) => setContractForm({ ...contractForm, payment_type: event.target.value })} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3">
                              <option value="SHIFT">Per shift</option><option value="HOURLY">Hourly</option><option value="DAILY">Daily</option><option value="FIXED">Fixed amount</option>
                            </select>
                          </label>
                          <TextInput label="Maximum bids (optional)" type="number" min={1} step={1} value={contractForm.max_bids} onChange={(value) => setContractForm({ ...contractForm, max_bids: value })} />
                          <TextInput label="Requirements (comma-separated)" value={contractForm.requirements} onChange={(value) => setContractForm({ ...contractForm, requirements: value })} />
                          <div className="sm:col-span-2"><TextInput label="Benefits" value={contractForm.benefits} onChange={(value) => setContractForm({ ...contractForm, benefits: value })} /></div>
                        </div>
                        <button type="submit" disabled={contractMutation.isPending || !hospitalsQuery.data?.length} className="inline-flex h-10 items-center gap-2 rounded-md bg-forest px-4 text-xs font-semibold text-white disabled:opacity-60"><Plus size={15} aria-hidden="true" />{contractMutation.isPending ? 'Creating…' : 'Save draft'}</button>
                      </form>
                      {hospitalsQuery.isError && errorLabel(true, 'Hospital list could not be loaded.')}
                      {departmentsQuery.isError && errorLabel(true, 'Departments could not be loaded.')}
                    </Card>
                  )}

                  <Card className="p-5 sm:p-6">
                    <CardHeader className="flex-col sm:flex-row sm:items-center"><div><CardTitle>{isHospitalAdmin ? 'Your hospital contracts' : 'Open opportunities'}</CardTitle><p className="mt-1 text-xs text-muted">{isProfessional ? 'Browse public openings and place one bid per contract.' : 'Publish drafts to make them visible to qualified professionals.'}</p></div><input aria-label="Search contracts" placeholder="Search title or facility…" value={contractSearch} onChange={(event) => setContractSearch(event.target.value)} className="h-9 w-full rounded-md border border-[#d5ded8] px-3 text-sm sm:w-64" /></CardHeader>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <label className="text-xs font-semibold">Role
                        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#d5ded8] bg-white px-2 text-sm"><option value="all">Any role</option><option value="DOCTOR">Doctor</option><option value="NURSE">Nurse</option><option value="SPECIALIST">Specialist</option><option value="ANY">Any qualified</option></select>
                      </label>
                      <label className="text-xs font-semibold">Urgency
                        <select value={urgencyFilter} onChange={(event) => setUrgencyFilter(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#d5ded8] bg-white px-2 text-sm"><option value="all">Any urgency</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="NORMAL">Normal</option><option value="LOW">Low</option></select>
                      </label>
                      <label className="text-xs font-semibold">Specialization
                        <input value={specializationFilter} onChange={(event) => setSpecializationFilter(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#d5ded8] px-2 text-sm" />
                      </label>
                      <label className="text-xs font-semibold">Hospital city
                        <input value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#d5ded8] px-2 text-sm" />
                      </label>
                      <label className="text-xs font-semibold">Start date
                        <input type="date" value={startDateFilter} onChange={(event) => setStartDateFilter(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#d5ded8] px-2 text-sm" />
                      </label>
                    </div>
                    {contractsQuery.isLoading && <p className="mt-5 text-sm text-muted" role="status">Loading contracts…</p>}
                    {contractsQuery.isError && errorLabel(true, 'Contracts could not be loaded. Check your account permissions and retry.')}
                    {!contractsQuery.isLoading && visibleContracts.length === 0 && <p className="mt-5 rounded-md bg-canvas p-5 text-center text-sm text-muted">No contracts match this view.</p>}
                    <div className="mt-4 space-y-3">
                      {visibleContracts.map((contract) => {
                        const bid = bids.find((item) => item.contract === contract.id && item.bidder.id === user?.id)
                        const expanded = selectedContractId === contract.id
                        return (
                          <article key={contract.id} className="rounded-lg border border-black/[0.07] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-[220px] flex-1">
                                <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{contract.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${contract.urgency === 'CRITICAL' || contract.urgency === 'HIGH' ? 'bg-[#fae9e4] text-[#a9503d]' : 'bg-[#eaf3ee] text-[#28664e]'}`}>{contract.urgency}</span><span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-semibold text-muted">{contract.status}</span></div>
                                <p className="mt-1 text-sm text-muted">{contract.hospital_name} · {contract.hospital_city} · {contract.required_role}{contract.specialization_required ? ` · ${contract.specialization_required}` : ''}</p>
                                <p className="mt-2 text-xs text-muted">{dateLabel(contract.start_datetime)} – {dateLabel(contract.end_datetime)} · {contract.duration_hours ?? '—'} hours</p>
                                <p className="mt-1 text-xs text-muted">Budget: {contract.budget_min ?? '—'}–{contract.budget_max ?? '—'} {contract.currency} · {contract.bids_count} bid(s)</p>
                                {bid && <p className="mt-2 text-xs font-medium text-forest">Your bid: {bid.status}</p>}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button type="button" onClick={() => setSelectedContractId(expanded ? null : contract.id)} className="h-9 rounded-md border border-[#d5ded8] px-3 text-xs font-semibold">{expanded ? 'Hide details' : 'Details'}</button>
                                {isHospitalAdmin && contract.status === 'DRAFT' && <button type="button" onClick={() => publishMutation.mutate(contract.id)} className="h-9 rounded-md bg-forest px-3 text-xs font-semibold text-white">Publish</button>}
                                {isHospitalAdmin && contract.status === 'OPEN' && <button type="button" onClick={() => closeMutation.mutate(contract.id)} className="h-9 rounded-md border border-[#d5ded8] px-3 text-xs font-semibold">Close bidding</button>}
                                {isProfessional && contract.status === 'OPEN' && !myBids.has(contract.id) && <button type="button" onClick={() => { setSelectedContractId(contract.id); setFormError(null) }} className="h-9 rounded-md bg-forest px-3 text-xs font-semibold text-white">Place bid</button>}
                              </div>
                            </div>
                            {expanded && (
                              <div className="mt-4 border-t border-black/[0.06] pt-4">
                                {detailQuery.isLoading && <p role="status" className="text-sm text-muted">Loading contract details…</p>}
                                {detailQuery.isError && <p role="alert" className="text-sm text-[#9d4937]">Contract details could not be loaded.</p>}
                                {detailQuery.data?.id === contract.id && <p className="whitespace-pre-wrap text-sm leading-6 text-muted">{detailQuery.data.description}</p>}
                                {isProfessional && contract.status === 'OPEN' && !myBids.has(contract.id) && (
                                  <form onSubmit={(event) => submitBid(event, contract.id)} className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
                                    <label className="text-xs font-semibold">Proposed rate (KES)
                                      <input required min={0} step={0.01} type="number" value={bidForm.proposed_rate} onChange={(event) => setBidForm({ ...bidForm, proposed_rate: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-[#d5ded8] px-2 text-sm" />
                                    </label>
                                    <label className="text-xs font-semibold">Cover message
                                      <input value={bidForm.message} onChange={(event) => setBidForm({ ...bidForm, message: event.target.value })} className="mt-1 h-9 w-full rounded-md border border-[#d5ded8] px-2 text-sm" />
                                    </label>
                                    <button type="submit" disabled={bidMutation.isPending} className="mt-auto h-9 rounded-md bg-forest px-3 text-xs font-semibold text-white disabled:opacity-60">{bidMutation.isPending ? 'Sending…' : 'Submit bid'}</button>
                                    <label className="flex items-center gap-2 text-xs text-muted sm:col-span-3"><input type="checkbox" checked={bidForm.availability_confirmed} onChange={(event) => setBidForm({ ...bidForm, availability_confirmed: event.target.checked })} />I confirm my availability for these dates</label>
                                  </form>
                                )}
                              </div>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  </Card>
                </section>
              )}

              {tab === 'bids' && (
                <Card className="mt-5 p-5 sm:p-6">
                  <CardHeader><div><CardTitle>{isHospitalAdmin ? 'Bids for your facilities' : 'Your bids'}</CardTitle><p className="mt-1 text-xs text-muted">{isHospitalAdmin ? 'Review pending bids from professionals.' : 'Track decisions from hospital teams.'}</p></div></CardHeader>
                  {bidsQuery.isLoading && <p className="mt-5 text-sm text-muted" role="status">Loading bids…</p>}
                  {bidsQuery.isError && errorLabel(true, 'Bids could not be loaded.')}
                  {!bidsQuery.isLoading && bids.length === 0 && <p className="mt-5 rounded-md bg-canvas p-5 text-center text-sm text-muted">No bids to show.</p>}
                  <div className="mt-4 divide-y divide-black/[0.06]">
                    {bids.map((bid) => (
                      <div key={bid.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                        <div><p className="font-semibold">{bid.contract_title}</p><p className="mt-1 text-sm text-muted">{bid.hospital_name} · {isHospitalAdmin ? `${bid.bidder.full_name || bid.bidder.email} · ${bid.bidder.role}` : `${bid.proposed_rate} ${bid.currency}`}</p><p className="mt-1 text-xs text-muted">{bid.message || 'No cover message'} · {dateLabel(bid.created_at)}</p></div>
                        <div className="flex items-center gap-2"><span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold">{bid.status}</span>
                          {isHospitalAdmin && bid.status === 'PENDING' && <><button type="button" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ bidId: bid.id, decision: 'ACCEPTED' })} className="h-9 rounded-md bg-forest px-3 text-xs font-semibold text-white">Accept</button><button type="button" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ bidId: bid.id, decision: 'REJECTED' })} className="h-9 rounded-md border border-[#d5ded8] px-3 text-xs font-semibold">Reject</button></>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {reviewMutation.isError && errorLabel(true, 'Bid decision could not be saved. It may already have been reviewed.')}
                </Card>
              )}

              {tab === 'assignments' && (
                <Card className="mt-5 p-5 sm:p-6">
                  <CardHeader><div><CardTitle>Assignments</CardTitle><p className="mt-1 text-xs text-muted">Accepted bids become scheduled assignments. Check in and out through this view.</p></div></CardHeader>
                  {assignmentsQuery.isLoading && <p className="mt-5 text-sm text-muted" role="status">Loading assignments…</p>}
                  {assignmentsQuery.isError && errorLabel(true, 'Assignments could not be loaded.')}
                  {!assignmentsQuery.isLoading && assignments.length === 0 && <p className="mt-5 rounded-md bg-canvas p-5 text-center text-sm text-muted">No assignments yet.</p>}
                  <div className="mt-4 space-y-3">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="space-y-2">
                      <article className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-black/[0.07] p-4">
                        <div><p className="font-semibold">{assignment.contract.title}</p><p className="mt-1 text-sm text-muted">{assignment.contract.hospital_name} · {assignment.professional.full_name || assignment.professional.email}</p><p className="mt-1 text-xs text-muted">{dateLabel(assignment.start_datetime)} – {dateLabel(assignment.end_datetime)} · {assignment.agreed_rate} {assignment.currency}</p></div>
                        <div className="flex items-center gap-2"><span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold">{assignment.status.replace('_', ' ')}</span>
                          {assignment.status === 'SCHEDULED' && <button type="button" disabled={assignmentMutation.isPending} onClick={() => assignmentMutation.mutate({ id: assignment.id, action: 'check-in' })} className="h-9 rounded-md bg-forest px-3 text-xs font-semibold text-white">Check in</button>}
                          {assignment.status === 'IN_PROGRESS' && <button type="button" disabled={assignmentMutation.isPending} onClick={() => assignmentMutation.mutate({ id: assignment.id, action: 'check-out' })} className="h-9 rounded-md bg-forest px-3 text-xs font-semibold text-white">Check out</button>}
                          {assignment.status === 'COMPLETED' && <button type="button" onClick={() => { setReviewAssignmentId(reviewAssignmentId === assignment.id ? null : assignment.id); setAssignmentReview({ rating: '5', feedback: assignment.feedback }) }} className="h-9 rounded-md border border-[#d5ded8] px-3 text-xs font-semibold">Rate &amp; review</button>}
                        </div>
                      </article>
                      {reviewAssignmentId === assignment.id && assignment.status === 'COMPLETED' && (
                        <form onSubmit={(event) => { event.preventDefault(); assignmentReviewMutation.mutate({ id: assignment.id, rating: Number(assignmentReview.rating), feedback: assignmentReview.feedback.trim() }) }} className="grid gap-3 rounded-lg bg-canvas p-4 sm:grid-cols-[150px_1fr_auto]">
                          <label className="text-sm font-medium">Rating
                            <select required value={assignmentReview.rating} onChange={(event) => setAssignmentReview({ ...assignmentReview, rating: event.target.value })} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Satisfactory</option><option value="2">2 — Needs improvement</option><option value="1">1 — Poor</option></select>
                          </label>
                          <label className="text-sm font-medium">Feedback
                            <input value={assignmentReview.feedback} onChange={(event) => setAssignmentReview({ ...assignmentReview, feedback: event.target.value })} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3" />
                          </label>
                          <button type="submit" disabled={assignmentReviewMutation.isPending} className="mt-auto h-10 rounded-md bg-forest px-4 text-xs font-semibold text-white">{assignmentReviewMutation.isPending ? 'Saving…' : 'Save review'}</button>
                        </form>
                      )}
                      </div>
                    ))}
                  </div>
                  {assignmentMutation.isError && errorLabel(true, 'Assignment could not be updated. Check its current status and try again.')}
                </Card>
              )}

              {tab === 'facilities' && isHospitalAdmin && (
                <section className="mt-5 grid gap-4 xl:grid-cols-2">
                  <Card className="p-5 sm:p-6">
                    <CardHeader><div><CardTitle>{selectedHospitalId ? 'Facility details' : 'Register a hospital'}</CardTitle><p className="mt-1 text-xs text-muted">Hospital administrators can maintain facility records.</p></div></CardHeader>
                    {!!hospitalsQuery.data?.length && <label className="mt-4 block text-sm font-medium">Selected facility
                      <select value={selectedHospitalId ?? ''} onChange={(event) => { setSelectedHospitalId(Number(event.target.value) || null); if (!event.target.value) setHospitalForm(emptyHospitalForm) }} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3">
                        <option value="">Register a new hospital</option>{hospitalsQuery.data.map((hospital) => <option key={hospital.id} value={hospital.id}>{hospital.name} · {hospital.city}</option>)}
                      </select>
                    </label>}
                    {hospitalsQuery.isError && errorLabel(true, 'Hospital list could not be loaded.')}
                    <form onSubmit={submitHospital} className="mt-4 grid gap-3 sm:grid-cols-2">
                      <TextInput required label="Hospital name" value={hospitalForm.name} onChange={(value) => setHospitalForm({ ...hospitalForm, name: value })} />
                      <TextInput required label="Registration number" value={hospitalForm.registration_number} onChange={(value) => setHospitalForm({ ...hospitalForm, registration_number: value })} />
                      <div className="sm:col-span-2"><TextInput required label="Address" value={hospitalForm.address} onChange={(value) => setHospitalForm({ ...hospitalForm, address: value })} /></div>
                      <TextInput required label="City" value={hospitalForm.city} onChange={(value) => setHospitalForm({ ...hospitalForm, city: value })} />
                      <TextInput label="State / region" value={hospitalForm.state} onChange={(value) => setHospitalForm({ ...hospitalForm, state: value })} />
                      <TextInput required label="Country" value={hospitalForm.country} onChange={(value) => setHospitalForm({ ...hospitalForm, country: value })} />
                      <TextInput label="Postal code" value={hospitalForm.postal_code} onChange={(value) => setHospitalForm({ ...hospitalForm, postal_code: value })} />
                      <TextInput required label="Phone" value={hospitalForm.phone} onChange={(value) => setHospitalForm({ ...hospitalForm, phone: value })} />
                      <TextInput required label="Email" type="email" value={hospitalForm.email} onChange={(value) => setHospitalForm({ ...hospitalForm, email: value })} />
                      <TextInput label="Website" value={hospitalForm.website} onChange={(value) => setHospitalForm({ ...hospitalForm, website: value })} />
                      <label className="text-sm font-medium sm:col-span-2">Description
                        <textarea rows={2} value={hospitalForm.description} onChange={(event) => setHospitalForm({ ...hospitalForm, description: event.target.value })} className="mt-2 w-full rounded-md border border-[#d5ded8] px-3 py-2" />
                      </label>
                      <button type="submit" disabled={createHospitalMutation.isPending || updateHospitalMutation.isPending} className="h-10 rounded-md bg-forest px-4 text-xs font-semibold text-white sm:col-span-2">{selectedHospitalId ? 'Save facility details' : 'Create hospital'}</button>
                    </form>
                    {hospitalDetailsQuery.isError && errorLabel(true, 'Hospital details could not be loaded.')}
                  </Card>

                  <div className="space-y-4">
                    <Card className="p-5 sm:p-6">
                      <CardHeader><div><CardTitle>Departments</CardTitle><p className="mt-1 text-xs text-muted">{hospitalDetailsQuery.data?.departments_count ?? 0} active department(s)</p></div></CardHeader>
                      <div className="mt-3 space-y-2">{(departmentsQuery.data ?? []).map((department) => <div key={department.id} className="rounded-md bg-canvas px-3 py-2 text-sm"><span className="font-medium">{department.name}</span>{department.description && <span className="ml-2 text-xs text-muted">{department.description}</span>}</div>)}</div>
                      {departmentsQuery.isError && errorLabel(true, 'Departments could not be loaded.')}
                      <form onSubmit={(event) => { event.preventDefault(); setFormError(null); departmentMutation.mutate() }} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                        <TextInput required label="New department" value={departmentForm.name} onChange={(value) => setDepartmentForm({ ...departmentForm, name: value })} />
                        <TextInput label="Description" value={departmentForm.description} onChange={(value) => setDepartmentForm({ ...departmentForm, description: value })} />
                        <button disabled={!selectedHospitalId || departmentMutation.isPending} type="submit" className="mt-auto h-10 rounded-md border border-[#d5ded8] px-3 text-xs font-semibold disabled:opacity-50">Add</button>
                      </form>
                    </Card>

                    <Card className="p-5 sm:p-6">
                      <CardHeader><div><CardTitle>Hospital team</CardTitle><p className="mt-1 text-xs text-muted">Find an account and add it to this facility.</p></div><Users size={18} className="text-forest" aria-hidden="true" /></CardHeader>
                      <div className="mt-3 space-y-2">{(staffQuery.data ?? []).map((member) => <div key={member.id} className="flex flex-wrap justify-between gap-2 rounded-md bg-canvas px-3 py-2 text-sm"><span className="font-medium">{member.user.full_name || member.user.email}</span><span className="text-xs text-muted">{member.role_at_hospital}{member.department ? ` · ${departmentsQuery.data?.find((item) => item.id === member.department)?.name ?? ''}` : ''}</span></div>)}</div>
                      {staffQuery.isError && errorLabel(true, 'Hospital team could not be loaded.')}
                      <div className="mt-4 space-y-3">
                        <TextInput label="Search users by name, email or specialty" value={memberSearch} onChange={(value) => { setMemberSearch(value); setSelectedUserId('') }} />
                        {memberSearch.trim().length >= 2 && <select aria-label="Select staff account" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3 text-sm">
                          <option value="">Select account</option>{(usersQuery.data ?? []).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.full_name || candidate.email} · {candidate.role}</option>)}
                        </select>}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-sm font-medium">Department
                            <select value={selectedDepartmentId} onChange={(event) => setSelectedDepartmentId(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3"><option value="">No department</option>{(departmentsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                          </label>
                          <label className="text-sm font-medium">Facility role
                            <select value={memberRole} onChange={(event) => setMemberRole(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-[#d5ded8] bg-white px-3"><option value="ADMIN">Hospital admin</option><option value="MANAGER">Manager</option><option value="COORDINATOR">Coordinator</option><option value="STAFF">Staff</option></select>
                          </label>
                        </div>
                        <button type="button" disabled={!selectedHospitalId || !selectedUserId || memberMutation.isPending} onClick={() => { setFormError(null); memberMutation.mutate() }} className="h-10 rounded-md bg-forest px-4 text-xs font-semibold text-white disabled:opacity-50">{memberMutation.isPending ? 'Adding…' : 'Add to hospital team'}</button>
                        {usersQuery.isError && errorLabel(true, 'User search failed.')}
                      </div>
                    </Card>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
