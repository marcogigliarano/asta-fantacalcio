import { authenticate, isAdmin, sendError, sql } from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  try {
    const { email } = await authenticate(req);
    const { query, values = [] } = req.body || {};
    if (typeof query !== 'string' || !Array.isArray(values)) {
      return res.status(400).send('Invalid query payload');
    }

    if (!/^\s*SELECT\b/i.test(query) && !isAdmin(email)) {
      return res.status(403).send('Viewer accounts cannot modify data');
    }

    return res.json(await sql(query, values));
  } catch (error) {
    return sendError(res, error);
  }
}