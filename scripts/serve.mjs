import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildHtml, root } from './build.mjs'

const preview = process.argv.includes('--preview')
const port = preview ? 4173 : 5173
const server = createServer(async (request, response) => {
  const path = new URL(request.url, `http://localhost:${port}`).pathname
  if (path === '/favicon.ico') { response.writeHead(204).end(); return }
  if (!['/', '/index.html', '/BoSo.html'].includes(path)) { response.writeHead(404).end(); return }
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return }
  try {
    const html = preview ? await readFile(resolve(root, 'dist/BoSo.html'), 'utf8') : await buildHtml()
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    response.end(request.method === 'HEAD' ? undefined : html)
  } catch (error) {
    console.error(error.message)
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('화면 생성 실패. 터미널을 확인하세요. preview는 먼저 npm run build가 필요합니다.')
  }
})
server.on('error', (error) => { console.error(error.message); process.exitCode = 1 })
server.listen(port, '127.0.0.1', () => console.log(`BoSo ${preview ? 'preview' : 'dev'}: http://localhost:${port} (수정 후 새로고침)`))
