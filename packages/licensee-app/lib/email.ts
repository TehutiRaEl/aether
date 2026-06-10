import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: 'onboarding@resend.dev',
    to,
    subject: 'Welcome to the Platform',
    text: `Hi ${name},

Welcome! You've been added to our waitlist.`,
  })
}

export async function sendGracePeriodWarning(buyerId: string, days: number) {
  // In production: lookup email from DB
  return resend.emails.send({
    from: 'billing@resend.dev',
    to: `${buyerId}@placeholder.com`,
    subject: 'URGENT: License Grace Period Active',
    text: `Your license grace period expires in ${days} days. Renew immediately to avoid the 97% penalty split.`,
  })
}
