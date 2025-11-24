import { useLocation } from "@solidjs/router";

import { MenuItemLink } from "./ui/rudimentary";

export default function Nav() {
  const location = useLocation();
  return (
    <nav class="navbar bg-base-100 shadow-sm">
      <div class="nav-start">
        <ul class="menu menu-horizontal px-1">
          <MenuItemLink path="/projects">Projects</MenuItemLink>
          <MenuItemLink path="/presets">Presets</MenuItemLink>
          <MenuItemLink path="/workflows">Workflows</MenuItemLink>
          <MenuItemLink path="/plugins">Plugins</MenuItemLink>
        </ul>
      </div>
    </nav>
  );
}
