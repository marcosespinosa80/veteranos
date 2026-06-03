import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function dniDigits(v: string) {
  return (v || "").replace(/\D/g, "").slice(0, 8);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await admin.auth.getClaims(token);
    const callerId = claims?.claims?.sub;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", callerId).maybeSingle();
    if (roleRow?.role !== "admin_general") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, username, recovery_email } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id requerido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileUpdate: Record<string, unknown> = {};

    if (typeof username === "string") {
      const dni = dniDigits(username);
      if (!dni || dni.length < 7) {
        return new Response(JSON.stringify({ error: "DNI inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      profileUpdate.username = dni;
    }

    if (typeof recovery_email === "string") {
      const em = recovery_email.trim().toLowerCase();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(em)) {
        return new Response(JSON.stringify({ error: "Email inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      profileUpdate.recovery_email = em;
      profileUpdate.email = em;

      const { error: emErr } = await admin.auth.admin.updateUserById(user_id, { email: em, email_confirm: true });
      if (emErr) throw emErr;
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: pErr } = await admin.from("profiles").update(profileUpdate).eq("id", user_id);
      if (pErr) throw pErr;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
