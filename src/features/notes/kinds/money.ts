import type { MoneyData } from './types'

export const CURRENCIES = ['AUD', 'AED', 'USD', 'EUR', 'GBP', 'NZD', 'CAD', 'JPY', 'SGD', 'INR']

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export const accountBalance = (entries: { amount: number }[]) => entries.reduce((s, e) => s + e.amount, 0)

export function moneyTotals(d: MoneyData) {
  const accounts = d.accounts.reduce((s, a) => s + accountBalance(a.entries), 0)
  const owed = d.debts.filter((x) => x.dir === 'owed' && !x.settled).reduce((s, x) => s + x.amount, 0)
  const owe = d.debts.filter((x) => x.dir === 'owe' && !x.settled).reduce((s, x) => s + x.amount, 0)
  return { accounts, owed, owe, net: accounts + owed - owe }
}
