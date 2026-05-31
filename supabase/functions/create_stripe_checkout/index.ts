import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@19.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl!, supabaseKey!);

const successUrlPath = '/payment-success?session_id={CHECKOUT_SESSION_ID}';
const cancelUrlPath = '/wallet';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
    name: string;
    price: number;
    quantity: number;
    ac_amount?: number;
    image_url?: string;
}

interface CheckoutRequest {
    items: OrderItem[];
    currency?: string;
    payment_method_types?: string[];
}

function ok(data: any): Response {
    return new Response(
        JSON.stringify({ code: "SUCCESS", message: "ok", data }),
        {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
        }
    );
}

function fail(msg: string, code = 400): Response {
    return new Response(
        JSON.stringify({ code: "FAIL", message: msg }),
        {
            status: code,
            headers: { "Content-Type": "application/json", ...corsHeaders }
        }
    );
}

Deno.serve(async (req) => {
    try {
        if (req.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }
        if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

        const request = await req.json() as CheckoutRequest;
        if (!request.items?.length) throw new Error("Items cannot be empty");

        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");
        const { data: { user } } = token
            ? await supabase.auth.getUser(token)
            : { data: { user: null } };

        if (!user) throw new Error("User not authenticated");

        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) {
            throw new Error("STRIPE_SECRET_KEY is not configured");
        }

        // Initialize Stripe with fetch for Deno compatibility and speed
        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2024-06-20" as any,
            httpClient: Stripe.createFetchHttpClient(),
        });

        // Use referer or origin for redirection URLs
        const referer = req.headers.get("referer") || req.headers.get("origin") || "";
        let origin = "";
        
        if (referer) {
            try {
                const url = new URL(referer);
                let basePath = url.pathname;
                if (basePath.includes('/preview')) {
                    basePath = basePath.split('/preview')[0] + '/preview';
                } else {
                    basePath = '';
                }
                origin = `${url.origin}${basePath}`;
            } catch {
                origin = "";
            }
        }
        
        if (!origin || origin.includes('localhost')) {
            origin = req.headers.get("origin") || Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:5173";
        }
        
        if (origin.endsWith('/')) {
            origin = origin.slice(0, -1);
        }

        console.log(`Creating Stripe session for origin: ${origin}`);
        
        const totalAmount = request.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // Create pending order
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .insert({
                user_id: user.id,
                items: request.items,
                total_amount: totalAmount,
                currency: (request.currency || 'usd').toLowerCase(),
                status: "pending",
            })
            .select()
            .single();

        if (orderError) throw new Error(`Failed to create order: ${orderError.message}`);

        const session = await stripe.checkout.sessions.create({
            line_items: request.items.map(item => ({
                price_data: {
                    currency: (request.currency || 'usd').toLowerCase(),
                    product_data: {
                        name: item.name,
                        images: item.image_url ? [item.image_url] : [],
                    },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity,
            })),
            mode: "payment",
            success_url: `${origin}${successUrlPath}`,
            cancel_url: `${origin}${cancelUrlPath}`,
            payment_method_types: request.payment_method_types || ['card'],
            payment_intent_data: {
                metadata: {
                    order_id: order.id,
                    user_id: user.id,
                    ac_amount: request.items[0]?.ac_amount?.toString() || '0',
                    purchase_type: 'arena_currency',
                }
            },
            metadata: {
                order_id: order.id,
                user_id: user.id,
                ac_amount: request.items[0]?.ac_amount?.toString() || '0',
                purchase_type: 'arena_currency',
            },
        });

        console.log(`Stripe session created: ${session.id}`);

        if (!session.url) {
            throw new Error("Stripe did not return a checkout URL");
        }

        await supabase
            .from("orders")
            .update({
                stripe_session_id: session.id,
            })
            .eq("id", order.id);

        return ok({
            url: session.url,
            sessionId: session.id,
            orderId: order.id,
        });
    } catch (error) {
        console.error(`ERROR:`, error);
        return fail(error instanceof Error ? error.message : "Payment processing failed", 500);
    }
});
