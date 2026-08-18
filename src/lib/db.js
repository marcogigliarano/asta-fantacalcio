import { neon } from '@neondatabase/serverless';

const dbUrl = import.meta.env.VITE_NEON_DATABASE_URL;

if (!dbUrl || dbUrl.includes('INSERISCI_QUI')) {
  console.warn("Inserisci il tuo URL Neon nel file .env.local");
}

export const sql = neon(dbUrl || '');
