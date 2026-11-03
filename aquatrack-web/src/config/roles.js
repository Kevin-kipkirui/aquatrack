// Role values must match user_metadata.role in Supabase Auth and the backend's requireRole().
export const ROLES = {
  ADMIN: 'admin',
  AGENT: 'field_officer', // "field agent" in the UI, "field_officer" in the DB/API
};