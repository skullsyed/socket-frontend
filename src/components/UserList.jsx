import { useState } from "react";

export default function UserList() {
  const [user, setUser] = useState("syed");

  return (
    <nav class="nav flex-column">
      <a
        class="btn btn-primary"
        data-bs-toggle="offcanvas"
        href="#offcanvasExample"
        role="button"
        aria-controls="offcanvasExample"
      >
        {user}
      </a>

      <a class="nav-link" href="#">
        Link
      </a>
      <a class="nav-link" href="#">
        Link
      </a>
      <a class="nav-link disabled" aria-disabled="true">
        Disabled
      </a>
    </nav>
  );
}
