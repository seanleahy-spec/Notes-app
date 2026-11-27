import { useDialogs } from '../../../components/dialogs'
import { ChevronDownIcon, XCircleFillIcon } from '../../../components/Icons'
import { newId } from '../../../db/db'
import type { BodyProps, ColumnType, TableColumn, TableData } from './types'

const TYPE_LABELS: Record<ColumnType, string> = { text: 'Text', number: 'Number', date: 'Date', check: 'Tick-box' }

const num = (v: unknown) => (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : null)

function formatNumber(n: number) {
  return new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 }).format(n)
}

/** Spreadsheet-style grid: named columns (text / number / date / tick-box), rows, optional totals. */
export function TableBody({ data, onChange }: BodyProps<TableData>) {
  const { choose, confirm } = useDialogs()
  const { columns, rows } = data

  const setCell = (rowId: string, colId: string, value: string | boolean) =>
    onChange({ ...data, rows: rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r)) })
  const renameColumn = (colId: string, name: string) =>
    onChange({ ...data, columns: columns.map((c) => (c.id === colId ? { ...c, name } : c)) })
  const addRow = () => onChange({ ...data, rows: [...rows, { id: newId(), cells: {} }] })
  const addColumn = () => onChange({ ...data, columns: [...columns, { id: newId(), name: '', type: 'text' }] })
  const deleteRow = async (rowId: string, index: number) => {
    const row = rows.find((r) => r.id === rowId)
    const hasContent = row && Object.values(row.cells).some((v) => v !== '' && v !== false)
    if (hasContent && !(await confirm({ title: `Delete row ${index + 1}?`, confirmLabel: 'Delete', destructive: true }))) return
    onChange({ ...data, rows: rows.filter((r) => r.id !== rowId) })
  }

  const columnMenu = async (col: TableColumn, index: number) => {
    const name = col.name || `Column ${index + 1}`
    const choice = await choose({
      title: name,
      message: `Currently: ${TYPE_LABELS[col.type]}`,
      options: [
        { label: 'Sort A → Z', value: 'asc' },
        { label: 'Sort Z → A', value: 'desc' },
        ...(Object.keys(TYPE_LABELS) as ColumnType[])
          .filter((t) => t !== col.type)
          .map((t) => ({ label: `Make ${TYPE_LABELS[t]} Column`, value: `type:${t}` })),
        { label: 'Delete Column', value: 'delete', destructive: true },
      ],
    })
    if (!choice) return
    if (choice === 'asc' || choice === 'desc') {
      const dir = choice === 'asc' ? 1 : -1
      const key = (v: unknown) => (col.type === 'check' ? (v ? 1 : 0) : col.type === 'number' ? (num(v) ?? -Infinity) : String(v ?? '').toLowerCase())
      const sorted = [...rows].sort((a, b) => {
        const x = key(a.cells[col.id])
        const y = key(b.cells[col.id])
        return (x < y ? -1 : x > y ? 1 : 0) * dir
      })
      onChange({ ...data, rows: sorted })
    } else if (choice.startsWith('type:')) {
      const type = choice.slice(5) as ColumnType
      onChange({ ...data, columns: columns.map((c) => (c.id === col.id ? { ...c, type } : c)) })
    } else if (choice === 'delete') {
      if (!(await confirm({ title: `Delete “${name}”?`, message: 'Everything in this column will be removed.', confirmLabel: 'Delete', destructive: true }))) return
      onChange({
        ...data,
        columns: columns.filter((c) => c.id !== col.id),
        rows: rows.map((r) => {
          const cells = { ...r.cells }
          delete cells[col.id]
          return { ...r, cells }
        }),
      })
    }
  }

  const totals = columns.map((c) => {
    if (c.type === 'number') return formatNumber(rows.reduce((s, r) => s + (num(r.cells[c.id]) ?? 0), 0))
    if (c.type === 'check') return `${rows.filter((r) => r.cells[c.id] === true).length} / ${rows.length}`
    return ''
  })

  return (
    <div className="nt-table-body">
      <div className="nt-table-wrap">
        <table className="nt-table">
          <thead>
            <tr>
              <th className="nt-rownum" aria-hidden="true" />
              {columns.map((c, i) => (
                <th key={c.id} className={`col-${c.type}`}>
                  <div className="nt-th">
                    <input
                      size={1}
                      value={c.name}
                      placeholder={`Column ${i + 1}`}
                      aria-label={`Column ${i + 1} name`}
                      onChange={(e) => renameColumn(c.id, e.target.value)}
                    />
                    <button type="button" className="nt-th-menu" aria-label={`Options for column ${i + 1}`} onClick={() => columnMenu(c, i)}>
                      <ChevronDownIcon size={14} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="nt-rowdel" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.id}>
                <td className="nt-rownum">{ri + 1}</td>
                {columns.map((c, ci) => {
                  const v = r.cells[c.id]
                  const label = `Row ${ri + 1}, ${c.name || `column ${ci + 1}`}`
                  return (
                    <td key={c.id} className={`col-${c.type}`}>
                      {c.type === 'check' ? (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={v === true}
                          aria-label={label}
                          className={'nt-check' + (v === true ? ' on' : '')}
                          onClick={() => setCell(r.id, c.id, v !== true)}
                        />
                      ) : (
                        <input
                          size={1}
                          type={c.type === 'date' ? 'date' : 'text'}
                          inputMode={c.type === 'number' ? 'decimal' : undefined}
                          value={typeof v === 'string' ? v : ''}
                          aria-label={label}
                          onChange={(e) => setCell(r.id, c.id, e.target.value)}
                        />
                      )}
                    </td>
                  )
                })}
                <td className="nt-rowdel">
                  <button type="button" aria-label={`Delete row ${ri + 1}`} onClick={() => deleteRow(r.id, ri)}>
                    <XCircleFillIcon size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {data.totals && (
            <tfoot>
              <tr>
                <td className="nt-rownum">Σ</td>
                {totals.map((t, i) => (
                  <td key={columns[i].id} className={`col-${columns[i].type}`} data-testid={`total-${i}`}>
                    {t}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="nt-actions">
        <button type="button" onClick={addRow}>+ Row</button>
        <button type="button" onClick={addColumn}>+ Column</button>
        <button type="button" aria-pressed={data.totals} className={data.totals ? 'on' : ''} onClick={() => onChange({ ...data, totals: !data.totals })}>
          Totals
        </button>
      </div>
    </div>
  )
}
