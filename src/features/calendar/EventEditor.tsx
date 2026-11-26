import { useState } from 'react'
import { useDialogs } from '../../components/dialogs'
import { XCircleFillIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { Switch } from '../../components/Switch'
import type { Recurrence } from '../../db/db'
import { colorVar, DEFAULT_EVENT_COLOR, EVENT_COLORS } from './colors'
import { fmt, fromKey, fromMinutes, toMinutes } from './dates'
import {
  createEvent,
  deleteEvent,
  deleteOccurrence,
  describeRecurrence,
  detachOccurrence,
  isValidDraft,
  updateEvent,
  type EventDraft,
  type Occurrence,
} from './eventsRepo'

/** Weekday toggles in Monday-first order; values are Date.getDay() numbers. */
const WEEKDAY_TOGGLES = [
  { day: 1, letter: 'M', name: 'Monday' },
  { day: 2, letter: 'T', name: 'Tuesday' },
  { day: 3, letter: 'W', name: 'Wednesday' },
  { day: 4, letter: 'T', name: 'Thursday' },
  { day: 5, letter: 'F', name: 'Friday' },
  { day: 6, letter: 'S', name: 'Saturday' },
  { day: 0, letter: 'S', name: 'Sunday' },
]

type RepeatKind = 'never' | 'weekly' | 'dates'

/** Add / edit / delete an event (including repeating events). */
export function EventEditor({
  event,
  initial,
  onClose,
  onSaved,
}: {
  /** The occurrence that was tapped (omit for a new event). */
  event?: Occurrence
  initial?: EventDraft
  onClose: () => void
  onSaved: (dateKey: string) => void
}) {
  const { confirm, choose } = useDialogs()
  const [draft, setDraft] = useState<EventDraft>(() =>
    event
      ? {
          title: event.title,
          date: event.date,
          allDay: event.allDay,
          startTime: event.startTime,
          endTime: event.endTime,
          notes: event.notes,
          color: event.color ?? DEFAULT_EVENT_COLOR,
          recurrence: event.recurrence ?? null,
        }
      : initial!,
  )
  const [newDate, setNewDate] = useState('')
  const [saving, setSaving] = useState(false)
  const error = isValidDraft(draft)
  const set = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const r = draft.recurrence
  const repeatKind: RepeatKind = r?.kind ?? 'never'

  // Moving the start keeps the event's length, like Apple Calendar.
  const changeStart = (startTime: string) => {
    if (!startTime) return set({ startTime })
    const duration = Math.max(15, toMinutes(draft.endTime) - toMinutes(draft.startTime))
    set({ startTime, endTime: fromMinutes(toMinutes(startTime) + duration) })
  }

  const changeRepeat = (kind: RepeatKind) => {
    if (kind === 'never') return set({ recurrence: null })
    if (kind === 'weekly') return set({ recurrence: { kind: 'weekly', weekdays: [fromKey(draft.date).getDay()], until: null } })
    set({ recurrence: { kind: 'dates', dates: [draft.date] } })
  }

  const setRecurrence = (next: Recurrence) => set({ recurrence: next })

  const toggleWeekday = (day: number) => {
    if (r?.kind !== 'weekly') return
    const weekdays = r.weekdays.includes(day) ? r.weekdays.filter((d) => d !== day) : [...r.weekdays, day]
    setRecurrence({ ...r, weekdays })
  }

  const addDate = (date: string) => {
    if (r?.kind !== 'dates' || !date) return
    setRecurrence({ kind: 'dates', dates: [...new Set([...r.dates, date])].sort() })
    setNewDate('')
  }

  const removeDate = (date: string) => {
    if (r?.kind !== 'dates') return
    setRecurrence({ kind: 'dates', dates: r.dates.filter((d) => d !== date) })
  }

  const save = async () => {
    if (error || saving) return
    if (!event) {
      setSaving(true)
      await createEvent(draft)
      return onSaved(draft.recurrence?.kind === 'dates' ? draft.recurrence.dates[0] : draft.date)
    }
    if (!event.repeating) {
      setSaving(true)
      await updateEvent(event.id, draft)
      return onSaved(draft.date)
    }
    const scope = await choose({
      title: 'This is a repeating event.',
      message: 'Do you want to save the changes for this event only, or for all events in the series?',
      options: [
        { label: 'Save for This Event Only', value: 'one' },
        { label: 'Save for All Events', value: 'all' },
      ],
    })
    if (!scope) return
    setSaving(true)
    if (scope === 'one') {
      await detachOccurrence(event.id, event.date, draft)
      onSaved(draft.date)
    } else {
      // Keep the series' original start unless the date was actually changed.
      const date = draft.date === event.date ? event.seriesStart : draft.date
      await updateEvent(event.id, { ...draft, date })
      onSaved(event.date)
    }
  }

  const remove = async () => {
    if (!event) return
    if (event.repeating) {
      const scope = await choose({
        title: 'This is a repeating event.',
        options: [
          { label: 'Delete This Event Only', value: 'one', destructive: true },
          { label: 'Delete All Events', value: 'all', destructive: true },
        ],
      })
      if (!scope) return
      if (scope === 'one') await deleteOccurrence(event.id, event.date)
      else await deleteEvent(event.id)
      return onClose()
    }
    const ok = await confirm({
      title: 'Delete Event?',
      message: `“${event.title}” will be permanently deleted.`,
      confirmLabel: 'Delete Event',
      destructive: true,
    })
    if (!ok) return
    await deleteEvent(event.id)
    onClose()
  }

  return (
    <Sheet
      title={event ? 'Edit Event' : 'New Event'}
      onClose={onClose}
      left={
        <button type="button" className="text-button" onClick={onClose}>
          Cancel
        </button>
      }
      right={
        <button type="button" className="text-button bold" disabled={!!error || saving} onClick={save}>
          {event ? 'Done' : 'Add'}
        </button>
      }
    >
      <form
        className="event-form"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <ul className="grouped-list">
          <li>
            <input
              className="form-input"
              placeholder="Title"
              aria-label="Title"
              value={draft.title}
              autoFocus={!event}
              enterKeyHint="done"
              onChange={(e) => set({ title: e.target.value })}
            />
          </li>
        </ul>

        <ul className="grouped-list">
          <li className="form-row">
            <span>All-day</span>
            <Switch label="All-day" checked={draft.allDay} onChange={(allDay) => set({ allDay })} />
          </li>
          {repeatKind !== 'dates' && (
            <li className="form-row">
              <label htmlFor="ev-date">{repeatKind === 'weekly' && !event ? 'Starts on' : 'Date'}</label>
              <input
                id="ev-date"
                type="date"
                className="form-pill"
                value={draft.date}
                required
                onChange={(e) => set({ date: e.target.value })}
              />
            </li>
          )}
          {!draft.allDay && (
            <>
              <li className="form-row">
                <label htmlFor="ev-start">Starts</label>
                <input
                  id="ev-start"
                  type="time"
                  className="form-pill"
                  value={draft.startTime}
                  onChange={(e) => changeStart(e.target.value)}
                />
              </li>
              <li className="form-row">
                <label htmlFor="ev-end">Ends</label>
                <input
                  id="ev-end"
                  type="time"
                  className={'form-pill' + (error && draft.startTime && draft.endTime && toMinutes(draft.endTime) <= toMinutes(draft.startTime) ? ' invalid' : '')}
                  value={draft.endTime}
                  onChange={(e) => set({ endTime: e.target.value })}
                />
              </li>
            </>
          )}
        </ul>

        {/* ---- Repeat ---- */}
        <ul className="grouped-list">
          <li className="form-row">
            <label htmlFor="ev-repeat">Repeat</label>
            <select
              id="ev-repeat"
              className="form-pill form-select"
              value={repeatKind}
              onChange={(e) => changeRepeat(e.target.value as RepeatKind)}
            >
              <option value="never">Never</option>
              <option value="weekly">Days of the week</option>
              <option value="dates">Specific dates</option>
            </select>
          </li>

          {r?.kind === 'weekly' && (
            <>
              <li className="form-row weekday-row" role="group" aria-label="Repeat on">
                {WEEKDAY_TOGGLES.map((w) => (
                  <button
                    key={w.day}
                    type="button"
                    className={'weekday-toggle' + (r.weekdays.includes(w.day) ? ' on' : '')}
                    aria-pressed={r.weekdays.includes(w.day)}
                    aria-label={w.name}
                    onClick={() => toggleWeekday(w.day)}
                  >
                    {w.letter}
                  </button>
                ))}
              </li>
              <li className="form-row">
                <span>End Repeat</span>
                <span className="form-row-controls">
                  {r.until ? (
                    <>
                      <input
                        type="date"
                        className="form-pill"
                        aria-label="End repeat date"
                        value={r.until}
                        min={draft.date}
                        onChange={(e) => setRecurrence({ ...r, until: e.target.value || null })}
                      />
                      <button
                        type="button"
                        className="clear-button"
                        aria-label="Repeat forever"
                        onClick={() => setRecurrence({ ...r, until: null })}
                      >
                        <XCircleFillIcon size={20} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="form-pill"
                      onClick={() => setRecurrence({ ...r, until: draft.date })}
                    >
                      Never
                    </button>
                  )}
                </span>
              </li>
            </>
          )}

          {r?.kind === 'dates' && (
            <>
              {r.dates.map((d) => (
                <li key={d} className="form-row">
                  <span>{fmt(fromKey(d), 'EEE d MMMM yyyy')}</span>
                  <button
                    type="button"
                    className="clear-button"
                    aria-label={`Remove ${fmt(fromKey(d), 'd MMMM yyyy')}`}
                    onClick={() => removeDate(d)}
                  >
                    <XCircleFillIcon size={20} />
                  </button>
                </li>
              ))}
              <li className="form-row">
                <label htmlFor="ev-add-date">Add Date</label>
                <input
                  id="ev-add-date"
                  type="date"
                  className="form-pill"
                  value={newDate}
                  onChange={(e) => addDate(e.target.value)}
                />
              </li>
            </>
          )}
        </ul>
        {r && !error && <p className="list-section-footer">{describeRecurrence(r)}</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {/* ---- Colour ---- */}
        <ul className="grouped-list">
          <li className="form-row">
            <span>Colour</span>
            <span className="color-picker" role="radiogroup" aria-label="Colour">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={draft.color === c.id}
                  aria-label={c.label}
                  className={'color-swatch' + (draft.color === c.id ? ' selected' : '')}
                  style={{ background: colorVar(c.id) }}
                  onClick={() => set({ color: c.id })}
                />
              ))}
            </span>
          </li>
        </ul>

        <ul className="grouped-list">
          <li>
            <textarea
              className="form-input form-notes"
              placeholder="Notes"
              aria-label="Notes"
              rows={4}
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </li>
        </ul>

        {event && (
          <ul className="grouped-list">
            <li>
              <button type="button" className="list-button destructive centered" onClick={remove}>
                Delete Event
              </button>
            </li>
          </ul>
        )}
        <button type="submit" hidden />
      </form>
    </Sheet>
  )
}
