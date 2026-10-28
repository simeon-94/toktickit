// Lab 4 #55: the server test suite runs against its own database so test rows (and tests that
// deactivate accounts, e.g. the Lab 3 BR-15 test) never touch the dev/demo database.
//
// TEST_DATABASE_URL wins when set; otherwise the dev DATABASE_URL with "_test" appended to the
// database name (toktickit -> toktickit_test).
export function testDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  if (env.TEST_DATABASE_URL) return env.TEST_DATABASE_URL;
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL (or TEST_DATABASE_URL) must be set to run the server tests.");
  const url = new URL(env.DATABASE_URL);
  url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;
  return url.toString();
}

export function databaseName(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

// Refuses anything that does not look like a throw-away test database, so the setup can never
// drop the dev database by mistake.
export function assertSafeTestDatabase(testUrl: string, devUrl: string | undefined) {
  const name = databaseName(testUrl);
  if (!/_test$/.test(name)) throw new Error(`Refusing to use "${name}" as the test database: its name must end with "_test".`);
  if (devUrl && databaseName(devUrl) === name) throw new Error("The test database must not be the dev database.");
}
