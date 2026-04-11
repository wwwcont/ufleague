const MSK_TIME_ZONE = 'Europe/Moscow'

const formatterDateTime = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MSK_TIME_ZONE,
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const formatterTime = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MSK_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

const formatterDate = new Intl.DateTimeFormat('ru-RU', {
  timeZone: MSK_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

export const mskTimeZoneLabel = 'МСК'

export const parseUtcLike = (value: string) => {
  const isoLike = value.includes('T') ? value : value.replace(' ', 'T')
  const withZone = /Z$|[+-]\d\d:\d\d$/.test(isoLike) ? isoLike : `${isoLike}Z`
  const parsed = new Date(withZone)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const parseMatchKickoff = (date: string, time: string) => {
  const parsed = new Date(`${date}T${time}:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export const formatDateTimeMsk = (value: string | Date) => {
  const parsed = value instanceof Date ? value : parseUtcLike(value)
  if (!parsed) return typeof value === 'string' ? value : ''
  return `${formatterDateTime.format(parsed)} (${mskTimeZoneLabel})`
}

export const formatMatchMetaMsk = (date: string, time: string) => {
  const parsed = parseMatchKickoff(date, time)
  if (!parsed) return `${date} ${time}`
  return `${formatterDate.format(parsed)} • ${formatterTime.format(parsed)} (${mskTimeZoneLabel})`
}

export const formatTimeOnlyMsk = (value: string) => {
  const parsed = parseUtcLike(value)
  if (!parsed) return value
  return `${formatterTime.format(parsed)} ${mskTimeZoneLabel}`
}

export const getTimeToKickoff = (date: string, time: string) => {
  const kickoff = parseMatchKickoff(date, time)
  if (!kickoff) return null

  const diffMs = kickoff.getTime() - Date.now()
  if (diffMs <= 0) return null

  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) return `через ${hours}ч ${minutes}м`
  return `через ${minutes}м`
}
