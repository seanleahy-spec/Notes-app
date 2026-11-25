# Productivity

A personal, offline-first productivity app (Notes, Calendar, Whiteboards) built as an
installable web app (PWA). All data is stored on the device in IndexedDB.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run build      # production build into dist/
npm run preview    # serve the build on http://localhost:4173
npm run test:notes # end-to-end test (needs `npm run preview` running)
```

## Project layout

```
src/
  app/          App shell: tab registry (tabs.tsx), tab bar, routing, viewport handling
  components/   Shared UI: nav bar, dialogs, menus, swipe rows, icons
  db/           On-device database (Dexie/IndexedDB), backup export/import
  features/
    notes/      Notes tab
    calendar/   Calendar tab
    whiteboards/Whiteboards tab
    settings/   Settings (backup/restore)
```

## Adding a new tab

1. Create `src/features/<name>/<Name>Tab.tsx` exporting a default component. It owns every
   route under its path, so it can define its own sub-routes with `<Routes>`.
2. Add one entry to the `tabs` array in `src/app/tabs.tsx` (label, path, icon, accent colour).
3. If it stores data, add a table to `src/db/db.ts` in a **new** `this.version(n)` block.
   Backups pick up new tables automatically.
