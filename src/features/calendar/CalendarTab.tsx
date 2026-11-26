import { addDays, addMonths, addWeeks, startOfWeek } from 'date-fns'
import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '../../components/Icons'
import { NavBar } from '../../components/NavBar'
import { SegmentedControl } from '../../components/SegmentedControl'
import { useIsWide } from '../../hooks/useMediaQuery'
import { useSwipe } from '../../hooks/useSwipe'
import './calendar.css'
import { fmt, fromKey, fromMinutes, toKey, todayKey, WEEK_OPTS } from './dates'
import { EventEditor } from './EventEditor'
import type { EventDraft, Occurrence } from './eventsRepo'
import { DEFAULT_EVENT_COLOR } from './colors'
import { MonthView } from './MonthView'
import { DayView, WeekView } from './TimeViews'

export type CalendarView = 'day' | 'week' | 'month'
const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
]
const VIEW_PREF_KEY = 'calendar.view'

function savedView(): CalendarView {
  try {
    const v = localStorage.getItem(VIEW_PREF_KEY)
    if (v === 'day' || v === 'week' || v === 'month') return v
  } catch {
    /* storage unavailable */
  }
  return 'month'
}

type EditorState = { kind: 'new'; draft: EventDraft } | { kind: 'edit'; event: Occurrence }

/** A sensible default for a new event on `date` (optionally at a given minute of the day). */
function newDraft(date: Date, atMinutes?: number): EventDraft {
  let start = atMinutes
  if (start === undefined) {
    const now = new Date()
    start = toKey(date) === todayKey() ? Math.min((now.getHours() + 1) * 60, 23 * 60) : 9 * 60
  }
  return {
    title: '',
    date: toKey(date),
    allDay: false,
    startTime: fromMinutes(start),
    endTime: fromMinutes(start + 60),
    notes: '',
    color: DEFAULT_EVENT_COLOR,
    recurrence: null,
  }
}

/**
 * Calendar tab. The current view and selected date live in the URL
 * (e.g. #/calendar?view=week&date=2026-11-26) so they survive navigation.
 */
export default function CalendarTab() {
  const [params, setParams] = useSearchParams()
  const wide = useIsWide()
  const paramView = params.get('view')
  const view: CalendarView =
    paramView === 'day' || paramView === 'week' || paramView === 'month' ? paramView : savedView()
  const date = fromKey(params.get('date'))
  const selectedKey = toKey(date)
  const [editor, setEditor] = useState<EditorState | null>(null)

  const go = useCallback(
    (next: { view?: CalendarView; date?: Date }) => {
      const v = next.view ?? view
      if (next.view) {
        try {
          localStorage.setItem(VIEW_PREF_KEY, next.view)
        } catch {
          /* ignore */
        }
      }
      setParams({ view: v, date: toKey(next.date ?? date) }, { replace: true })
    },
    [view, date, setParams],
  )

  const step = (dir: 1 | -1) => {
    if (view === 'month') go({ date: addMonths(date, dir) })
    else if (view === 'week') go({ date: addWeeks(date, dir) })
    else go({ date: addDays(date, dir) })
  }
  const swipe = useSwipe({ onLeft: () => step(1), onRight: () => step(-1) })

  const title =
    view === 'day'
      ? fmt(date, wide ? 'EEEE d MMMM yyyy' : 'EEE d MMM yyyy')
      : fmt(view === 'week' ? startOfWeek(date, WEEK_OPTS) : date, 'MMMM yyyy')

  const openNew = (on: Date = date, atMinutes?: number) => setEditor({ kind: 'new', draft: newDraft(on, atMinutes) })
  const openEvent = (event: Occurrence) => setEditor({ kind: 'edit', event })
  const prevLabel = `Previous ${view}`
  const nextLabel = `Next ${view}`

  return (
    <div className="page calendar-page">
      <NavBar
        left={
          <button type="button" className="text-button" onClick={() => go({ date: new Date() })}>
            Today
          </button>
        }
        title={
          <SegmentedControl label="Calendar view" options={VIEWS} value={view} onChange={(v) => go({ view: v })} />
        }
        right={
          <button type="button" className="icon-button" aria-label="New event" onClick={() => openNew()}>
            <PlusIcon size={24} />
          </button>
        }
      />
      <div className="calendar-title-row">
        <h1 className="calendar-title">{title}</h1>
        <div className="calendar-steppers">
          <button type="button" className="icon-button" aria-label={prevLabel} onClick={() => step(-1)}>
            <ChevronLeftIcon size={20} />
          </button>
          <button type="button" className="icon-button" aria-label={nextLabel} onClick={() => step(1)}>
            <ChevronRightIcon size={20} />
          </button>
        </div>
      </div>

      <div className="calendar-body" {...swipe}>
        {view === 'month' && (
          <MonthView
            date={date}
            selectedKey={selectedKey}
            wide={wide}
            onSelect={(d) => go({ date: d })}
            onOpenDay={(d) => go({ view: 'day', date: d })}
            onOpenEvent={openEvent}
            onNewOnDay={(d) => openNew(d)}
          />
        )}
        {view === 'week' && (
          <WeekView
            date={date}
            onOpenDay={(d) => go({ view: 'day', date: d })}
            onOpenEvent={openEvent}
            onSlot={(d, mins) => openNew(d, mins)}
          />
        )}
        {view === 'day' && (
          <DayView
            date={date}
            onSelect={(d) => go({ date: d })}
            onOpenEvent={openEvent}
            onSlot={(d, mins) => openNew(d, mins)}
          />
        )}
      </div>

      {editor && (
        <EventEditor
          key={editor.kind === 'edit' ? editor.event.key : 'new'}
          event={editor.kind === 'edit' ? editor.event : undefined}
          initial={editor.kind === 'new' ? editor.draft : undefined}
          onClose={() => setEditor(null)}
          onSaved={(savedDate) => {
            setEditor(null)
            if (savedDate !== selectedKey && view !== 'week') go({ date: fromKey(savedDate) })
          }}
        />
      )}
    </div>
  )
}
