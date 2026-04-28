'use client'

import React from 'react'

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+|www\.[a-z0-9.-]+(?:\.[a-z]{2,})(?:\/[^\s<>"')\]]*)?/gi

interface LinkTextProps {
  text: string
  className?: string
  linkClassName?: string
}

export function LinkText({ text, className, linkClassName }: LinkTextProps) {
  const parts: React.ReactNode[] = []
  let lastIdx = 0
  let match: RegExpExecArray | null
  const regex = new RegExp(URL_REGEX.source, URL_REGEX.flags)

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index))
    }
    let href = match[0]
    if (!href.startsWith('http')) href = `https://${href}`
    parts.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className={linkClassName ?? 'underline decoration-current/50 hover:decoration-current break-all'}
      >
        {match[0]}
      </a>
    )
    lastIdx = match.index + match[0].length
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx))
  }

  return (
    <span className={className} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts}
    </span>
  )
}
