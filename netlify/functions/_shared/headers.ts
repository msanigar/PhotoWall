/** Get a header value; works with both Headers and plain object (Netlify can pass either). */
export function getHeader(
  headers: Headers | Record<string, string | undefined>,
  name: string
): string | undefined {
  if (typeof (headers as Headers).get === "function") {
    const h = headers as Headers
    return h.get(name) ?? h.get(name.toLowerCase()) ?? undefined
  }
  const obj = headers as Record<string, string | undefined>
  const lower = name.toLowerCase()
  return obj[name] ?? obj[lower] ?? undefined
}
