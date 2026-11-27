import type { ReactElement } from 'react'
import {
  ChecklistIcon,
  MailIcon,
  MoneyIcon,
  NotesIcon,
  PlanIcon,
  ScoreIcon,
  TableIcon,
} from '../../../components/Icons'
import { newId } from '../../../db/db'
import { formatMoney, moneyTotals } from './money'
import type { DraftData, ListData, MoneyData, NoteType, PlanData, ScoreData, TableData } from './types'

export interface NoteKind {
  type: NoteType
  label: string
  description: string
  icon: (p: { size?: number }) => ReactElement
  /** Starting content for a new note of this kind (not used for "note"). */
  initial: () => unknown
  /** Plain text used for search and the list preview. */
  summary: (data: unknown) => string
}

const nonEmpty = (parts: (string | undefined | false)[]) => parts.filter(Boolean).join('\n')

export function scoreTotals(d: ScoreData): number[] {
  return d.players.map((p) => d.rounds.reduce((s, r) => s + (parseFloat(r[p.id]) || 0), 0))
}

export const NOTE_KINDS: NoteKind[] = [
  {
    type: 'note',
    label: 'Note',
    description: 'Text with headings, lists and checklists',
    icon: NotesIcon,
    initial: () => null,
    summary: () => '',
  },
  {
    type: 'table',
    label: 'Table',
    description: 'Rows and columns, like a spreadsheet',
    icon: TableIcon,
    initial: (): TableData => {
      const columns = [1, 2, 3].map(() => ({ id: newId(), name: '', type: 'text' as const }))
      return { columns, rows: [1, 2, 3].map(() => ({ id: newId(), cells: {} })), totals: false }
    },
    summary: (raw) => {
      const d = raw as TableData
      const head = d.columns.map((c) => c.name).filter(Boolean).join(' · ')
      const rows = d.rows
        .map((r) => d.columns.map((c) => (typeof r.cells[c.id] === 'string' ? r.cells[c.id] : '')).filter(Boolean).join(' · '))
        .filter(Boolean)
      return nonEmpty([head, ...rows])
    },
  },
  {
    type: 'money',
    label: 'Money',
    description: 'Accounts, cash, who owes who',
    icon: MoneyIcon,
    initial: (): MoneyData => ({ currency: 'AUD', accounts: [], debts: [] }),
    summary: (raw) => {
      const d = raw as MoneyData
      if (!d.accounts.length && !d.debts.length) return ''
      const t = moneyTotals(d)
      return nonEmpty([
        `Net ${formatMoney(t.net, d.currency)}`,
        ...d.accounts.map((a) => a.name),
        ...d.debts.map((x) => `${x.person} ${x.reason}`),
      ])
    },
  },
  {
    type: 'list',
    label: 'List',
    description: 'Movies, books, places: tick off as you go',
    icon: ChecklistIcon,
    initial: (): ListData => ({ template: 'general', items: [], sort: 'added' }),
    summary: (raw) => {
      const d = raw as ListData
      return nonEmpty([d.items.map((i) => i.text).join(', '), ...d.items.map((i) => `${i.tag} ${i.note}`.trim())])
    },
  },
  {
    type: 'score',
    label: 'Scoreboard',
    description: 'Keep score of a game, round by round',
    icon: ScoreIcon,
    initial: (): ScoreData => {
      const players = ['Player 1', 'Player 2'].map((name) => ({ id: newId(), name }))
      return { players, rounds: [{}], lowWins: false, history: [] }
    },
    summary: (raw) => {
      const d = raw as ScoreData
      const totals = scoreTotals(d)
      const played = d.rounds.some((r) => Object.values(r).some((v) => v !== ''))
      if (!played && !d.history.length) return ''
      if (!played) {
        const last = d.history[0]
        return `Last game: ${last.winner ? `${last.winner} won` : 'no winner'}\n${last.scores.map((x) => `${x.name} ${x.total}`).join(' · ')}`
      }
      return d.players.map((p, i) => `${p.name} ${totals[i]}`).join(' · ')
    },
  },
  {
    type: 'draft',
    label: 'Draft',
    description: 'Prepare an email or message',
    icon: MailIcon,
    initial: (): DraftData => ({ to: '', subject: '', body: '', sentAt: null }),
    summary: (raw) => {
      const d = raw as DraftData
      return nonEmpty([d.subject, d.body, d.to])
    },
  },
  {
    type: 'plan',
    label: 'Plan',
    description: 'Step-by-step, with progress and due dates',
    icon: PlanIcon,
    initial: (): PlanData => ({ steps: [] }),
    summary: (raw) => {
      const d = raw as PlanData
      if (!d.steps.length) return ''
      const done = d.steps.filter((s) => s.done).length
      return nonEmpty([`${done} of ${d.steps.length} done`, d.steps.map((s) => s.text).join(', ')])
    },
  },
]

export const kindOf = (type: NoteType | undefined) => NOTE_KINDS.find((k) => k.type === (type ?? 'note')) ?? NOTE_KINDS[0]
