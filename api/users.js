import { authenticate, clerk, isAdmin, sendError, sql } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  try {
    const { email: adminEmail } = await authenticate(req);
    if (!isAdmin(adminEmail)) return res.status(403).send('Admin access required');

    const { email, password, teamId = null } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || typeof password !== 'string' || password.length < 15) {
      return res.status(400).send('Email and a password of at least 15 characters are required');
    }

    await clerk.users.createUser({ emailAddress: [normalizedEmail], password });
    await sql(
      `INSERT INTO app_users (email, role, is_active, team_id)
       VALUES ($1, 'user', TRUE, $2)
       ON CONFLICT (email) DO UPDATE SET is_active = TRUE, team_id = EXCLUDED.team_id`,
      [normalizedEmail, teamId]
    );

    return res.status(201).json({ email: normalizedEmail, teamId });
  } catch (error) {
    return sendError(res, error);
  }
}