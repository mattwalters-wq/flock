/**
 * Format a date as a human-readable relative time string.
 *
 * - Within 60 s  → "just now"
 * - Within 1 h   → "45m ago"
 * - Within 24 h  → "3h ago"
 * - Within 7 d   → "5d ago"
 * - Older        → "12 Mar" or "12 Mar 2023" (when not the current year)
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  // Older than 7 days — show a short date
  const day = d.getDate()
  const month = d.toLocaleString('en-GB', { month: 'short' })
  const year = d.getFullYear()
  const currentYear = now.getFullYear()

  return year === currentYear ? `${day} ${month}` : `${day} ${month} ${year}`
}
