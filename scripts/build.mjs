import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises'
import { dirname, resolve, relative, isAbsolute, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function sourceFile(reference) {
  if (!reference.startsWith('./') || reference.includes('\\') || /[?#]/.test(reference)) {
    throw new Error(`로컬 상대 경로만 통합할 수 있습니다: ${reference}`)
  }
  const path = await realpath(resolve(root, reference))
  const inside = relative(await realpath(root), path)
  if (inside.startsWith('..') || isAbsolute(inside)) throw new Error('프로젝트 외부 파일은 통합할 수 없습니다.')
  return { path, bytes: await readFile(path) }
}

async function replaceAsync(input, expression, replace) {
  let output = ''
  let offset = 0
  for (const match of input.matchAll(expression)) {
    output += input.slice(offset, match.index) + await replace(match)
    offset = match.index + match[0].length
  }
  return output + input.slice(offset)
}

export async function buildHtml(source) {
  let html = source ?? await readFile(resolve(root, 'index.html'), 'utf8')
  html = await replaceAsync(html, /<link\b[^>]*>/gi, async ([tag]) => {
    const href = tag.match(/\bhref="([^"]+)"/i)?.[1]
    if (!/\brel="stylesheet"/i.test(tag) || !href) throw new Error('지원하지 않는 link 태그입니다.')
    const { bytes } = await sourceFile(href)
    const css = bytes.toString('utf8')
    if (/@import\b|url\s*\(|<\/style/i.test(css)) throw new Error('CSS 외부 자원은 지원하지 않습니다. 이미지는 HTML에 넣으세요.')
    return `<style>\n${css}\n</style>`
  })
  html = await replaceAsync(html, /<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/gi, async ([tag, src]) => {
    if (/\btype="module"/i.test(tag)) throw new Error('일반 JavaScript 스크립트를 사용하세요.')
    const { bytes } = await sourceFile(src)
    const js = bytes.toString('utf8')
    if (/<\/script/i.test(js)) throw new Error('인라인 스크립트 종료 태그를 포함할 수 없습니다.')
    return `<script>\n${js}\n</script>`
  })
  html = await replaceAsync(html, /(<img\b[^>]*\bsrc=")([^"]+)(")/gi, async ([, before, src, after]) => {
    const { path, bytes } = await sourceFile(src)
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }[extname(path)]
    if (!mime) throw new Error('지원하지 않는 이미지 형식입니다.')
    return `${before}data:${mime};base64,${bytes.toString('base64')}${after}`
  })
  if (/<script\b[^>]*\bsrc=|<link\b|<iframe\b|<img\b[^>]*\bsrcset=/i.test(html)) {
    throw new Error('통합되지 않은 외부 자원이 있습니다.')
  }
  return html
}

export async function build() {
  const html = await buildHtml()
  await mkdir(resolve(root, 'dist'), { recursive: true })
  const output = resolve(root, 'dist/BoSo.html')
  await writeFile(output, html, 'utf8')
  console.log(`생성 완료: dist/BoSo.html (${Buffer.byteLength(html)} bytes)`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build()
