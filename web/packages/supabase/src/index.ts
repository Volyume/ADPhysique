// Framework-agnostic exports only (no next/headers, no browser globals) so this
// entry is safe in any context. Use the /client, /server and /middleware
// subpath exports for the environment-specific Supabase clients.
export * from './tables';
export * from './stats';
export * from './volume';
export * from './exerciseLibrary';
export { canonicalExerciseId } from './canonicalExerciseId';
export * from './queries/dashboard';
export * from './queries/progress';
