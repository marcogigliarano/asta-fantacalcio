import cors from 'cors';
import express from 'express';
import { neon } from '@neondatabase/serverless';
import { createClerkClient, verifyToken } from '@clerk/backend';

process.loadEnvFile?.('.env.local');

const app = express();
const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.VITE_NEON_DATABASE_URL;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!databaseUrl || !clerkSecretKey) {
  throw new Error('NEON_DATABASE_URL and CLERK_SECRET_KEY are required');
}

const sql = neon(databaseUrl);
const clerk = createClerkClient({ secretKey: clerkSecretKey });
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const authenticate = async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!token) {
    return res.status(401).send('Authentication required');
  }

  try {
    req.auth = await verifyToken(token, { secretKey: clerkSecretKey });
    req.user = await clerk.users.getUser(req.auth.sub);
    req.email = req.user.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
    next();
  } catch {
    return res.status(401).send('Invalid authentication token');
  }
};

const isReadOnly = (query) => /^\s*SELECT\b/i.test(query);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/api/sql', authenticate, async (req, res) => {
  const { query, values = [] } = req.body || {};

  if (typeof query !== 'string' || !Array.isArray(values)) {
    return res.status(400).send('Invalid query payload');
  }

  if (!isReadOnly(query)) {
    const adminEmails = String(process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    if (!adminEmails.includes(req.email)) {
      return res.status(403).send('Viewer accounts cannot modify data');
    }
  }

  try {
    const rows = await sql(query, values);
    return res.json(rows);
  } catch (error) {
    console.error('Database query failed:', {
      message: error.message,
      code: error.code,
      query,
    });
    return res.status(500).send('Database request failed');
  }
});

app.post('/api/users', authenticate, async (req, res) => {
  const adminEmails = String(process.env.ADMIN_EMAILS || '')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.includes(req.email)) return res.status(403).send('Admin access required');

  const { email, password, teamId = null } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) {
    return res.status(400).send('Email and a password of at least 8 characters are required');
  }

  try {
    await clerk.users.createUser({ emailAddress: [email.trim().toLowerCase()], password });
    await sql(
      `INSERT INTO app_users (email, role, is_active, team_id)
       VALUES ($1, 'user', TRUE, $2)
       ON CONFLICT (email) DO UPDATE SET is_active = TRUE, team_id = EXCLUDED.team_id`,
      [email.trim().toLowerCase(), teamId]
    );
    return res.status(201).json({ email: email.trim().toLowerCase(), teamId });
  } catch (error) {
    console.error('User creation failed:', error);
    return res.status(400).send(error.errors?.[0]?.longMessage || 'Unable to create user');
  }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});