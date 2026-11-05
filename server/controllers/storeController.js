import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { env, stripeConfigured } from '../config/env.js';

export function getConfig(_req, res) {
  const { store } = env;
  res.json({
    currency: store.currency,
    taxRate: store.taxRate,
    delivery: store.delivery,
    pickup: store.pickup,
    store: { address: store.address, phone: store.phone, email: store.email, hours: store.hours },
    payments: { stripeConfigured: stripeConfigured(), publishableKey: env.stripe.publishableKey || null },
  });
}

export async function subscribe(req, res) {
  const { email } = z.object({ email: z.string().trim().toLowerCase().email('Please enter a valid email address.').max(160) }).parse(req.body);
  await prisma.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email } });
  res.status(201).json({ ok: true, message: 'Thanks for subscribing! Look out for our weekly specials.' });
}

export async function contact(req, res) {
  const data = z
    .object({
      name: z.string().trim().min(2, 'Please enter your name.').max(100),
      email: z.string().trim().toLowerCase().email('Please enter a valid email address.').max(160),
      subject: z.string().trim().min(2, 'Please add a subject.').max(150),
      message: z.string().trim().min(10, 'Your message should be at least 10 characters.').max(3000),
    })
    .parse(req.body);
  await prisma.contactMessage.create({ data });
  res.status(201).json({ ok: true, message: 'Thank you! Your message has been received and our team will get back to you.' });
}
