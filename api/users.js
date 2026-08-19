import { authenticate, clerk, isAdmin, sendError, sql } from './_shared.js';

export default async function handler(req, res) {
  try {
    const { email: adminEmail } = await authenticate(req);
    if (!isAdmin(adminEmail)) return res.status(403).send('Admin access required');

    if (req.method === 'GET') {
      const [clerkUsers, accessRows] = await Promise.all([
        clerk.users.getUserList({ limit: 100 }),
        sql`SELECT email, role, is_active, team_id FROM app_users ORDER BY email ASC`,
      ]);
      const accessByEmail = new Map(accessRows.map((row) => [row.email.trim().toLowerCase(), row]));
      const users = clerkUsers.data
        .map((clerkUser) => {
          const email = clerkUser.emailAddresses
            .find((address) => address.id === clerkUser.primaryEmailAddressId)
            ?.emailAddress
            ?.trim()
            .toLowerCase();
          if (!email) return null;
          const access = accessByEmail.get(email);
          return {
            email,
            role: access?.role === 'admin' ? 'admin' : 'user',
            isActive: access?.is_active !== false && access?.is_active !== 0,
            teamId: access?.team_id ?? null,
          };
        })
        .filter(Boolean)
        .sort((left, right) => left.email.localeCompare(right.email));
      return res.json(users);
    }

    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

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