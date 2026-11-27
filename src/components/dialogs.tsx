import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Apple-style alert dialogs with a promise-based API:
 *   const { confirm, prompt } = useDialogs()
 *   if (await confirm({ title: 'Delete?', destructive: true })) ...
 *   const name = await prompt({ title: 'Rename', initialValue: 'x' })
 */
interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}
interface PromptOptions {
  title: string
  message?: string
  initialValue?: string
  placeholder?: string
  confirmLabel?: string
}
interface ChooseOptions<T extends string> {
  title: string
  message?: string
  options: { label: string; value: T; destructive?: boolean }[]
}
interface DialogApi {
  /** Several stacked choices plus Cancel. Resolves to the chosen value, or null. */
  choose: <T extends string>(o: ChooseOptions<T>) => Promise<T | null>
  confirm: (o: ConfirmOptions) => Promise<boolean>
  prompt: (o: PromptOptions) => Promise<string | null>
  alert: (o: { title: string; message?: string }) => Promise<void>
}

type Pending =
  | { kind: 'choose'; options: ChooseOptions<string>; resolve: (v: string | null) => void }
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (v: string | null) => void }
  | { kind: 'alert'; options: { title: string; message?: string }; resolve: () => void }

const DialogContext = createContext<DialogApi | null>(null)

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used inside DialogProvider')
  return ctx
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const api: DialogApi = {
    choose: useCallback(
      <T extends string>(options: ChooseOptions<T>) =>
        new Promise<T | null>((resolve) =>
          setPending({ kind: 'choose', options, resolve: resolve as (v: string | null) => void }),
        ),
      [],
    ),
    confirm: useCallback((options) => new Promise((resolve) => setPending({ kind: 'confirm', options, resolve })), []),
    prompt: useCallback((options) => new Promise((resolve) => setPending({ kind: 'prompt', options, resolve })), []),
    alert: useCallback((options) => new Promise((resolve) => setPending({ kind: 'alert', options, resolve })), []),
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      {pending && <DialogView pending={pending} onDone={() => setPending(null)} />}
    </DialogContext.Provider>
  )
}

function DialogView({ pending, onDone }: { pending: Pending; onDone: () => void }) {
  const [value, setValue] = useState(pending.kind === 'prompt' ? (pending.options.initialValue ?? '') : '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pending.kind === 'prompt') {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [pending.kind])

  const cancel = () => {
    if (pending.kind === 'choose') pending.resolve(null)
    else if (pending.kind === 'confirm') pending.resolve(false)
    else if (pending.kind === 'prompt') pending.resolve(null)
    else pending.resolve()
    onDone()
  }
  const accept = () => {
    if (pending.kind === 'choose') return
    if (pending.kind === 'confirm') pending.resolve(true)
    else if (pending.kind === 'prompt') pending.resolve(value)
    else pending.resolve()
    onDone()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const o = pending.options
  const destructive = pending.kind === 'confirm' && pending.options.destructive
  const confirmLabel =
    pending.kind === 'alert' ? 'OK' : (pending.options as ConfirmOptions).confirmLabel ?? 'OK'

  return (
    <div className="dialog-backdrop theme-minimal" onClick={cancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={o.title} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-body">
          <h2>{o.title}</h2>
          {o.message && <p>{o.message}</p>}
          {pending.kind === 'prompt' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                accept()
              }}
            >
              <input
                ref={inputRef}
                className="dialog-input"
                value={value}
                placeholder={pending.options.placeholder}
                onChange={(e) => setValue(e.target.value)}
              />
            </form>
          )}
        </div>
        {pending.kind === 'choose' ? (
          <div className="dialog-actions stacked">
            {pending.options.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={opt.destructive ? 'destructive' : undefined}
                onClick={() => {
                  pending.resolve(opt.value)
                  onDone()
                }}
              >
                {opt.label}
              </button>
            ))}
            <button type="button" className="primary" onClick={cancel}>
              Cancel
            </button>
          </div>
        ) : (
        <div className={'dialog-actions' + (pending.kind === 'alert' ? ' single' : '')}>
          {pending.kind !== 'alert' && (
            <button type="button" onClick={cancel}>
              {pending.kind === 'confirm' ? (pending.options.cancelLabel ?? 'Cancel') : 'Cancel'}
            </button>
          )}
          <button type="button" className={destructive ? 'destructive' : 'primary'} onClick={accept}>
            {confirmLabel}
          </button>
        </div>
        )}
      </div>
    </div>
  )
}
