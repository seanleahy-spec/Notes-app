import { NavBar } from './NavBar'

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="page">
      <NavBar />
      <h1 className="large-title">{title}</h1>
      <div className="empty-state">
        <p>Coming soon</p>
      </div>
    </div>
  )
}
