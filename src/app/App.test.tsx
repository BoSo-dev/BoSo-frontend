import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import App from './App'

test('등록되지 않은 주소에서 안내를 표시하고 홈으로 이동한다', () => {
  render(<MemoryRouter initialEntries={['/missing']}><App /></MemoryRouter>)

  expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없습니다.' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('link', { name: '홈으로 이동' }))
  expect(screen.getByRole('heading', { name: 'BoSo' })).toBeInTheDocument()
})
