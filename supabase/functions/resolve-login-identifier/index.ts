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
    const { identifier } = await req.json();
    if (!identifier || typeof identifier !== "string") {
      return new Response(JSON.stringify({ email: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If it has @, return as is (caller will attempt signIn directly)
    if (identifier.includes("@")) {
      return new Response(JSON.stringify({ email: identifier.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dni = dniDigits(identifier);
    if (!dni) {
      return new Response(JSON.stringify({ email: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data } = await admin
      .from("profiles")
      .select("email, recovery_email")
      .eq("username", dni)
      .maybeSingle();

    const email = data?.email || data?.recovery_email || null;

    return new Response(JSON.stringify({ email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    // Never reveal anything on errors
    return new Response(JSON.stringify({ email: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
