import { NavLink } from 'react-router-dom'
import { tabs } from './tabs'

export function TabBar() {
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <NavLink
            key={tab.id}
            to={tab.path}
            className={({ isActive }) => 'tab-bar-item' + (isActive ? ' active' : '')}
            style={{ ['--tab-accent' as string]: tab.accent }}
          >
            <Icon size={26} />
            <span>{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
