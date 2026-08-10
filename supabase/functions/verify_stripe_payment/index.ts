import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@19.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl!, supabaseKey!);

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('origin') || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
}

function ok(data: any, req: Request): Response {
    const corsHeaders = getCorsHeaders(req);
    return new Response(
        JSON.stringify({ code: "SUCCESS", message: "ok", data }),
        {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders }
        }
    );
}

function fail(msg: string, req: Request, code = 400): Response {
    const corsHeaders = getCorsHeaders(req);
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
        const corsHeaders = getCorsHeaders(req);
        if (req.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const { sessionId } = await req.json();
        if (!sessionId) throw new Error("Missing session_id parameter");

        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) {
            throw new Error("STRIPE_SECRET_KEY is not configured");
        }

        const stripe = new Stripe(stripeSecretKey, {
            apiVersion: "2023-10-16" as any,
        });

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
            return ok({
                verified: false,
                status: session.payment_status,
                sessionId: session.id,
            }, req);
        }

        // Get the order
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("*")
            .eq("stripe_session_id", sessionId)
            .single();

        if (orderError || !order) throw new Error("Order not found");

        // Atomically claim this order for crediting. Both the Stripe webhook
        // (checkout.session.completed) and this success-page verification call
        // race to process the same order — whichever one flips status away
        // from 'pending' first "wins" and is the only one that credits the
        // balance. Postgres serializes concurrent UPDATEs on the same row, so
        // this single statement is race-free (unlike a separate read-then-write
        // check, which has a window where both callers see status = 'pending').
        const { data: claimedOrder, error: claimError } = await supabase
            .from("orders")
            .update({
                status: "completed",
                completed_at: new Date().toISOString(),
                stripe_payment_intent_id: session.payment_intent as string,
                customer_email: session.customer_details?.email,
                customer_name: session.customer_details?.name,
            })
            .eq("id", order.id)
            .neq("status", "completed")
            .select("id")
            .maybeSingle();

        if (claimError) throw claimError;

        if (!claimedOrder) {
            // Someone else (the webhook, or an earlier call to this function)
            // already completed this order. Do NOT credit again — just report
            // the current balance so the success page still renders correctly.
            const { data: existingProfile } = await supabase
                .from("profiles")
                .select("arena_currency")
                .eq("id", order.user_id)
                .single();
            return ok({
                verified: true,
                status: "paid",
                sessionId: session.id,
                amount: session.amount_total,
                currency: session.currency,
                arenaCurrencyAdded: Math.round(Number(order.total_amount) * 100),
                already_processed: true,
                currentBalance: existingProfile?.arena_currency ?? 0,
            }, req);
        }

        // We won the claim — this call is responsible for crediting.
        // Business Logic: Add Arena Currency
        // Rate: $1 = 100 Arena Currency
        const arenaCurrencyAmount = Math.round(Number(order.total_amount) * 100);
        
        // 1. Update Profile Balance — only Arena Currency (non-withdrawable)
        const { error: profileError } = await supabase
            .rpc('increment_arena_currency', { 
                p_user_id: order.user_id, 
                p_amount: arenaCurrencyAmount 
            });

        if (profileError) {
            console.error("Error updating profile balance:", profileError);
        }

        // 2. Create Transaction Record (idempotent: unique index on stripe_payment_intent_id)
        const { error: txError } = await supabase
            .from("transactions")
            .insert({
                user_id: order.user_id,
                type: 'deposit',
                amount: arenaCurrencyAmount,
                description: `Arena Currency Deposit via Stripe (Order #${order.id.slice(0, 8)})`,
                status: 'completed',
                currency: 'AC',
                stripe_payment_intent_id: session.payment_intent as string,
                metadata: {
                    order_id: order.id,
                    stripe_session_id: session.id
                }
            });

        if (txError && !txError.message?.includes('duplicate')) {
            console.error("Error recording transaction:", txError);
        }

        return ok({
            verified: true,
            status: "paid",
            sessionId: session.id,
            amount: session.amount_total,
            currency: session.currency,
            arenaCurrencyAdded: arenaCurrencyAmount
        }, req);
    } catch (error) {
        console.error("Payment verification failed:", error);
        return fail(error instanceof Error ? error.message : "Payment verification failed", req, 500);
    }
});
