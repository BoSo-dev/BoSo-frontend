export function parseApiBaseUrl(value: string | undefined): string {
  const message = 'VITE_API_BASE_URL에는 경로·인증정보 없는 HTTP(S) 서버 주소를 설정하세요.'
  let url: URL
  try {
    url = new URL(value ?? 'http://localhost:8000')
  } catch {
    throw new Error(message)
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(message)
  }

  return url.origin
}

export const env = {
  apiBaseUrl: parseApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
}
