import { format } from 'date-fns'
import { enAU } from 'date-fns/locale'
import { useLayoutEffect, useRef, useState } from 'react'
import type { BodyProps, DraftData } from './types'

/** Message draft: recipient, subject, body, word count, copy / open in Mail. */
export function DraftBody({ data, onChange }: BodyProps<DraftData>) {
  const [copied, setCopied] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const words = data.body.trim() ? data.body.trim().split(/\s+/).length : 0

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 240)}px`
  }, [data.body])

  const copy = async () => {
    const text = data.subject ? `${data.subject}\n\n${data.body}` : data.body
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }
  const mailHref = `mailto:${encodeURIComponent(data.to.trim())}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.body)}`

  return (
    <div className="nt-draft">
      <label className="nt-field">
        <span>To</span>
        <input
          type="email"
          multiple
          autoCapitalize="off"
          placeholder="name@example.com"
          aria-label="To"
          value={data.to}
          onChange={(e) => onChange({ ...data, to: e.target.value })}
        />
      </label>
      <label className="nt-field">
        <span>Subject</span>
        <input aria-label="Subject" value={data.subject} onChange={(e) => onChange({ ...data, subject: e.target.value })} />
      </label>
      <textarea
        ref={bodyRef}
        className="nt-draft-body"
        placeholder="Write your message…"
        aria-label="Message"
        value={data.body}
        onChange={(e) => onChange({ ...data, body: e.target.value })}
      />
      <div className="nt-draft-bar">
        <span className="nt-label" data-testid="word-count">
          {words} {words === 1 ? 'word' : 'words'} · {data.body.length} characters
        </span>
        <div className="nt-draft-actions">
          <button type="button" className="nt-link" onClick={copy} disabled={!data.body && !data.subject}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <a className="nt-link" href={mailHref}>
            Open in Mail
          </a>
          <button
            type="button"
            className={'nt-link' + (data.sentAt ? ' on' : '')}
            aria-pressed={!!data.sentAt}
            onClick={() => onChange({ ...data, sentAt: data.sentAt ? null : Date.now() })}
          >
            {data.sentAt ? `Sent ${format(data.sentAt, 'd MMM', { locale: enAU })}` : 'Mark sent'}
          </button>
        </div>
      </div>
    </div>
  )
}
