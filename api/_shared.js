import { neon } from '@neondatabase/serverless';
import { createClerkClient, verifyToken } from '@clerk/backend';

const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!databaseUrl || !clerkSecretKey) {
  throw new Error('DATABASE_URL and CLERK_SECRET_KEY are required');
}

export const sql = neon(databaseUrl);
export const clerk = createClerkClient({ secretKey: clerkSecretKey });

export const authenticate = async (req) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!token) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  const auth = await verifyToken(token, { secretKey: clerkSecretKey });
  const user = await clerk.users.getUser(auth.sub);
  return {
    user,
    email: user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || '',
  };
};

export const isAdmin = (email) => String(
  process.env.ADMIN_EMAILS
    || process.env.VITE_ADMIN_EMAILS
    || process.env.VITE_ADMIN_EMAIL
    || ''
)
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean)
  .includes(email);

export const sendError = (res, error) => {
  console.error(error);
  const clerkMessage = error.errors?.[0]?.longMessage || error.errors?.[0]?.message;
  res.status(error.statusCode || error.status || 500).send(clerkMessage || error.message || 'Request failed');
};