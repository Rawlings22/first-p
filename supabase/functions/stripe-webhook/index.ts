// Supabase Edge Function: stripe-webhook
// Stripe calls this directly (never the browser) once a payment actually
// succeeds. This is the only place an order's status flips to 'paid' —
// the signature check below makes sure the request really came from Stripe.
import Stripe from 'npm:stripe@17';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (orderId) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Only flip pending -> paid. If this webhook fires twice for the same
      // event (Stripe does retry), the second call updates zero rows, so
      // stock never gets decremented twice for one payment.
      const { data: updatedOrders } = await supabaseAdmin
        .from('orders')
        .update({
          status: 'paid',
          stripe_payment_intent: session.payment_intent as string,
        })
        .eq('id', orderId)
        .eq('status', 'pending')
        .select('items');

      if (updatedOrders && updatedOrders.length > 0) {
        const items = updatedOrders[0].items as Array<{ id: string; qty: number }>;
        for (const item of items) {
          await supabaseAdmin.rpc('adjust_product_stock', {
            p_product_id: item.id,
            p_delta: -item.qty,
          });
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
