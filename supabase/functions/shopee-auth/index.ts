
// Edge Function: Shopee OAuth Handler
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getSupabaseClient = (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const getShopeeConfig = () => {
  return {
    appId: parseInt(Deno.env.get("SHOPEE_APP_ID")!),
    appSecret: Deno.env.get("SHOPEE_APP_SECRET")!,
    redirectUri: Deno.env.get("SHOPEE_REDIRECT_URI")!,
    apiBaseUrl: "https://open-api.shopee.vn/api/v2",
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = getSupabaseClient(req);
  const shopeeConfig = getShopeeConfig();

  const { action, code, shop_id, partner_id, main_account_id, sign, timestamp } = await req.json() as any;

  try {
    if (action === "get-auth-url") {
      // Step 1: Generate Shopee Auth URL
      const authUrl = new URL("https://partner.shopee.vn/api/v2/shop/auth_partner");
      authUrl.searchParams.set("partner_id", shopeeConfig.appId.toString());
      authUrl.searchParams.set("redirect", shopeeConfig.redirectUri);
      authUrl.searchParams.set("timestamp", Math.floor(Date.now() / 1000).toString());

      // Generate signature
      const dataToSign = `${shopeeConfig.appId}${authUrl.searchParams.get("timestamp")}`;
      const sign = await hmacSHA256(dataToSign, shopeeConfig.appSecret);
      authUrl.searchParams.set("sign", sign);

      return new Response(JSON.stringify({ auth_url: authUrl.toString() }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      });
    }

    if (action === "handle-callback") {
      // Step 2: Exchange code for access token
      const tokenUrl = new URL(`${shopeeConfig.apiBaseUrl}/auth/token/get`);
      const tokenPayload = {
        partner_id: shopeeConfig.appId,
        partner_key: shopeeConfig.appSecret,
        code: code,
        shop_id: shop_id,
        main_account_id: main_account_id,
        sign: sign,
        timestamp: timestamp,
      };

      const tokenResponse = await fetch(tokenUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokenPayload),
      });

      const tokenData = await tokenResponse.json() as any;

      if (tokenData.error) {
        throw new Error(tokenData.error_description || "Token exchange failed");
      }

      // Step 3: Get shop information
      const shopInfoUrl = new URL(`${shopeeConfig.apiBaseUrl}/shop/get_shop_info`);
      const shopInfoPayload = {
        partner_id: shopeeConfig.appId,
        partner_key: shopeeConfig.appSecret,
        shop_id: shop_id,
        access_token: tokenData.access_token,
        sign: await hmacSHA256(`${shopeeConfig.appId}${tokenData.access_token}${shop_id}${timestamp}`, shopeeConfig.appSecret),
        timestamp: timestamp,
      };

      const shopInfoResponse = await fetch(shopInfoUrl.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shopInfoPayload),
      });

      const shopInfoData = await shopInfoResponse.json() as any;

      // Step 4: Save to database
      const tokenExpiresAt = new Date(Date.now() + (tokenData.expire_in * 1000));
      const { error } = await supabase.from("shopee_accounts").upsert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        shop_id: shop_id,
        shop_name: shopInfoData.response.shop_name,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, shop: shopInfoData.response }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  } catch (error) {
    console.error("Shopee OAuth error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 500,
    });
  }
});

async function hmacSHA256(data: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
