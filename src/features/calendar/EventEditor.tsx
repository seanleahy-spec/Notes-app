import { useState } from 'react'
import { useDialogs } from '../../components/dialogs'
import { Sheet } from '../../components/Sheet'
import { Switch } from '../../components/Switch'
import type { CalendarEvent } from '../../db/db'
import { fromMinutes, toMinutes } from './dates'
import { createEvent, deleteEvent, isValidDraft, updateEvent, type EventDraft } from './eventsRepo'

/** Add / edit / delete an event. */
export function EventEditor({
  event,
  initial,
  onClose,
  onSaved,
}: {
  event?: CalendarEvent
  initial?: EventDraft
  onClose: () => void
  onSaved: (dateKey: string) => void
}) {
  const { confirm } = useDialogs()
  const [draft, setDraft] = useState<EventDraft>(() =>
    event
      ? {
          title: event.title,
          date: event.date,
          allDay: event.allDay,
          startTime: event.startTime,
          endTime: event.endTime,
          notes: event.notes,
        }
      : initial!,
  )
  const [saving, setSaving] = useState(false)
  const error = isValidDraft(draft)
  const set = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }))

  // Moving the start keeps the event's length, like Apple Calendar.
  const changeStart = (startTime: string) => {
    if (!startTime) return set({ startTime })
    const duration = Math.max(15, toMinutes(draft.endTime) - toMinutes(draft.startTime))
    set({ startTime, endTime: fromMinutes(toMinutes(startTime) + duration) })
  }

  const save = async () => {
    if (error || saving) return
    setSaving(true)
    if (event) await updateEvent(event.id, draft)
    else await createEvent(draft)
    onSaved(draft.date)
  }

  const remove = async () => {
    if (!event) return
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
          <li className="form-row">
            <label htmlFor="ev-date">Date</label>
            <input
              id="ev-date"
              type="date"
              className="form-pill"
              value={draft.date}
              required
              onChange={(e) => set({ date: e.target.value })}
            />
          </li>
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
                  className={'form-pill' + (error && draft.startTime && draft.endTime ? ' invalid' : '')}
                  value={draft.endTime}
                  onChange={(e) => set({ endTime: e.target.value })}
                />
              </li>
            </>
          )}
        </ul>
        {error && <p className="form-error" role="alert">{error}</p>}

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
