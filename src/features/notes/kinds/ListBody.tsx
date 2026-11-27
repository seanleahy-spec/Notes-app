import { useState } from 'react'
import { ChevronDownIcon, StarIcon } from '../../../components/Icons'
import { newId } from '../../../db/db'
import type { BodyProps, ListData, ListItem, ListTemplate } from './types'

/** Wording per template. */
const TEMPLATES: Record<ListTemplate, { label: string; noun: string; todo: string; done: string }> = {
  general: { label: 'General', noun: 'item', todo: 'To do', done: 'Done' },
  movies: { label: 'Movies & TV', noun: 'movie or show', todo: 'To watch', done: 'Watched' },
  books: { label: 'Books', noun: 'book', todo: 'To read', done: 'Read' },
  places: { label: 'Places', noun: 'place', todo: 'To visit', done: 'Visited' },
  food: { label: 'Restaurants', noun: 'restaurant', todo: 'To try', done: 'Tried' },
}

/** Collection list: quick add, tick off, rate, tag and annotate. */
export function ListBody({ data, onChange }: BodyProps<ListData>) {
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const tpl = TEMPLATES[data.template] ?? TEMPLATES.general

  const update = (id: string, patch: Partial<ListItem>) =>
    onChange({ ...data, items: data.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
  const add = () => {
    const text = draft.trim()
    if (!text) return
    onChange({ ...data, items: [{ id: newId(), text, done: false, rating: 0, note: '', tag: '', addedAt: Date.now() }, ...data.items] })
    setDraft('')
  }
  const remove = (id: string) => onChange({ ...data, items: data.items.filter((i) => i.id !== id) })

  const sorted = [...data.items].sort((a, b) =>
    data.sort === 'az' ? a.text.localeCompare(b.text) : b.addedAt - a.addedAt,
  )
  const todo = sorted.filter((i) => !i.done)
  const done = sorted.filter((i) => i.done)

  const row = (item: ListItem) => {
    const isOpen = open === item.id
    return (
      <li key={item.id} className={(item.done ? 'done ' : '') + (isOpen ? 'open' : '')}>
        <div className="nt-row">
          <button
            type="button"
            role="checkbox"
            aria-checked={item.done}
            aria-label={`Mark ${item.text} ${item.done ? 'not done' : 'done'}`}
            className={'nt-check' + (item.done ? ' on' : '')}
            onClick={() => update(item.id, { done: !item.done })}
          />
          <button type="button" className="nt-row-text nt-row-button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : item.id)}>
            <span className="nt-row-title">{item.text}</span>
            {(item.tag || item.rating > 0 || item.note) && (
              <span className="nt-row-sub">
                {item.rating > 0 && <span className="nt-stars-mini">{'★'.repeat(item.rating)}</span>}
                {item.tag && <span className="nt-tag">{item.tag}</span>}
                {item.note && <span className="nt-row-note">{item.note}</span>}
              </span>
            )}
          </button>
        </div>
        {isOpen && (
          <div className="nt-detail">
            <input className="nt-input wide" aria-label="Name" value={item.text} onChange={(e) => update(item.id, { text: e.target.value })} />
            <div className="nt-stars" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={item.rating === n}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  onClick={() => update(item.id, { rating: item.rating === n ? 0 : n })}
                >
                  <StarIcon size={20} filled={n <= item.rating} />
                </button>
              ))}
            </div>
            <input
              className="nt-input wide"
              placeholder="Tag (e.g. Netflix, Comedy)"
              aria-label="Tag"
              value={item.tag}
              onChange={(e) => update(item.id, { tag: e.target.value })}
            />
            <textarea
              className="nt-input wide"
              rows={2}
              placeholder="Note"
              aria-label="Note"
              value={item.note}
              onChange={(e) => update(item.id, { note: e.target.value })}
            />
            <button type="button" className="nt-link destructive" onClick={() => remove(item.id)}>
              Delete
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="nt-list">
      <div className="nt-list-bar">
        <label className="nt-select">
          <select
            value={data.template}
            aria-label="List type"
            onChange={(e) => onChange({ ...data, template: e.target.value as ListTemplate })}
          >
            {(Object.keys(TEMPLATES) as ListTemplate[]).map((t) => (
              <option key={t} value={t}>
                {TEMPLATES[t].label}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={12} />
        </label>
        <div className="nt-toggle small" role="group" aria-label="Sort">
          <button type="button" aria-pressed={data.sort === 'added'} className={data.sort === 'added' ? 'on' : ''} onClick={() => onChange({ ...data, sort: 'added' })}>
            Recent
          </button>
          <button type="button" aria-pressed={data.sort === 'az'} className={data.sort === 'az' ? 'on' : ''} onClick={() => onChange({ ...data, sort: 'az' })}>
            A–Z
          </button>
        </div>
      </div>

      <div className="nt-add">
        <input
          className="nt-input wide"
          placeholder={`Add a ${tpl.noun}…`}
          aria-label={`Add a ${tpl.noun}`}
          value={draft}
          enterKeyHint="done"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" className="nt-link" disabled={!draft.trim()} onClick={add}>
          Add
        </button>
      </div>

      <div className="nt-section-head">
        <span className="nt-label">
          {tpl.todo} ({todo.length})
        </span>
      </div>
      {todo.length === 0 && <p className="nt-empty">Nothing here yet.</p>}
      <ul className="nt-rows">{todo.map(row)}</ul>

      {done.length > 0 && (
        <>
          <div className="nt-section-head">
            <span className="nt-label">
              {tpl.done} ({done.length})
            </span>
          </div>
          <ul className="nt-rows">{done.map(row)}</ul>
        </>
      )}
    </div>
  )
}
