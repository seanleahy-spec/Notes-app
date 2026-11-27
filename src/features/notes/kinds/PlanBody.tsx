import { format } from 'date-fns'
import { enAU } from 'date-fns/locale'
import { useRef, useState } from 'react'
import { useDialogs } from '../../../components/dialogs'
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from '../../../components/Icons'
import { db, newId } from '../../../db/db'
import { createEvent, deleteEvent } from '../../calendar/eventsRepo'
import type { BodyProps, PlanData, PlanStep } from './types'

const niceDate = (d: string) => format(new Date(d + 'T00:00:00'), 'EEE d MMM', { locale: enAU })

/** Step-by-step plan with progress; due dates can be added to the calendar. */
export function PlanBody({ data, onChange, title }: BodyProps<PlanData>) {
  const { confirm } = useDialogs()
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const dueAtFocus = useRef<Record<string, string>>({})
  // Keep the latest steps for async calendar callbacks.
  const latest = useRef(data)
  latest.current = data

  const steps = data.steps
  const done = steps.filter((s) => s.done).length
  const update = (id: string, patch: Partial<PlanStep>) =>
    onChange({ ...latest.current, steps: latest.current.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) })

  const add = () => {
    const text = draft.trim()
    if (!text) return
    onChange({ ...data, steps: [...steps, { id: newId(), text, done: false, due: '', note: '', eventId: null }] })
    setDraft('')
  }
  const move = (index: number, dir: -1 | 1) => {
    const next = [...steps]
    const j = index + dir
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    onChange({ ...data, steps: next })
  }

  /** After a due date is set or changed, offer to put it on the calendar (or keep the linked event in step). */
  const syncCalendar = async (step: PlanStep) => {
    const before = dueAtFocus.current[step.id] ?? ''
    delete dueAtFocus.current[step.id]
    const current = latest.current.steps.find((s) => s.id === step.id)
    if (!current || current.due === before) return
    const label = current.text || 'Plan step'
    if (current.eventId) {
      if (current.due) {
        // Move the linked calendar event to the new date.
        await db.events.update(current.eventId, { date: current.due, title: label, updatedAt: Date.now() })
      } else if (await confirm({ title: 'Remove from Calendar?', message: `“${label}” no longer has a due date.`, confirmLabel: 'Remove', cancelLabel: 'Keep' })) {
        await deleteEvent(current.eventId)
        update(step.id, { eventId: null })
      }
      return
    }
    if (!current.due) return
    const yes = await confirm({
      title: 'Add to Calendar?',
      message: `“${label}” on ${niceDate(current.due)}`,
      confirmLabel: 'Add',
      cancelLabel: 'No',
    })
    if (!yes) return
    const eventId = await createEvent({
      title: label,
      date: current.due,
      allDay: true,
      startTime: '09:00',
      endTime: '10:00',
      notes: title ? `From plan: ${title}` : 'From a plan',
      color: 'blue',
      recurrence: null,
    })
    update(step.id, { eventId })
  }

  const removeStep = async (step: PlanStep) => {
    if (step.eventId && (await confirm({ title: 'Remove from Calendar too?', message: `“${step.text}” is on your calendar.`, confirmLabel: 'Remove', cancelLabel: 'Keep' })))
      await deleteEvent(step.eventId)
    onChange({ ...latest.current, steps: latest.current.steps.filter((s) => s.id !== step.id) })
  }

  return (
    <div className="nt-plan">
      <div className="nt-progress" aria-label={`${done} of ${steps.length} steps done`}>
        <span className="nt-label" data-testid="plan-progress">
          {done} of {steps.length} done
        </span>
        <span className="nt-progress-bar">
          <i style={{ width: steps.length ? `${(done / steps.length) * 100}%` : 0 }} />
        </span>
      </div>

      <ol className="nt-rows nt-steps">
        {steps.map((s, i) => {
          const isOpen = open === s.id
          return (
            <li key={s.id} className={(s.done ? 'done ' : '') + (isOpen ? 'open' : '')}>
              <div className="nt-row">
                <span className="nt-step-num">{String(i + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={s.done}
                  aria-label={`Mark step ${i + 1} ${s.done ? 'not done' : 'done'}`}
                  className={'nt-check' + (s.done ? ' on' : '')}
                  onClick={() => update(s.id, { done: !s.done })}
                />
                <span className="nt-row-text">
                  <input
                    className="nt-step-text"
                    aria-label={`Step ${i + 1}`}
                    value={s.text}
                    onChange={(e) => update(s.id, { text: e.target.value })}
                  />
                  {(s.due || s.note) && (
                    <span className="nt-row-sub">
                      {s.due && <span className="nt-due">{niceDate(s.due)}{s.eventId ? ' · On calendar' : ''}</span>}
                      {s.note && <span className="nt-row-note">{s.note}</span>}
                    </span>
                  )}
                </span>
                <button type="button" className="nt-more" aria-label={`Details for step ${i + 1}`} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}>
                  <ChevronDownIcon size={16} />
                </button>
              </div>
              {isOpen && (
                <div className="nt-detail">
                  <label className="nt-field">
                    <span>Due</span>
                    <input
                      type="date"
                      aria-label={`Due date for step ${i + 1}`}
                      value={s.due}
                      onFocus={() => (dueAtFocus.current[s.id] = s.due)}
                      onChange={(e) => {
                        if (!(s.id in dueAtFocus.current)) dueAtFocus.current[s.id] = s.due
                        update(s.id, { due: e.target.value })
                      }}
                      onBlur={() => void syncCalendar(s)}
                    />
                  </label>
                  <textarea
                    className="nt-input wide"
                    rows={2}
                    placeholder="Note"
                    aria-label={`Note for step ${i + 1}`}
                    value={s.note}
                    onChange={(e) => update(s.id, { note: e.target.value })}
                  />
                  <div className="nt-detail-actions">
                    <button type="button" className="nt-icon" aria-label="Move step up" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ArrowUpIcon size={18} />
                    </button>
                    <button type="button" className="nt-icon" aria-label="Move step down" disabled={i === steps.length - 1} onClick={() => move(i, 1)}>
                      <ArrowDownIcon size={18} />
                    </button>
                    <button type="button" className="nt-link destructive" onClick={() => removeStep(s)}>
                      Delete step
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <div className="nt-add">
        <input
          className="nt-input wide"
          placeholder="Add a step…"
          aria-label="Add a step"
          value={draft}
          enterKeyHint="done"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" className="nt-link" disabled={!draft.trim()} onClick={add}>
          Add
        </button>
      </div>
    </div>
  )
}
