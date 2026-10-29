import { resetFixtures } from "./helpers";

// Playwright globalSetup (Lab 4 #55): create the e2e.* fixture accounts and E2E-L4-* Tickets in the
// dev database before any suite runs, so Lab 2/3/4 E2E tests never depend on personal accounts.
export default function globalSetup() {
  resetFixtures();
}
