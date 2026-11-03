import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Who is calling? Must be a signed-in administrator.
    const caller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return json({ error: 'You are not signed in.' }, 401);
    if (user.app_metadata?.role !== 'admin') {
      return json({ error: 'Only administrators can recruit field agents.' }, 403);
    }

    // 2. Validate input.
    const { fullName, email: rawEmail, password } = await req.json();
    const email = String(rawEmail ?? '').trim().toLowerCase();
    if (!fullName || String(fullName).trim().length < 2) return json({ error: 'Enter the agent’s full name.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400);
    if (!password || password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);

    // 3. Create the agent with the service-role key (never leaves the server).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'field_officer' },
      user_metadata: { full_name: String(fullName).trim() },
    });
    if (error) return json({ error: error.message }, 400);

    return json({ id: data.user.id, role: 'field_officer' }, 201);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error.' }, 500);
  }
});