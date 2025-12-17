import { MenuItemLink } from "./ui/rudimentary";

export default function Nav() {
  return (
    <nav class="navbar bg-base-100 shadow-sm">
      <div class="navbar-start">
        <ul class="menu menu-horizontal px-1">
          <MenuItemLink path="/project-board">Project Board</MenuItemLink>
          <MenuItemLink path="/presets">Presets</MenuItemLink>
          <MenuItemLink path="/workflows">Workflows</MenuItemLink>
          <MenuItemLink path="/runtime">Runtime</MenuItemLink>
        </ul>
      </div>
      <div class="navbar-end">
        <ul class="menu menu-horizontal px-1">
          <MenuItemLink path="/about">About</MenuItemLink>
          <MenuItemLink path="/preferences">Preferences</MenuItemLink>
        </ul>
      </div>
    </nav>
  );
}
