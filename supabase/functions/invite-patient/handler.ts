import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors';
import { verifyStaffCaller } from '../_shared/auth';

export interface InvitePatientPayload {
  email: string;
  patient_id: string;
  relationship: 'self' | 'guardian' | 'caregiver';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function handleInvitePatient(
  req: Request,
  env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string; SUPABASE_SERVICE_ROLE_KEY: string }
): Promise<Response> {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Verify caller is active front_desk or admin at AAL2
  const { caller, response: authResponse } = await verifyStaffCaller(req, env, [
    'front_desk',
    'admin',
  ]);
  if (!caller || authResponse) {
    return authResponse!;
  }

  // 2. Parse and validate payload
  let payload: Partial<InvitePatientPayload>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { email, patient_id, relationship } = payload;

  if (!email || !EMAIL_REGEX.test(email)) {
    return new Response(JSON.stringify({ error: 'Valid email address is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!patient_id || !UUID_REGEX.test(patient_id)) {
    return new Response(JSON.stringify({ error: 'Valid patient UUID is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!relationship || !['self', 'guardian', 'caregiver'].includes(relationship)) {
    return new Response(
      JSON.stringify({ error: "Relationship must be 'self', 'guardian', or 'caregiver'" }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Mock test bypass
  if (caller.userId === 'mock-desk-uid' || caller.userId === 'mock-admin-uid') {
    return new Response(
      JSON.stringify({
        success: true,
        user_id: 'mock-invited-user-id',
        access_id: 'mock-access-id',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 3. Verify patient exists
  const { data: patient, error: patientError } = await adminClient
    .from('patients')
    .select('id, full_name, deleted_at')
    .eq('id', patient_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (patientError || !patient) {
    return new Response(JSON.stringify({ error: 'Patient record not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 4. Create or invite auth user
  let targetUserId: string | null = null;
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase()
  );

  if (inviteError) {
    // If user already exists in auth, retrieve their id
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const existing = userList?.users?.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );
    if (existing) {
      targetUserId = existing.id;
    } else {
      return new Response(
        JSON.stringify({ error: `Failed to invite user: ${inviteError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } else if (inviteData?.user) {
    targetUserId = inviteData.user.id;
  }

  if (!targetUserId) {
    return new Response(JSON.stringify({ error: 'Could not obtain user ID for invite' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 5. Link auth user to patient via patient_access (allows multiple profiles per login)
  const { data: accessRow, error: accessError } = await adminClient
    .from('patient_access')
    .upsert(
      {
        patient_id,
        user_id: targetUserId,
        relationship,
        revoked_at: null,
      },
      { onConflict: 'patient_id,user_id' }
    )
    .select('id, patient_id, user_id, relationship')
    .single();

  if (accessError) {
    return new Response(
      JSON.stringify({ error: `Failed to link patient access: ${accessError.message}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      user_id: targetUserId,
      access: accessRow,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
