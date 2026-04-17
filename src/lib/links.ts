export const toExternalUrl = (raw?: string | null): string | null => {
  const value = String(raw ?? '').trim()
  if (!value) return null

  if (/^https?:\/\//i.test(value)) return value
  if (/^\/\//.test(value)) return `https:${value}`
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`
  return null
}

export const toAppRoute = (raw?: string | null): string => {
  const value = String(raw ?? '').trim()
  if (!value) return '/'
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return value
  return `/${value}`
}
