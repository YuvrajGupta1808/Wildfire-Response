import { VapiClient } from '@vapi-ai/server-sdk';

/** Matches `.env.example` so copy-paste templates are not treated as real credentials. */
const VAPI_ENV_PLACEHOLDERS = new Set([
  'your-vapi-public-key',
  'your-vapi-assistant-id',
  'your-vapi-server-key',
  'your-vapi-phone-number-id',
]);

function isRealVapiEnvValue(value: string | undefined): boolean {
  const v = value?.trim();
  return Boolean(v && !VAPI_ENV_PLACEHOLDERS.has(v));
}

export function resolveAppBaseUrl(): string {
  const explicit = process.env.APP_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  return 'http://localhost:3000';
}

function isLoopbackHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  } catch {
    return false;
  }
}

/**
 * Base URL Vapi uses to call `/api/vapi_tools` and `/api/vapi_webhook`.
 * - Non-loopback `APP_URL` (production, ngrok) wins.
 * - Otherwise uses the browser request origin so local dev matches the actual port (3001, etc.).
 */
export function resolveVapiCallbackBaseUrl(requestOrigin?: string | null): string {
  const envBase = process.env.APP_URL?.replace(/\/$/, '');
  if (envBase && !isLoopbackHttpUrl(envBase)) {
    return envBase;
  }
  const req = requestOrigin?.replace(/\/$/, '') ?? '';
  if (req && /^https?:\/\//i.test(req)) {
    return req;
  }
  return resolveAppBaseUrl();
}

export function isVapiServerConfigured() {
  return (
    isRealVapiEnvValue(process.env.VAPI_API_KEY) &&
    isRealVapiEnvValue(process.env.VAPI_ASSISTANT_ID) &&
    isRealVapiEnvValue(process.env.VAPI_PHONE_NUMBER_ID)
  );
}

export function getVapiServerClient() {
  if (!isRealVapiEnvValue(process.env.VAPI_API_KEY)) {
    return null;
  }
  return new VapiClient({ token: process.env.VAPI_API_KEY! });
}

export function getVapiPublicConfig(options?: { requestOrigin?: string | null }) {
  const base = resolveVapiCallbackBaseUrl(options?.requestOrigin);
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? '';
  const assistantId =
    process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? process.env.VAPI_ASSISTANT_ID ?? '';
  return {
    publicKey,
    assistantId,
    configured: isRealVapiEnvValue(publicKey) && isRealVapiEnvValue(assistantId),
    toolServerUrl: `${base}/api/vapi_tools`,
    webhookUrl: `${base}/api/vapi_webhook`,
  };
}

/** Places an outbound PSTN call via Vapi when server env is complete. */
export async function createOutboundPhoneCall(input: {
  customerNumber: string;
  customerName?: string;
}): Promise<{ ok: true; vapiCallId: string } | { ok: false; message: string }> {
  const client = getVapiServerClient();
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!client || !assistantId || !phoneNumberId) {
    return { ok: false, message: 'Missing VAPI_API_KEY, VAPI_ASSISTANT_ID, or VAPI_PHONE_NUMBER_ID' };
  }
  try {
    const body = {
      type: 'outboundPhoneCall',
      assistantId,
      phoneNumberId,
      customer: { number: input.customerNumber, name: input.customerName },
    };
    const created = await client.calls.create(body as never);
    const call = created as { id?: string };
    const id = call.id;
    if (!id) {
      return { ok: false, message: 'Vapi did not return a call id' };
    }
    return { ok: true, vapiCallId: id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Vapi outbound call failed';
    return { ok: false, message };
  }
}
