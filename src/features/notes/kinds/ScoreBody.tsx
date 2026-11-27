import { format } from 'date-fns'
import { enAU } from 'date-fns/locale'
import { useDialogs } from '../../../components/dialogs'
import { XCircleFillIcon } from '../../../components/Icons'
import { newId } from '../../../db/db'
import { scoreTotals } from './registry'
import type { BodyProps, ScoreData, ScorePlayer } from './types'

/** Game scoreboard: players across, rounds down, running totals and a leader. */
export function ScoreBody({ data, onChange }: BodyProps<ScoreData>) {
  const { prompt, choose, confirm } = useDialogs()
  const totals = scoreTotals(data)
  const played = data.rounds.some((r) => Object.values(r).some((v) => v !== ''))
  const best = played ? (data.lowWins ? Math.min(...totals) : Math.max(...totals)) : null
  const leaders = best === null ? [] : data.players.filter((_, i) => totals[i] === best).map((p) => p.id)

  const setScore = (round: number, playerId: string, value: string) =>
    onChange({ ...data, rounds: data.rounds.map((r, i) => (i === round ? { ...r, [playerId]: value } : r)) })

  const addPlayer = async () => {
    const name = await prompt({ title: 'Add Player', placeholder: 'Name', confirmLabel: 'Add' })
    if (name?.trim()) onChange({ ...data, players: [...data.players, { id: newId(), name: name.trim() }] })
  }
  const playerMenu = async (p: ScorePlayer) => {
    const c = await choose({
      title: p.name,
      options: [
        { label: 'Rename', value: 'rename' },
        { label: 'Remove Player', value: 'remove', destructive: true },
      ],
    })
    if (c === 'rename') {
      const name = await prompt({ title: 'Rename Player', initialValue: p.name, confirmLabel: 'Save' })
      if (name?.trim()) onChange({ ...data, players: data.players.map((x) => (x.id === p.id ? { ...x, name: name.trim() } : x)) })
    } else if (c === 'remove') {
      onChange({
        ...data,
        players: data.players.filter((x) => x.id !== p.id),
        rounds: data.rounds.map((r) => {
          const next = { ...r }
          delete next[p.id]
          return next
        }),
      })
    }
  }
  const removeRound = (index: number) =>
    onChange({ ...data, rounds: data.rounds.length > 1 ? data.rounds.filter((_, i) => i !== index) : [{}] })

  const newGame = async () => {
    const ok = await confirm({
      title: 'Start a New Game?',
      message: played ? 'This game will be saved to the history below and the scores cleared.' : 'The scores will be cleared.',
      confirmLabel: 'New Game',
    })
    if (!ok) return
    const history = played
      ? [
          {
            id: newId(),
            date: Date.now(),
            scores: data.players.map((p, i) => ({ name: p.name, total: totals[i] })),
            winner: data.players.filter((p) => leaders.includes(p.id)).map((p) => p.name).join(' & '),
          },
          ...data.history,
        ]
      : data.history
    onChange({ ...data, rounds: [{}], history })
  }

  const cols = `36px repeat(${data.players.length}, minmax(60px, 1fr)) 28px`

  return (
    <div className="nt-score">
      {/* Totals */}
      <div className="nt-score-grid nt-score-head" style={{ gridTemplateColumns: cols }}>
        <span />
        {data.players.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={'nt-player' + (leaders.includes(p.id) ? ' lead' : '')}
            aria-label={`${p.name}: ${totals[i]}${leaders.includes(p.id) ? ', leading' : ''}`}
            onClick={() => playerMenu(p)}
          >
            <span className="nt-player-name">{p.name}</span>
            <span className="nt-player-total" data-testid={`total-${p.name}`}>
              {totals[i]}
            </span>
            <span className="nt-player-lead">{leaders.includes(p.id) ? (leaders.length > 1 ? 'Tied' : 'Leads') : ' '}</span>
          </button>
        ))}
        <span />
      </div>

      {/* Rounds */}
      {data.rounds.map((r, ri) => (
        <div key={ri} className="nt-score-grid nt-score-row" style={{ gridTemplateColumns: cols }}>
          <span className="nt-round">R{ri + 1}</span>
          {data.players.map((p) => (
            <input
              key={p.id}
              className="nt-score-input"
              size={1}
              inputMode="decimal"
              aria-label={`Round ${ri + 1}, ${p.name}`}
              value={r[p.id] ?? ''}
              onChange={(e) => setScore(ri, p.id, e.target.value.replace(/[^0-9.\-]/g, ''))}
            />
          ))}
          <button type="button" className="nt-x" aria-label={`Delete round ${ri + 1}`} onClick={() => removeRound(ri)}>
            <XCircleFillIcon size={15} />
          </button>
        </div>
      ))}

      <div className="nt-actions">
        <button type="button" onClick={() => onChange({ ...data, rounds: [...data.rounds, {}] })}>
          + Round
        </button>
        <button type="button" onClick={addPlayer}>
          + Player
        </button>
        <button type="button" onClick={() => onChange({ ...data, lowWins: !data.lowWins })} aria-label="Change how the winner is decided">
          {data.lowWins ? 'Lowest wins' : 'Highest wins'}
        </button>
        <button type="button" onClick={newGame}>
          New game
        </button>
      </div>

      {data.history.length > 0 && (
        <section aria-label="Past games">
          <div className="nt-section-head">
            <span className="nt-label">Past games</span>
          </div>
          <ul className="nt-rows">
            {data.history.map((g) => (
              <li key={g.id}>
                <div className="nt-row">
                  <span className="nt-entry-date">{format(g.date, 'd MMM', { locale: enAU })}</span>
                  <span className="nt-row-text">
                    <span className="nt-row-title">{g.winner ? `${g.winner} won` : 'No winner'}</span>
                    <span className="nt-row-sub">{g.scores.map((s) => `${s.name} ${s.total}`).join(' · ')}</span>
                  </span>
                  <button
                    type="button"
                    className="nt-x"
                    aria-label="Delete game"
                    onClick={() => onChange({ ...data, history: data.history.filter((x) => x.id !== g.id) })}
                  >
                    <XCircleFillIcon size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
