import { authenticate, clerk, isAdmin, sendError, sql } from './_shared.js';

export default async function handler(req, res) {
  try {
    const { email: adminEmail } = await authenticate(req);
    if (!isAdmin(adminEmail)) return res.status(403).send('Admin access required');

    if (req.method === 'GET') {
      const clerkUsers = await clerk.users.getUserList({ limit: 100 });
      let accessRows;
      try {
        accessRows = await sql`SELECT email, role, is_active, team_id FROM app_users ORDER BY email ASC`;
      } catch (error) {
        console.warn('app_users.team_id is unavailable; loading users without team assignments:', error.message);
        accessRows = await sql`SELECT email, role, is_active FROM app_users ORDER BY email ASC`;
      }
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

    if (req.method === 'DELETE' || req.method === 'PATCH') {
      const email = String(req.query.email || req.body?.email || '').trim().toLowerCase();
      if (!email) return res.status(400).send('Email is required');
      const clerkUsers = await clerk.users.getUserList({ limit: 100 });
      const target = clerkUsers.data.find((clerkUser) => clerkUser.emailAddresses
        .some((address) => address.emailAddress.trim().toLowerCase() === email));
      if (!target) return res.status(404).send('Clerk user not found');

      if (req.method === 'DELETE') {
        await clerk.users.deleteUser(target.id);
        await sql`DELETE FROM app_users WHERE email = ${email}`;
        return res.status(204).end();
      }

      const { password, teamId = null } = req.body || {};
      if (password !== undefined && (typeof password !== 'string' || password.length < 8)) {
        return res.status(400).send('Password must contain at least 8 characters');
      }
      if (password) await clerk.users.updateUser(target.id, { password });
      await sql(
        `INSERT INTO app_users (email, role, is_active, team_id)
         VALUES ($1, 'user', TRUE, $2)
         ON CONFLICT (email) DO UPDATE SET team_id = EXCLUDED.team_id`,
        [email, teamId]
      );
      return res.json({ email, teamId });
    }

    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const { email, password, teamId = null } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || typeof password !== 'string' || password.length < 8) {
      return res.status(400).send('Email and a password of at least 8 characters are required');
    }

    const createdUser = await clerk.users.createUser({ emailAddress: [normalizedEmail], password });
    try {
      await sql(
        `INSERT INTO app_users (email, role, is_active, team_id)
         VALUES ($1, 'user', TRUE, $2)
         ON CONFLICT (email) DO UPDATE SET is_active = TRUE, team_id = EXCLUDED.team_id`,
        [normalizedEmail, teamId]
      );
    } catch (error) {
      await clerk.users.deleteUser(createdUser.id);
      throw error;
    }

    return res.status(201).json({ email: normalizedEmail, teamId });
  } catch (error) {
    return sendError(res, error);
  }
}