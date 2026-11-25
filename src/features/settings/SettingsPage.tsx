import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDialogs } from '../../components/dialogs'
import { ChevronLeftIcon } from '../../components/Icons'
import { NavBar } from '../../components/NavBar'
import { exportBackup, importBackup } from '../../db/backup'
import { isStoragePersistent, requestPersistentStorage } from '../../db/persistence'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { confirm, alert } = useDialogs()
  const fileRef = useRef<HTMLInputElement>(null)
  const [persistent, setPersistent] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void isStoragePersistent().then(setPersistent)
  }, [])

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  const handleExport = async () => {
    setBusy(true)
    try {
      await exportBackup()
    } finally {
      setBusy(false)
    }
  }

  const handleImportFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    const ok = await confirm({
      title: 'Restore from Backup?',
      message: 'This replaces everything currently in the app with the contents of the backup.',
      confirmLabel: 'Restore',
      destructive: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      const count = await importBackup(file)
      await alert({ title: 'Restore Complete', message: `${count} item${count === 1 ? '' : 's'} restored.` })
    } catch (err) {
      await alert({ title: 'Couldn’t Restore', message: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page settings-page">
      <NavBar
        left={
          <button type="button" className="back-button" onClick={goBack}>
            <ChevronLeftIcon size={22} />
            <span>Back</span>
          </button>
        }
        title="Settings"
      />
      <div className="page-scroll">
        <section className="list-section">
          <h2 className="list-section-header">Backup</h2>
          <ul className="grouped-list">
            <li>
              <button type="button" className="list-button" disabled={busy} onClick={handleExport}>
                Export Backup…
              </button>
            </li>
            <li>
              <button type="button" className="list-button" disabled={busy} onClick={() => fileRef.current?.click()}>
                Restore from Backup…
              </button>
            </li>
          </ul>
          <p className="list-section-footer">
            Everything is stored only on this device. Export a backup now and then and save it to Files or iCloud Drive.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => handleImportFile(e.target.files?.[0])}
          />
        </section>

        <section className="list-section">
          <h2 className="list-section-header">Storage</h2>
          <ul className="grouped-list">
            <li className="list-value-row">
              <span>Protected from clean-up</span>
              <span className="list-value">{persistent === null ? 'Unknown' : persistent ? 'Yes' : 'No'}</span>
            </li>
            {persistent === false && (
              <li>
                <button
                  type="button"
                  className="list-button"
                  onClick={async () => setPersistent(await requestPersistentStorage())}
                >
                  Request Permanent Storage
                </button>
              </li>
            )}
          </ul>
          <p className="list-section-footer">
            Add the app to your Home Screen so the system keeps its data permanently.
          </p>
        </section>
      </div>
    </div>
  )
}
