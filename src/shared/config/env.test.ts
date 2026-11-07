import { describe, expect, test } from 'vitest'
import { parseApiBaseUrl } from './env'

test('API 서버 설정이 없으면 로컬 백엔드 주소를 사용한다', () => {
  expect(parseApiBaseUrl(undefined)).toBe('http://localhost:8000')
})

test('HTTPS Origin을 정규화한다', () => {
  expect(parseApiBaseUrl('https://api.example.com/')).toBe('https://api.example.com')
})

describe('공개 설정에 잘못된 주소를 허용하지 않는다', () => {
  test.each([
    '', 'not-a-url', 'file:///tmp/api', 'ftp://api.example.com',
    'https://user:secret@example.com', 'https://api.example.com/api/v1',
    'https://api.example.com?token=secret', 'https://api.example.com#fragment',
  ])('%s', (value) => {
    expect(() => parseApiBaseUrl(value)).toThrow()
  })
})
