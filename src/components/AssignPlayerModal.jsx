import React, { useState } from 'react';
import { sql } from '../lib/db';

const ROLE_TARGETS = { P: 3, D: 8, C: 8, A: 6 };

export default function AssignPlayerModal({ player, players = [], teams, onClose, onAssigned }) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');
  const [price, setPrice] = useState(1);

  const currentRoleCount = players.filter(
    (p) => Number(p.assigned_team_id) === Number(selectedTeamId) && p.role === player.role
  ).length;
  const roleLimit = ROLE_TARGETS[player.role] || 0;
  const isRoleFull = currentRoleCount >= roleLimit;

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedTeamId || price < 1) return;
    if (isRoleFull) return;

    await sql`
      UPDATE players
      SET assigned_team_id = ${selectedTeamId}, price_spent = ${price}, is_available = FALSE
      WHERE id = ${player.id}
    `;

    onAssigned();
    onClose();
  };

  if (!player) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h3 style={{ marginTop: 0 }}>Acquista {player.name} ({player.real_team})</h3>

        {teams.length === 0 ? (
          <div>
            <p style={{ color: '#dc3545' }}>Nessuna squadra disponibile. Crea prima una squadra per poter assegnare il giocatore.</p>
            <button onClick={onClose} style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Chiudi
            </button>
          </div>
        ) : (
          <form onSubmit={handleAssign}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Squadra Fantacalcio:</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                required
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {roleLimit > 0 && (
              <div style={{ marginBottom: '12px', fontSize: '0.9rem', color: isRoleFull ? '#dc2626' : '#374151' }}>
                {isRoleFull
                  ? `Quota raggiunta per ${player.role}: ${currentRoleCount}/${roleLimit}. Questa squadra non può ricevere altri ${player.role}.`
                  : `Disponibili: ${roleLimit - currentRoleCount} posti per ${player.role}.`}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Crediti Spesi:</label>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Annulla
              </button>
              <button
                type="submit"
                disabled={isRoleFull}
                style={{
                  padding: '8px 16px',
                  background: isRoleFull ? '#9ca3af' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isRoleFull ? 'not-allowed' : 'pointer',
                  opacity: isRoleFull ? 0.7 : 1
                }}
              >
                Conferma Acquisto
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
