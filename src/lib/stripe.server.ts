import Stripe from 'stripe';

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = 'sandbox' | 'live';

const GATEWAY_STRIPE_BASE = 'https://connector-gateway.lovable.dev/stripe';

export function getConnectionApiKey(env: StripeEnv): string {
  if (env === 'sandbox') {
    const sandboxConnection = process.env.STRIPE_SANDBOX_API_KEY || process.env.STRIPE_SECRET_KEY;
    if (!sandboxConnection) {
      throw new Error('Neither STRIPE_SANDBOX_API_KEY nor legacy STRIPE_SECRET_KEY is configured');
    }
    return sandboxConnection;
  }

  return getEnv('STRIPE_LIVE_API_KEY');
}

export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv('LOVABLE_API_KEY');

  // If the configured key is a real Stripe API key (sk_/rk_), call Stripe
  // directly. The connector gateway only accepts opaque connection identifiers
  // and will respond "Credential not found" for real Stripe keys.
  const isRealStripeKey = /^(sk|rk)_(test|live)_/.test(connectionApiKey);
  if (isRealStripeKey) {
    return new Stripe(connectionApiKey, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: '2026-03-25.dahlia' as any,
    });
  }

  return new Stripe(connectionApiKey, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: '2026-03-25.dahlia' as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    httpClient: Stripe.createFetchHttpClient(((input: any, init?: RequestInit) => {
      const gatewayUrl = input.toString().replace('https://api.stripe.com', GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init?.headers).entries()),
          'X-Connection-Api-Key': connectionApiKey,
          'Lovable-API-Key': lovableApiKey,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any),
  });
}

export async function verifyWebhook(req: Request, env: StripeEnv): Promise<{ type: string; data: { object: unknown } }> {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  const secret = env === 'sandbox'
    ? getEnv('PAYMENTS_SANDBOX_WEBHOOK_SECRET')
    : getEnv('PAYMENTS_LIVE_WEBHOOK_SECRET');

  if (!signature || !body) throw new Error('Missing signature or body');

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(',')) {
    const [key, value] = part.split('=', 2);
    if (key === 't') timestamp = value;
    if (key === 'v1') v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error('Invalid signature format');

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error('Webhook timestamp too old');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Buffer.from(new Uint8Array(signed)).toString('hex');
  if (!v1Signatures.includes(expected)) throw new Error('Invalid webhook signature');

  return JSON.parse(body);
}