import 'server-only';

export interface SignupEvent {
  email: string;
  issueId: string;
  issueNumber: number;
  marketingConsent: boolean;
  createdAt: string;
  utm: { source?: string; medium?: string; campaign?: string };
}

/** Adapter for the club's email platform. Only contacts with marketing consent should be added to marketing lists. */
export interface EmailProvider {
  onSignup(e: SignupEvent): Promise<void>;
}

const webhook: EmailProvider = {
  async onSignup(e) {
    const url = process.env.EMAIL_WEBHOOK_URL;
    if (!url) return;
    await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e) });
  },
};

// TODO(club): add the real platform here (e.g. Mailchimp, Brevo, Klaviyo) and select it with EMAIL_PROVIDER.
const providers: Record<string, EmailProvider> = { webhook };

export async function notifyEmailProvider(e: SignupEvent) {
  const name = process.env.EMAIL_PROVIDER;
  if (!name) return;
  const p = providers[name];
  if (!p) {
    console.warn(`EMAIL_PROVIDER "${name}" is not implemented in lib/email.ts`);
    return;
  }
  try {
    await p.onSignup(e);
  } catch (err) {
    console.error('Email provider failed', err);
  }
}
