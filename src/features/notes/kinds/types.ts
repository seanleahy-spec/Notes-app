/** The kinds of note you can create. "note" is the original rich-text note. */
export type NoteType = 'note' | 'table' | 'money' | 'list' | 'score' | 'draft' | 'plan'

// ---------- Table ----------
export type ColumnType = 'text' | 'number' | 'date' | 'check'
export interface TableColumn {
  id: string
  name: string
  type: ColumnType
}
export interface TableRow {
  id: string
  cells: Record<string, string | boolean>
}
export interface TableData {
  columns: TableColumn[]
  rows: TableRow[]
  totals: boolean
}

// ---------- Money ----------
export interface MoneyEntry {
  id: string
  date: string // yyyy-MM-dd
  desc: string
  amount: number // positive = in, negative = out
}
export interface MoneyAccount {
  id: string
  name: string
  entries: MoneyEntry[]
}
export interface Debt {
  id: string
  dir: 'owed' | 'owe' // owed = someone owes me; owe = I owe someone
  person: string
  amount: number
  reason: string
  date: string
  settled: boolean
}
export interface MoneyData {
  currency: string
  accounts: MoneyAccount[]
  debts: Debt[]
}

// ---------- List ----------
export type ListTemplate = 'general' | 'movies' | 'books' | 'places' | 'food'
export interface ListItem {
  id: string
  text: string
  done: boolean
  rating: number // 0-5
  note: string
  tag: string
  addedAt: number
}
export interface ListData {
  template: ListTemplate
  items: ListItem[]
  sort: 'added' | 'az'
}

// ---------- Scoreboard ----------
export interface ScorePlayer {
  id: string
  name: string
}
export interface ScoreGame {
  id: string
  date: number
  scores: { name: string; total: number }[]
  winner: string
}
export interface ScoreData {
  players: ScorePlayer[]
  /** One map per round: playerId -> score as typed. */
  rounds: Record<string, string>[]
  lowWins: boolean
  history: ScoreGame[]
}

// ---------- Draft ----------
export interface DraftData {
  to: string
  subject: string
  body: string
  sentAt: number | null
}

// ---------- Plan ----------
export interface PlanStep {
  id: string
  text: string
  done: boolean
  due: string // yyyy-MM-dd or ''
  note: string
  /** Linked calendar event, if the step was added to the calendar. */
  eventId: string | null
}
export interface PlanData {
  steps: PlanStep[]
}

export interface BodyProps<T> {
  data: T
  onChange: (data: T) => void
  /** The note's title (used e.g. when adding plan steps to the calendar). */
  title: string
}
