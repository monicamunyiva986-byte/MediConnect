import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Bell, CheckCheck, LogOut, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { Card, CardHeader, CardTitle } from './ui/card'
import { WorkspaceNavigation } from './WorkspaceNavigation'

function formatCreatedAt(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()
}

export function NotificationsDashboard() {
  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.accessToken)
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const isLive = Boolean(token)
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    enabled: isLive,
  })
  const unreadQuery = useQuery({
    queryKey: ['notification-unread-count'],
    queryFn: getUnreadNotificationCount,
    enabled: isLive,
    refetchInterval: 60_000,
  })
  const refreshNotifications = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['notification-unread-count'] }),
    ])
  }
  const markReadMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: refreshNotifications })
  const markAllMutation = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refreshNotifications })
  const notifications = notificationsQuery.data ?? []
  const visibleNotifications = useMemo(
    () => filter === 'unread' ? notifications.filter((notification) => !notification.is_read) : notifications,
    [filter, notifications],
  )

  async function signOut() {
    await queryClient.cancelQueries()
    queryClient.clear()
    clearSession()
  }

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      <aside className="flex shrink-0 flex-col bg-navy text-white lg:sticky lg:top-0 lg:h-screen lg:w-[236px]">
        <div className="flex items-center gap-3 px-5 py-5 lg:px-6 lg:py-7">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d8eee4] text-forest"><Activity size={21} aria-hidden="true" /></span>
          <div><p className="text-[15px] font-semibold">MediConnect</p><p className="mt-0.5 text-[11px] text-white/55">CARE OPERATIONS</p></div>
        </div>
        <WorkspaceNavigation current="/notifications" />
        <div className="hidden flex-1 lg:block" />
        <div className="hidden border-t border-white/10 p-5 lg:block">
          <div className="flex items-center gap-2 text-xs text-white/70"><ShieldCheck size={15} aria-hidden="true" /> Private inbox</div>
          <p className="mt-2 text-[11px] leading-5 text-white/45">Only notifications addressed to your account are shown.</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[68px] flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-5 py-3 shadow-sm backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-2 text-xs text-muted"><span className="hidden sm:inline">Operations</span><span className="hidden text-[#bdc7c1] sm:inline">/</span><span className="font-semibold text-ink">Notifications</span></div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#e5f2eb] px-2.5 py-1.5 text-[11px] font-semibold text-[#28664e]">{isLive ? user?.full_name || user?.email : 'Not connected'}</span>
            {isLive ? <button onClick={signOut} type="button" className="inline-flex h-9 items-center gap-2 rounded-md border border-black/10 px-3 text-xs text-muted hover:bg-canvas"><LogOut size={15} aria-hidden="true" />Sign out</button> : <Link to="/connect" className="rounded-md bg-forest px-3 py-2 text-xs font-semibold text-white">Sign in</Link>}
          </div>
        </header>
        <div className="mx-auto max-w-[1000px] px-5 pb-10 pt-7 sm:px-8 sm:pt-9">
          <p className="text-xs font-semibold uppercase text-forest">Account activity</p>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight sm:text-[30px]">Notifications</h1>
          <p className="mt-2 text-sm text-muted">Staffing updates, assignment reminders, and resource alerts.</p>

          {!isLive ? (
            <Card className="mt-5 p-7 text-center">
              <Bell className="mx-auto text-forest" size={30} aria-hidden="true" />
              <h2 className="mt-3 font-semibold">Connect to view notifications</h2>
              <p className="mt-2 text-sm text-muted">Your inbox requires a MediConnect account.</p>
              <Link to="/connect" className="mt-5 inline-flex h-10 items-center rounded-md bg-forest px-4 text-xs font-semibold text-white">Connect account</Link>
            </Card>
          ) : (
            <Card className="mt-5 p-5 sm:p-6">
              <CardHeader className="flex-col sm:flex-row sm:items-center">
                <div><CardTitle>Inbox</CardTitle><p className="mt-1 text-xs text-muted">{unreadQuery.data ?? 0} unread</p></div>
                <div className="flex items-center gap-2">
                  <select aria-label="Notification filter" value={filter} onChange={(event) => setFilter(event.target.value as 'all' | 'unread')} className="h-9 rounded-md border border-[#d5ded8] bg-white px-3 text-xs">
                    <option value="all">All notifications</option><option value="unread">Unread only</option>
                  </select>
                  <button type="button" disabled={!unreadQuery.data || markAllMutation.isPending} onClick={() => markAllMutation.mutate()} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d5ded8] px-3 text-xs font-semibold disabled:opacity-50"><CheckCheck size={15} aria-hidden="true" />Mark all read</button>
                </div>
              </CardHeader>
              {notificationsQuery.isLoading && <p role="status" className="mt-5 text-sm text-muted">Loading notifications…</p>}
              {(notificationsQuery.isError || unreadQuery.isError) && <p role="alert" className="mt-4 rounded-md bg-[#fff1ed] px-3 py-2.5 text-sm text-[#9d4937]">Notifications could not be loaded. Check your connection and account permissions.</p>}
              {!notificationsQuery.isLoading && visibleNotifications.length === 0 && <p className="mt-5 rounded-md bg-canvas p-6 text-center text-sm text-muted">{filter === 'unread' ? 'You are all caught up.' : 'No notifications yet.'}</p>}
              <div className="mt-3 divide-y divide-black/[0.06]">
                {visibleNotifications.map((notification) => (
                  <article key={notification.id} className={`flex gap-3 py-4 ${notification.is_read ? 'opacity-75' : ''}`}>
                    <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${notification.is_read ? 'bg-canvas text-muted' : 'bg-[#e4f1eb] text-forest'}`}><Bell size={17} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{notification.title}</h2><span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium text-muted">{notification.notification_type.replace(/_/g, ' ')}</span>{!notification.is_read && <span className="h-2 w-2 rounded-full bg-[#3e8a69]" aria-label="Unread" />}</div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted">{notification.message}</p>
                      <p className="mt-1 text-xs text-muted">{formatCreatedAt(notification.created_at)}</p>
                    </div>
                    {!notification.is_read && <button type="button" disabled={markReadMutation.isPending} onClick={() => markReadMutation.mutate(notification.id)} className="self-start rounded-md border border-[#d5ded8] px-3 py-2 text-xs font-semibold">Mark read</button>}
                  </article>
                ))}
              </div>
              {(markReadMutation.isError || markAllMutation.isError) && <p role="alert" className="mt-3 rounded-md bg-[#fff1ed] px-3 py-2 text-sm text-[#9d4937]">The notification update could not be saved.</p>}
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
