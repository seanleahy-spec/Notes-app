import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { eventColorStyle } from './colors'
import { displayTime, fmt, hourLabel, toKey, todayKey, toMinutes, weekDays } from './dates'
import { groupByDate, useEventsBetween, type Occurrence } from './eventsRepo'

const HOUR_HEIGHT = 52
const MIN_EVENT_HEIGHT = 22

interface TimeViewProps {
  date: Date
  onOpenEvent: (e: Occurrence) => void
  onSlot: (day: Date, minutes: number) => void
}

export function WeekView({ date, onOpenDay, ...rest }: TimeViewProps & { onOpenDay: (d: Date) => void }) {
  const days = weekDays(date)
  return <TimeGrid days={days} onHeaderTap={onOpenDay} {...rest} />
}

export function DayView({ date, onSelect, ...rest }: TimeViewProps & { onSelect: (d: Date) => void }) {
  const week = weekDays(date)
  const selected = toKey(date)
  const today = todayKey()
  return (
    <div className="day-view">
      <div className="week-strip" role="tablist" aria-label="Days of this week">
        {week.map((d) => {
          const key = toKey(d)
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={key === selected}
              aria-label={fmt(d, 'EEEE d MMMM')}
              className={'week-strip-day' + (key === selected ? ' selected' : '') + (key === today ? ' today' : '')}
              onClick={() => onSelect(d)}
            >
              <span className="week-strip-letter">{fmt(d, 'EEEEE')}</span>
              <span className="week-strip-number">{d.getDate()}</span>
            </button>
          )
        })}
      </div>
      <TimeGrid days={[date]} {...rest} />
    </div>
  )
}

/** Vertical hour grid with one column per day. Shared by Week and Day views. */
function TimeGrid({
  days,
  onOpenEvent,
  onSlot,
  onHeaderTap,
}: {
  days: Date[]
  onOpenEvent: (e: Occurrence) => void
  onSlot: (day: Date, minutes: number) => void
  onHeaderTap?: (d: Date) => void
}) {
  const keys = days.map(toKey)
  const events = useEventsBetween(keys[0], keys[keys.length - 1])
  const byDate = groupByDate(events ?? [])
  const today = todayKey()
  const hasAllDay = (events ?? []).some((e) => e.allDay)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nowMinutes = useNowMinutes()
  const showsToday = keys.includes(today)

  // Start scrolled to just before now (if today is visible) or 7 am.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const startHour = showsToday ? Math.max(0, nowMinutes / 60 - 1.5) : 7
    el.scrollTop = startHour * HOUR_HEIGHT
    // Only on first render of this grid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={'time-grid' + (days.length === 1 ? ' single' : '')}>
      {onHeaderTap && (
        <div className="time-grid-header">
          <div className="time-gutter" />
          {days.map((d, i) => (
            <button
              key={keys[i]}
              type="button"
              className={'time-grid-day-header' + (keys[i] === today ? ' today' : '')}
              aria-label={`Show ${fmt(d, 'EEEE d MMMM')}`}
              onClick={() => onHeaderTap(d)}
            >
              <span className="week-strip-letter">{fmt(d, 'EEE')}</span>
              <span className="week-strip-number">{d.getDate()}</span>
            </button>
          ))}
        </div>
      )}

      {hasAllDay && (
        <div className="time-grid-allday">
          <div className="time-gutter">all-day</div>
          {keys.map((key) => (
            <div key={key} className="time-grid-allday-cell">
              {(byDate.get(key) ?? [])
                .filter((e) => e.allDay)
                .map((e) => (
                  <button key={e.key} type="button" className="event-chip" style={eventColorStyle(e.color)} onClick={() => onOpenEvent(e)}>
                    {e.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}

      <div className="time-grid-scroll" ref={scrollRef}>
        <div className="time-grid-body" style={{ height: 24 * HOUR_HEIGHT }}>
          <div className="time-gutter hours" aria-hidden="true">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} style={{ top: h * HOUR_HEIGHT }}>
                {h === 0 ? '' : hourLabel(h)}
              </span>
            ))}
          </div>
          {days.map((d, i) => {
            const key = keys[i]
            const timed = (byDate.get(key) ?? []).filter((e) => !e.allDay)
            return (
              <div
                key={key}
                className="time-grid-column"
                data-date={key}
                onClick={(ev) => {
                  const rect = ev.currentTarget.getBoundingClientRect()
                  const mins = Math.floor((ev.clientY - rect.top) / HOUR_HEIGHT) * 60
                  onSlot(d, Math.max(0, Math.min(23 * 60, mins)))
                }}
              >
                {layoutColumns(timed).map(({ event: e, col, cols }) => {
                  const start = toMinutes(e.startTime)
                  const end = toMinutes(e.endTime)
                  const height = Math.max(MIN_EVENT_HEIGHT, ((end - start) / 60) * HOUR_HEIGHT - 2)
                  return (
                    <button
                      key={e.key}
                      type="button"
                      className={'time-event' + (height < 40 ? ' compact' : '')}
                      style={{
                        ...eventColorStyle(e.color),
                        top: (start / 60) * HOUR_HEIGHT + 1,
                        height,
                        left: `calc(${(col / cols) * 100}% + 1px)`,
                        width: `calc(${100 / cols}% - 3px)`,
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onOpenEvent(e)
                      }}
                    >
                      <span className="time-event-title">{e.title}</span>
                      <span className="time-event-time">{displayTime(e.startTime)}</span>
                    </button>
                  )
                })}
                {key === today && (
                  <div className="now-line" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }} aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function useNowMinutes(): number {
  const get = () => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  }
  const [mins, setMins] = useState(get)
  useEffect(() => {
    const id = window.setInterval(() => setMins(get()), 30_000)
    return () => window.clearInterval(id)
  }, [])
  return mins
}

/** Places overlapping events side by side. */
function layoutColumns(events: Occurrence[]): { event: Occurrence; col: number; cols: number }[] {
  const sorted = [...events].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime) || toMinutes(b.endTime) - toMinutes(a.endTime),
  )
  const out: { event: Occurrence; col: number; cols: number }[] = []
  let cluster: { event: Occurrence; col: number; cols: number }[] = []
  let colEnds: number[] = []
  let clusterEnd = -1

  const finish = () => {
    for (const item of cluster) item.cols = colEnds.length
    out.push(...cluster)
    cluster = []
    colEnds = []
  }

  for (const e of sorted) {
    const start = toMinutes(e.startTime)
    const end = Math.max(toMinutes(e.endTime), start + 15)
    if (start >= clusterEnd && cluster.length) finish()
    let col = colEnds.findIndex((colEnd) => colEnd <= start)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(end)
    } else colEnds[col] = end
    cluster.push({ event: e, col, cols: 1 })
    clusterEnd = Math.max(clusterEnd, end)
  }
  if (cluster.length) finish()
  return out
}
