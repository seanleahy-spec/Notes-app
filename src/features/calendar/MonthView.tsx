import { isSameMonth } from 'date-fns'
import type { CalendarEvent } from '../../db/db'
import { displayTime, fmt, fromKey, monthGridDays, toKey, todayKey } from './dates'
import { groupByDate, timeRangeLabel, useEventsBetween } from './eventsRepo'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function MonthView({
  date,
  selectedKey,
  wide,
  onSelect,
  onOpenDay,
  onOpenEvent,
  onNewOnDay,
}: {
  date: Date
  selectedKey: string
  wide: boolean
  onSelect: (d: Date) => void
  onOpenDay: (d: Date) => void
  onOpenEvent: (e: CalendarEvent) => void
  onNewOnDay: (d: Date) => void
}) {
  const days = monthGridDays(date)
  const events = useEventsBetween(toKey(days[0]), toKey(days[days.length - 1]))
  const byDate = groupByDate(events ?? [])
  const today = todayKey()
  const weeks = days.length / 7

  return (
    <div className={'month-view' + (wide ? ' wide' : '')}>
      <div className="month-weekdays" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d}>{wide ? d : d[0]}</span>
        ))}
      </div>
      <div className="month-grid" role="grid" aria-label={fmt(date, 'MMMM yyyy')} style={{ gridTemplateRows: `repeat(${weeks}, 1fr)` }}>
        {days.map((day) => {
          const key = toKey(day)
          const dayEvents = byDate.get(key) ?? []
          const classes = [
            'month-cell',
            isSameMonth(day, date) ? '' : 'outside',
            key === today ? 'today' : '',
            key === selectedKey ? 'selected' : '',
          ]
          return (
            <div
              key={key}
              role="gridcell"
              className={classes.join(' ')}
              aria-selected={key === selectedKey}
              aria-label={`${fmt(day, 'EEEE d MMMM')}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : ''}`}
              onClick={() => onSelect(day)}
              onDoubleClick={() => (wide ? onNewOnDay(day) : onOpenDay(day))}
            >
              <span className="month-day-number">{day.getDate()}</span>
              {wide ? (
                <div className="month-cell-events">
                  {dayEvents.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className={'month-chip' + (e.allDay ? ' all-day' : '')}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onOpenEvent(e)
                      }}
                    >
                      {!e.allDay && <span className="month-chip-time">{displayTime(e.startTime)}</span>}
                      <span className="month-chip-title">{e.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && <span className="month-more">{dayEvents.length - 3} more</span>}
                </div>
              ) : (
                <span className="month-dots" aria-hidden="true">
                  {dayEvents.slice(0, 3).map((e) => (
                    <i key={e.id} />
                  ))}
                </span>
              )}
            </div>
          )
        })}
      </div>
      {!wide && (
        <DayEventList
          dateKey={selectedKey}
          events={byDate.get(selectedKey) ?? []}
          onOpenEvent={onOpenEvent}
        />
      )}
    </div>
  )
}

export function DayEventList({
  dateKey,
  events,
  onOpenEvent,
}: {
  dateKey: string
  events: CalendarEvent[]
  onOpenEvent: (e: CalendarEvent) => void
}) {
  return (
    <section className="day-event-list" aria-label={`Events on ${fmt(fromKey(dateKey), 'd MMMM')}`}>
      <h2 className="day-event-list-header">{fmt(fromKey(dateKey), 'EEEE d MMMM')}</h2>
      {events.length === 0 ? (
        <p className="day-event-list-empty">No Events</p>
      ) : (
        <ul>
          {events.map((e) => (
            <li key={e.id}>
              <button type="button" className="event-row" onClick={() => onOpenEvent(e)}>
                <span className="event-row-bar" />
                <span className="event-row-main">
                  <span className="event-row-title">{e.title}</span>
                  {e.notes && <span className="event-row-notes">{e.notes}</span>}
                </span>
                <span className="event-row-time">{timeRangeLabel(e)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
