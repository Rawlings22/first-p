// Supabase project connection. The anon key is a public, restricted key by design —
// real write protection (e.g. only admins can add products) is enforced by
// Row Level Security policies inside the Supabase database, not by hiding this key.
const SUPABASE_URL = 'https://ufpfvyjizrupkbqiyocc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcGZ2eWppenJ1cGticWl5b2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Mjc4NDIsImV4cCI6MjA5OTIwMzg0Mn0.3VJToIjROrbCaTZoxq7GD389VDVjgg_mjEhJrYhrCvo';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
