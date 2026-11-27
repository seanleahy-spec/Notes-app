import { format } from 'date-fns'
import { enAU } from 'date-fns/locale'
import { useState } from 'react'
import { useDialogs } from '../../../components/dialogs'
import { ChevronDownIcon, XCircleFillIcon } from '../../../components/Icons'
import { newId } from '../../../db/db'
import { accountBalance, CURRENCIES, formatMoney, moneyTotals } from './money'
import type { BodyProps, Debt, MoneyAccount, MoneyData } from './types'

const today = () => format(new Date(), 'yyyy-MM-dd')
const shortDate = (d: string) => format(new Date(d + 'T00:00:00'), 'd MMM', { locale: enAU })
const parseAmount = (s: string) => {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''))
  return isNaN(n) ? null : n
}

/** Money tracker: accounts with an in/out history, plus who owes who. */
export function MoneyBody({ data, onChange }: BodyProps<MoneyData>) {
  const { prompt, choose, confirm } = useDialogs()
  const [openAccount, setOpenAccount] = useState<string | null>(null)
  const t = moneyTotals(data)
  const fmt = (n: number) => formatMoney(n, data.currency)

  const setAccounts = (accounts: MoneyAccount[]) => onChange({ ...data, accounts })
  const setDebts = (debts: Debt[]) => onChange({ ...data, debts })

  const addAccount = async () => {
    const name = await prompt({ title: 'New Account', placeholder: 'e.g. Bank, Cash, Savings', confirmLabel: 'Next' })
    if (!name?.trim()) return
    const start = await prompt({ title: `Starting balance for ${name.trim()}`, placeholder: '0.00', initialValue: '', confirmLabel: 'Add' })
    const amount = parseAmount(start ?? '') ?? 0
    const account: MoneyAccount = {
      id: newId(),
      name: name.trim(),
      entries: amount ? [{ id: newId(), date: today(), desc: 'Starting balance', amount }] : [],
    }
    setAccounts([...data.accounts, account])
    setOpenAccount(account.id)
  }

  const accountMenu = async (a: MoneyAccount) => {
    const c = await choose({
      title: a.name,
      options: [
        { label: 'Rename Account', value: 'rename' },
        { label: 'Delete Account', value: 'delete', destructive: true },
      ],
    })
    if (c === 'rename') {
      const name = await prompt({ title: 'Rename Account', initialValue: a.name, confirmLabel: 'Save' })
      if (name?.trim()) setAccounts(data.accounts.map((x) => (x.id === a.id ? { ...x, name: name.trim() } : x)))
    } else if (c === 'delete') {
      if (await confirm({ title: `Delete “${a.name}”?`, message: 'Its history will be removed too.', confirmLabel: 'Delete', destructive: true }))
        setAccounts(data.accounts.filter((x) => x.id !== a.id))
    }
  }

  const currencyLabel = data.currency

  return (
    <div className="nt-money">
      {/* Summary */}
      <section className="nt-money-summary" aria-label="Summary">
        <div className="nt-label">Where you stand</div>
        <div className={'nt-money-net' + (t.net < 0 ? ' neg' : '')} data-testid="money-net">
          {fmt(t.net)}
        </div>
        <div className="nt-money-stats">
          <span>
            <i>Accounts</i>
            {fmt(t.accounts)}
          </span>
          <span>
            <i>Owed to me</i>
            {fmt(t.owed)}
          </span>
          <span>
            <i>I owe</i>
            {fmt(t.owe)}
          </span>
        </div>
        <label className="nt-currency">
          <span>Currency</span>
          <select value={data.currency} aria-label="Currency" onChange={(e) => onChange({ ...data, currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDownIcon size={12} />
        </label>
      </section>

      {/* Accounts */}
      <section aria-label="Accounts">
        <div className="nt-section-head">
          <span className="nt-label">Accounts</span>
          <button type="button" className="nt-link" onClick={addAccount}>
            + Add
          </button>
        </div>
        {data.accounts.length === 0 && <p className="nt-empty">No accounts yet: add Bank, Cash, Savings…</p>}
        <ul className="nt-rows">
          {data.accounts.map((a) => {
            const open = openAccount === a.id
            return (
              <li key={a.id} className={open ? 'open' : ''}>
                <div className="nt-row">
                  <button type="button" className="nt-row-main" aria-expanded={open} onClick={() => setOpenAccount(open ? null : a.id)}>
                    <span className="nt-row-title">{a.name}</span>
                    <span className="nt-row-amount">{fmt(accountBalance(a.entries))}</span>
                  </button>
                  <button type="button" className="nt-more" aria-label={`Options for ${a.name}`} onClick={() => accountMenu(a)}>
                    ···
                  </button>
                </div>
                {open && (
                  <AccountDetail
                    account={a}
                    currency={currencyLabel}
                    onChange={(acc) => setAccounts(data.accounts.map((x) => (x.id === acc.id ? acc : x)))}
                  />
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <DebtSection title="Owed to me" dir="owed" data={data} setDebts={setDebts} fmt={fmt} />
      <DebtSection title="I owe" dir="owe" data={data} setDebts={setDebts} fmt={fmt} />
    </div>
  )
}

function AccountDetail({
  account,
  currency,
  onChange,
}: {
  account: MoneyAccount
  currency: string
  onChange: (a: MoneyAccount) => void
}) {
  const [dir, setDir] = useState<'in' | 'out'>('out')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const value = parseAmount(amount)

  const add = () => {
    if (!value) return
    const signed = Math.abs(value) * (dir === 'in' ? 1 : -1)
    onChange({ ...account, entries: [{ id: newId(), date: today(), desc: desc.trim(), amount: signed }, ...account.entries] })
    setAmount('')
    setDesc('')
  }

  return (
    <div className="nt-detail">
      <div className="nt-entry-form">
        <div className="nt-toggle" role="group" aria-label="Money in or out">
          <button type="button" aria-pressed={dir === 'in'} className={dir === 'in' ? 'on' : ''} onClick={() => setDir('in')}>
            In
          </button>
          <button type="button" aria-pressed={dir === 'out'} className={dir === 'out' ? 'on' : ''} onClick={() => setDir('out')}>
            Out
          </button>
        </div>
        <input
          className="nt-input amount"
          inputMode="decimal"
          placeholder="0.00"
          aria-label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="nt-input"
          placeholder="What for?"
          aria-label="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" className="nt-link" disabled={!value} onClick={add}>
          Add
        </button>
      </div>
      {account.entries.length === 0 ? (
        <p className="nt-empty">No transactions yet.</p>
      ) : (
        <ul className="nt-entries">
          {account.entries.map((e) => (
            <li key={e.id}>
              <span className="nt-entry-date">{shortDate(e.date)}</span>
              <span className="nt-entry-desc">{e.desc || (e.amount >= 0 ? 'Money in' : 'Money out')}</span>
              <span className={'nt-entry-amt' + (e.amount < 0 ? ' neg' : '')}>
                {e.amount >= 0 ? '+' : '−'}
                {formatMoney(Math.abs(e.amount), currency)}
              </span>
              <button
                type="button"
                className="nt-x"
                aria-label={`Delete ${e.desc || 'transaction'}`}
                onClick={() => onChange({ ...account, entries: account.entries.filter((x) => x.id !== e.id) })}
              >
                <XCircleFillIcon size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DebtSection({
  title,
  dir,
  data,
  setDebts,
  fmt,
}: {
  title: string
  dir: Debt['dir']
  data: MoneyData
  setDebts: (d: Debt[]) => void
  fmt: (n: number) => string
}) {
  const [adding, setAdding] = useState(false)
  const [showSettled, setShowSettled] = useState(false)
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const mine = data.debts.filter((d) => d.dir === dir)
  const open = mine.filter((d) => !d.settled)
  const settled = mine.filter((d) => d.settled)
  const value = parseAmount(amount)

  const add = () => {
    if (!person.trim() || !value) return
    setDebts([...data.debts, { id: newId(), dir, person: person.trim(), amount: Math.abs(value), reason: reason.trim(), date: today(), settled: false }])
    setPerson('')
    setAmount('')
    setReason('')
    setAdding(false)
  }
  const toggle = (id: string) => setDebts(data.debts.map((d) => (d.id === id ? { ...d, settled: !d.settled } : d)))
  const remove = (id: string) => setDebts(data.debts.filter((d) => d.id !== id))

  const row = (d: Debt) => (
    <li key={d.id} className={d.settled ? 'settled' : ''}>
      <div className="nt-row">
        <button
          type="button"
          role="checkbox"
          aria-checked={d.settled}
          aria-label={`Mark ${d.person} ${d.settled ? 'unpaid' : 'paid'}`}
          className={'nt-check' + (d.settled ? ' on' : '')}
          onClick={() => toggle(d.id)}
        />
        <span className="nt-row-text">
          <span className="nt-row-title">{d.person}</span>
          <span className="nt-row-sub">
            {d.reason ? `${d.reason} · ` : ''}
            {shortDate(d.date)}
          </span>
        </span>
        <span className="nt-row-amount">{fmt(d.amount)}</span>
        {d.settled && (
          <button type="button" className="nt-x" aria-label={`Delete ${d.person}`} onClick={() => remove(d.id)}>
            <XCircleFillIcon size={15} />
          </button>
        )}
      </div>
    </li>
  )

  return (
    <section aria-label={title}>
      <div className="nt-section-head">
        <span className="nt-label">{title}</span>
        <button type="button" className="nt-link" onClick={() => setAdding((a) => !a)}>
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>
      {adding && (
        <div className="nt-debt-form">
          <input className="nt-input" placeholder="Who?" aria-label="Person" value={person} onChange={(e) => setPerson(e.target.value)} autoFocus />
          <input className="nt-input amount" inputMode="decimal" placeholder="0.00" aria-label="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input
            className="nt-input wide"
            placeholder="What for? (optional)"
            aria-label="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button type="button" className="nt-link" disabled={!person.trim() || !value} onClick={add}>
            Add
          </button>
        </div>
      )}
      {open.length === 0 && !adding && <p className="nt-empty">{dir === 'owed' ? 'Nobody owes you anything.' : "You don't owe anyone."}</p>}
      <ul className="nt-rows">{open.map(row)}</ul>
      {settled.length > 0 && (
        <>
          <button type="button" className="nt-settled-toggle" aria-expanded={showSettled} onClick={() => setShowSettled((s) => !s)}>
            Settled ({settled.length})
          </button>
          {showSettled && <ul className="nt-rows">{settled.map(row)}</ul>}
        </>
      )}
    </section>
  )
}
