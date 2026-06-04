import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function dniDigits(v: string) {
  return (v || "").replace(/\D/g, "").slice(0, 8);
}

interface CreateUserPayload {
  jugador_id: string;            // REQUIRED: every user is born from a player
  recovery_email?: string | null; // optional real email
  password: string;
  role: string;
  activo: boolean;
  delegado_posicion?: "delegado_1" | "delegado_2" | null;
  modules: Array<{ module_key: string; enabled: boolean }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload: CreateUserPayload = await req.json();
    const { jugador_id, recovery_email, password, role, activo, delegado_posicion, modules } = payload;

    if (!jugador_id) throw new Error("Falta el jugador vinculado");
    if (!password || password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
    if (!role) throw new Error("Falta el rol");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Load player
    const { data: jugador, error: jErr } = await supabaseAdmin
      .from("jugadores")
      .select("id, nombre, apellido, dni, estado, equipo_id")
      .eq("id", jugador_id)
      .single();
    if (jErr || !jugador) throw new Error("Jugador no encontrado");

    const dni = dniDigits(jugador.dni || "");
    if (!dni || dni.length < 7) throw new Error("El jugador no tiene un DNI válido");

    // Uniqueness on jugador_id and username
    const { data: existingByJugador } = await supabaseAdmin
      .from("profiles").select("id").eq("jugador_id", jugador_id).maybeSingle();
    if (existingByJugador) throw new Error("Este jugador ya tiene un usuario asociado");

    const { data: existingByUsername } = await supabaseAdmin
      .from("profiles").select("id").eq("username", dni).maybeSingle();
    if (existingByUsername) throw new Error("Ya existe un usuario con ese DNI");

    // Delegado validation
    let resolvedEquipoId = jugador.equipo_id;
    if (role === "delegado") {
      if (!delegado_posicion) throw new Error("Delegado requiere posición (Delegado 1 o Delegado 2)");
      if (jugador.estado !== "habilitado") throw new Error("El jugador debe estar habilitado para ser delegado");
      if (!jugador.equipo_id) throw new Error("El jugador no tiene equipo asignado");
    }

    // Validate recovery email if present, else build synthetic
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanRecovery = (recovery_email || "").trim().toLowerCase();
    if (cleanRecovery && !emailRe.test(cleanRecovery)) throw new Error("Email de recuperación inválido");

    const authEmail = cleanRecovery || `${dni}@lvfc.local`;

    // Check if an auth user with this email already exists (orphan = no linked profile)
    let userId: string;
    let existingAuthUserId: string | null = null;
    {
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) throw listErr;
      const match = list?.users?.find((u) => (u.email || "").toLowerCase() === authEmail.toLowerCase());
      if (match) {
        // Check if that auth user already has a populated profile (jugador_id set)
        const { data: prof } = await supabaseAdmin
          .from("profiles").select("id, jugador_id").eq("id", match.id).maybeSingle();
        if (prof?.jugador_id) {
          throw new Error(
            cleanRecovery
              ? `Ya existe un usuario activo con el email ${authEmail}`
              : `Ya existe un usuario activo con el DNI ${dni}. Eliminá el usuario anterior primero.`
          );
        }
        existingAuthUserId = match.id;
      }
    }

    if (existingAuthUserId) {
      // Reuse orphan auth user: update password + confirm
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existingAuthUserId, {
        password,
        email_confirm: true,
      });
      if (updErr) throw updErr;
      userId = existingAuthUserId;
    } else {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
      });
      if (userError) throw userError;
      userId = userData.user.id;
    }

    // Update profile (created by trigger handle_new_user)
    const profileUpdate: Record<string, unknown> = {
      nombre: jugador.nombre,
      apellido: jugador.apellido,
      activo: activo ?? true,
      equipo_id: jugador.equipo_id,
      username: dni,
      email: authEmail,
      recovery_email: cleanRecovery || null,
      must_change_password: false,
      jugador_id,
    };
    const { error: pErr } = await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", userId);
    if (pErr) {
      if (!existingAuthUserId) await supabaseAdmin.auth.admin.deleteUser(userId);
      throw pErr;
    }

    // Role (clear previous, then insert)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });

    // Module permissions
    await supabaseAdmin.from("user_module_permissions").delete().eq("user_id", userId);
    if (modules && modules.length > 0) {
      const rows = modules.map((m) => ({ user_id: userId, module_key: m.module_key, enabled: m.enabled }));
      await supabaseAdmin.from("user_module_permissions").insert(rows);
    }

    // Module permissions
    if (modules && modules.length > 0) {
      const rows = modules.map((m) => ({ user_id: userId, module_key: m.module_key, enabled: m.enabled }));
      await supabaseAdmin.from("user_module_permissions").insert(rows);
    }

    // Assign delegado position on equipo
    if (role === "delegado" && resolvedEquipoId && delegado_posicion) {
      const updateField: Record<string, string> = {};
      updateField[delegado_posicion] = jugador.id;
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
