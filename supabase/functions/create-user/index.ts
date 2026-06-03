import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function dniDigits(v: string) {
  return (v || "").replace(/\D/g, "").slice(0, 8);
}

interface CreateUserPayload {
  username: string;          // DNI (with or without dots) OR fallback identifier
  recovery_email: string;    // real email used for auth + recovery
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload: CreateUserPayload = await req.json();
    const {
      username,
      recovery_email,
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

    if (!username || !recovery_email || !password || !nombre?.trim() || !apellido?.trim() || !role) {
      throw new Error("Faltan campos obligatorios");
    }
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = recovery_email.trim().toLowerCase();
    if (!emailRe.test(cleanEmail)) throw new Error("Email de recuperación inválido");

    const dni = dniDigits(username);
    if (!dni || dni.length < 7) throw new Error("DNI inválido (7 u 8 dígitos)");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

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

    // Create auth user with real recovery email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
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
      username: dni,
      email: cleanEmail,
      recovery_email: cleanEmail,
      must_change_password: false,
    };
    await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", userId);

    // Role
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });

    // Module permissions
    if (modules && modules.length > 0) {
      const rows = modules.map((m) => ({ user_id: userId, module_key: m.module_key, enabled: m.enabled }));
      await supabaseAdmin.from("user_module_permissions").insert(rows);
    }

    // Assign delegado position on equipo
    if (role === "delegado" && resolvedEquipoId && delegado_posicion) {
      const updateField: Record<string, string> = {};
      updateField[delegado_posicion] = jugador_id_delegado!;
      const { error: eqErr } = await supabaseAdmin
        .from("equipos").update(updateField).eq("id", resolvedEquipoId);
      if (eqErr) console.error("Error assigning delegado to equipo:", eqErr);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
