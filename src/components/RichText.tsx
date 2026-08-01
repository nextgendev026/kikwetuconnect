'use client'
import React from 'react'

function safeUrl(url: string): string {
  const t = url.trim()
  if (t.startsWith('/')) return t
  try {
    const u = new URL(t)
    return u.protocol === 'http:' || u.protocol === 'https:' ? t : '#'
  } catch {
    return '#'
  }
}

function renderInline(text: string, keyBase = 0): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let buffer = ''
  let i = 0
  let k = keyBase

  const flush = () => {
    if (buffer) { nodes.push(buffer); buffer = '' }
  }

  while (i < text.length) {
    const rest = text.slice(i)
    let matched: { len: number; node: React.ReactNode } | null = null

    const code = rest.match(/^`([^`\n]+)`/)
    if (code) matched = { len: code[0].length, node: <code key={k++} className="rich-code">{code[1]}</code> }

    if (!matched) {
      const link = rest.match(/^\[([^\]]+)\]\(([^)\s]+)\)/)
      if (link) matched = {
        len: link[0].length,
        node: <a key={k++} className="rich-link" href={safeUrl(link[2])} target="_blank" rel="noopener noreferrer">{renderInline(link[1], k * 100)}</a>,
      }
    }
    if (!matched) {
      const bold = rest.match(/^\*\*([^*]+)\*\*/)
      if (bold) matched = { len: bold[0].length, node: <strong key={k++} className="rich-strong">{renderInline(bold[1], k * 100)}</strong> }
    }
    if (!matched) {
      const strike = rest.match(/^~~([^~]+)~~/)
      if (strike) matched = { len: strike[0].length, node: <s key={k++} className="rich-strike">{renderInline(strike[1], k * 100)}</s> }
    }
    if (!matched) {
      const italic = rest.match(/^\*([^*]+)\*/)
      if (italic) matched = { len: italic[0].length, node: <em key={k++} className="rich-em">{renderInline(italic[1], k * 100)}</em> }
    }

    if (matched) {
      flush()
      nodes.push(matched.node)
      i += matched.len
    } else {
      buffer += text[i]
      i++
    }
  }
  flush()
  return nodes
}

function parseBlocks(content: string): React.ReactNode[] {
  const lines = content.split(/\r?\n/)
  const blocks: React.ReactNode[] = []
  let i = 0
  let k = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (!trimmed) { i++; continue }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
      blocks.push(<Tag key={k++} className={`rich-h rich-h${level}`}>{renderInline(heading[2], k * 1000)}</Tag>)
      i++
      continue
    }

    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={k++} className="rich-hr" />)
      i++
      continue
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push(
        <blockquote key={k++} className="rich-quote">
          {quoteLines.map((l, idx) => <div key={idx}>{renderInline(l, k * 1000 + idx)}</div>)}
        </blockquote>
      )
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-*]\s+(.*)$/)
        if (!m) break
        items.push(m[1]); i++
      }
      blocks.push(
        <ul key={k++} className="rich-ul">
          {items.map((it, idx) => <li key={idx} className="rich-li">{renderInline(it, k * 1000 + idx)}</li>)}
        </ul>
      )
      continue
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = []
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\d+[.)]\s+(.*)$/)
        if (!m) break
        items.push(m[1]); i++
      }
      blocks.push(
        <ol key={k++} className="rich-ol">
          {items.map((it, idx) => <li key={idx} className="rich-li">{renderInline(it, k * 1000 + idx)}</li>)}
        </ol>
      )
      continue
    }

    const paraLines: string[] = []
    while (i < lines.length) {
      const t = lines[i].trim()
      if (!t) break
      if (/^(#{1,3}\s|>\s?|[-*]\s+|\d+[.)]\s+|(\-{3,}|\*{3,}|_{3,})$)/.test(t)) break
      paraLines.push(lines[i])
      i++
    }
    blocks.push(<p key={k++} className="rich-p">{renderInline(paraLines.join('\n'), k * 1000)}</p>)
  }

  return blocks
}

export function countWords(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+[.)]\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/(\*|_)([^*_]+)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_~`-]{2,}/g, '')
}

export default function RichText({
  content,
  className,
  clamp = false,
}: {
  content: string
  className?: string
  clamp?: boolean
}) {
  const blocks = React.useMemo(() => parseBlocks(content), [content])
  const style: React.CSSProperties = clamp
    ? {
        display: '-webkit-box',
        WebkitLineClamp: 6,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }
    : {}
  return (
    <div className={`rich-text ${className || ''}`} style={style}>
      {blocks}
    </div>
  )
}
