import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserPayload {
  email_or_username: string;
  password: string;
  nombre: string;
  apellido: string;
  role: string;
  activo: boolean;
  equipo_id: string | null;
  jugador_id_delegado: string | null;
  delegado_posicion: "delegado_1" | "delegado_2" | null;
  modules: Array<{ module_key: string; enabled: boolean }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: CreateUserPayload = await req.json();
    const {
      email_or_username,
      password,
      nombre,
      apellido,
      role,
      activo,
      equipo_id,
      jugador_id_delegado,
      delegado_posicion,
      modules,
    } = payload;

    if (!email_or_username || !password || !nombre?.trim() || !apellido?.trim() || !role) {
      throw new Error("Faltan campos obligatorios");
    }
    if (password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Determine email for auth: if it looks like email use it, otherwise create synthetic
    const isEmail = email_or_username.includes("@");
    const authEmail = isEmail ? email_or_username : `${email_or_username}@lvfc.local`;

    // Delegado validation
    let resolvedEquipoId = equipo_id;
    if (role === "delegado") {
      if (!jugador_id_delegado) throw new Error("Delegado requiere un jugador vinculado");
      if (!delegado_posicion) throw new Error("Delegado requiere posición (delegado_1 o delegado_2)");

      const { data: jugador, error: jErr } = await supabaseAdmin
        .from("jugadores")
        .select("id, equipo_id, estado, nombre, apellido")
        .eq("id", jugador_id_delegado)
        .single();

      if (jErr || !jugador) throw new Error("Jugador no encontrado");
      if (jugador.estado !== "habilitado") throw new Error("El jugador debe estar habilitado");
      if (!jugador.equipo_id) throw new Error("El jugador no tiene equipo asignado");

      resolvedEquipoId = jugador.equipo_id;
    }

    // Create auth user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
    });

    if (userError) throw userError;
    const userId = userData.user.id;

    // Update profile (created by trigger)
    const profileUpdate: Record<string, unknown> = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      activo: activo ?? true,
      equipo_id: role === "delegado" ? resolvedEquipoId : null,
      username: isEmail ? null : email_or_username,
    };
    if (isEmail) {
      profileUpdate.email = email_or_username;
    }
    await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", userId);

    // Assign role
    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role,
    });

    // Insert module permissions
    if (modules && modules.length > 0) {
      const rows = modules.map((m) => ({
        user_id: userId,
        module_key: m.module_key,
        enabled: m.enabled,
      }));
      await supabaseAdmin.from("user_module_permissions").insert(rows);
    }

    // Assign delegado position on equipo
    if (role === "delegado" && resolvedEquipoId && delegado_posicion) {
      const updateField: Record<string, string> = {};
      updateField[delegado_posicion] = jugador_id_delegado!;
      const { error: eqErr } = await supabaseAdmin
        .from("equipos")
        .update(updateField)
        .eq("id", resolvedEquipoId);
      if (eqErr) {
        console.error("Error assigning delegado to equipo:", eqErr);
        // Don't throw - user was created successfully
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
