import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@19.1.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl!, supabaseKey!);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
            });
        }

        // Get the order
        const { data: order, error: orderError } = await supabase
            .from("orders")
            .select("*")
            .eq("stripe_session_id", sessionId)
            .single();

        if (orderError || !order) throw new Error("Order not found");

        if (order.status === "completed") {
            return ok({
                verified: true,
                status: "paid",
                sessionId: session.id,
                already_processed: true
            });
        }

        // Update order status
        const { error: updateError } = await supabase
            .from("orders")
            .update({
                status: "completed",
                completed_at: new Date().toISOString(),
                stripe_payment_intent_id: session.payment_intent as string,
                customer_email: session.customer_details?.email,
                customer_name: session.customer_details?.name,
            })
            .eq("id", order.id);

        if (updateError) throw updateError;

        // Business Logic: Add Arena Currency
        // Rate: $1 = 100 Arena Currency
        const arenaCurrencyAmount = Math.round(Number(order.total_amount) * 100);
        
        // 1. Update Profile Balance
        const { data: profile, error: profileError } = await supabase
            .rpc('increment_arena_currency', { 
                user_uuid: order.user_id, 
                amount: arenaCurrencyAmount 
            });

        if (profileError) {
            console.error("Error updating profile balance:", profileError);
            // We should probably log this but the payment was successful
        }

        // 2. Create Transaction Record
        await supabase
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

        return ok({
            verified: true,
            status: "paid",
            sessionId: session.id,
            amount: session.amount_total,
            currency: session.currency,
            arenaCurrencyAdded: arenaCurrencyAmount
        });
    } catch (error) {
        console.error("Payment verification failed:", error);
        return fail(error instanceof Error ? error.message : "Payment verification failed", 500);
    }
});
