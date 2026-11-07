import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import App from './App'

test('등록되지 않은 주소에서 안내를 표시하고 홈으로 이동한다', () => {
  render(<MemoryRouter initialEntries={['/missing']}><App /></MemoryRouter>)

  expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('link', { name: '홈으로 이동' }))
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('BoSo가 함께 살펴볼게요.')
  expect(screen.getByRole('main')).toHaveFocus()
  expect(document.title).toBe('홈 | BoSo')
})

test('공통 메뉴 이동 시 활성 항목과 본문을 바꾸고 헤더·푸터를 유지한다', () => {
  render(<MemoryRouter><App /></MemoryRouter>)
  const header = screen.getByRole('banner')
  const footer = screen.getByRole('contentinfo')
  const nav = within(screen.getByRole('navigation', { name: '주요 메뉴' }))
  expect(nav.getByRole('link', { name: '홈' })).toHaveAttribute('aria-current', 'page')

  for (const label of ['정책 변경', 'To-Do', 'AI 챗봇', '내 정보']) {
    fireEvent.click(nav.getByRole('link', { name: label }))
    expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: '홈' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('heading', { level: 1, name: label })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '조금만 기다려 주세요' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBe(header)
    expect(screen.getByRole('contentinfo')).toBe(footer)
    expect(screen.getByRole('main')).toHaveFocus()
    expect(document.title).toBe(`${label} | BoSo`)
  }
})

test('각 메뉴는 직접 접근해도 공통 레이아웃 안에서 표시한다', () => {
  render(<MemoryRouter initialEntries={['/todos']}><App /></MemoryRouter>)
  expect(screen.getAllByRole('main')).toHaveLength(1)
  expect(screen.getByRole('heading', { level: 1, name: 'To-Do' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '본문으로 바로가기' })).toHaveAttribute('href', '#main-content')
})
