// Startup environment checks (Lab 4 HARD-04). Fail fast with a readable message instead of a
// confusing runtime error on the first login.

// Same unit vocabulary as the `ms` package used by jsonwebtoken. A unit is required because
// jsonwebtoken reads a unit-less string as milliseconds ("3600" would be 3.6 seconds).
const DURATION =
  /^\d+(\.\d+)?\s*(ms|msecs?|milliseconds?|s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?|w|weeks?|y|yrs?|years?)$/i;

export function validateEnv(env: Record<string, string | undefined>): string[] {
  const errors: string[] = [];
  if (!env.JWT_SECRET) errors.push("JWT_SECRET is required.");
  if (env.JWT_EXPIRES_IN !== undefined && !DURATION.test(env.JWT_EXPIRES_IN.trim())) {
    errors.push(`JWT_EXPIRES_IN "${env.JWT_EXPIRES_IN}" is not a valid duration (use e.g. "8h", "30m" or "2 days").`);
  }
  return errors;
}
