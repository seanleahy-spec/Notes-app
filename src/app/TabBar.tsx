import { NavLink } from 'react-router-dom'
import { tabs } from './tabs'

/** Text-only tab bar in the minimal style. */
export function TabBar() {
  return (
    <nav className="tab-bar theme-minimal" aria-label="Main">
      {tabs.map((tab) => (
        <NavLink key={tab.id} to={tab.path} className={({ isActive }) => 'tab-bar-item' + (isActive ? ' active' : '')}>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
