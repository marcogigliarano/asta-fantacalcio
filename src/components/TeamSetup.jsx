import React, { useState } from 'react';
import { sql } from '../lib/db';

export default function TeamSetup({ onTeamCreated }) {
  const [name, setName] = useState('');
  const [pres1, setPres1] = useState('');
  const [pres2, setPres2] = useState('');
  const [budget, setBudget] = useState(1000);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !pres1) return;

    await sql`
      INSERT INTO teams (name, president_1, president_2, budget)
      VALUES (${name}, ${pres1}, ${pres2 || null}, ${parseInt(budget, 10)})
    `;

    setName('');
    setPres1('');
    setPres2('');
    onTeamCreated();
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>Aggiungi Squadra</h3>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Nome Squadra" value={name} onChange={(e) => setName(e.target.value)} required style={{ display: 'block', marginBottom: '8px', padding: '8px', width: '250px' }} />
        <input type="text" placeholder="Presidente 1" value={pres1} onChange={(e) => setPres1(e.target.value)} required style={{ display: 'block', marginBottom: '8px', padding: '8px', width: '250px' }} />
        <input type="text" placeholder="Presidente 2 (Opzionale)" value={pres2} onChange={(e) => setPres2(e.target.value)} style={{ display: 'block', marginBottom: '8px', padding: '8px', width: '250px' }} />
        <input type="number" placeholder="Budget" value={budget} onChange={(e) => setBudget(e.target.value)} style={{ display: 'block', marginBottom: '8px', padding: '8px', width: '250px' }} />
        <button type="submit" style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>Crea Squadra</button>
      </form>
    </div>
  );
}
