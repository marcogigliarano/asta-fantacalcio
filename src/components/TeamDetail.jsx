import React from 'react';
import { sql } from '../lib/db';

const ROLE_TARGETS = { P: 3, D: 8, C: 8, A: 6 };
const ROLE_NAMES = { P: 'Portieri', D: 'Difensori', C: 'Centrocampisti', A: 'Attaccanti' };

export default function TeamDetail({ team, players, onBack, onUpdate, canEdit }) {
  const teamPlayers = players.filter((p) => p.assigned_team_id === team.id);
  const spentCredits = teamPlayers.reduce((acc, p) => acc + (Number(p.price_spent) || 0), 0);
  const remainingCredits = team.budget - spentCredits;

  const handleReleasePlayer = async (player) => {
    if (!window.confirm(`Svincolare ${player.name} da ${team.name}?`)) return;

    await sql`
      UPDATE players
      SET assigned_team_id = NULL, price_spent = 0, is_available = TRUE
      WHERE id = ${player.id}
    `;
    onUpdate();
  };

  const handleUpdatePlayerPrice = async (player) => {
    const currentPrice = Number(player.price_spent) || 0;
    const currentTeamSpend = teamPlayers.reduce((sum, item) => {
      if (item.id === player.id) return sum;
      return sum + (Number(item.price_spent) || 0);
    }, 0);
    const maxAllowedSpend = Math.max(0, Number(team.budget || 0) - currentTeamSpend);

    const nextValue = window.prompt(
      `Nuovo costo speso per ${player.name}?`,
      String(currentPrice)
    );

    if (nextValue === null) return;

    const parsedValue = Number(nextValue.replace(',', '.'));

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      window.alert('Inserisci un valore numerico valido maggiore o uguale a 0.');
      return;
    }

    const normalizedPrice = Math.round(parsedValue);

    if (normalizedPrice > maxAllowedSpend) {
      window.alert(`Non puoi spendere più di ${maxAllowedSpend} crediti per questo team. Rimanenti: ${maxAllowedSpend}.`);
      return;
    }

    if (normalizedPrice === 0) {
      const shouldRelease = window.confirm(`Impostare 0 crediti per ${player.name} e svincolarlo da ${team.name}?`);
      if (!shouldRelease) return;

      await sql`
        UPDATE players
        SET assigned_team_id = NULL, price_spent = 0, is_available = TRUE
        WHERE id = ${player.id}
      `;
      onUpdate();
      return;
    }

    await sql`
      UPDATE players
      SET price_spent = ${normalizedPrice}, is_available = FALSE
      WHERE id = ${player.id}
    `;

    onUpdate();
  };

  return (
    <div className="team-detail">
      <button type="button" className="team-detail__back" onClick={onBack}>
        ← Torna alla Dashboard
      </button>

      <div className="team-detail__header">
        <div>
          <h2 className="team-detail__title">{team.name}</h2>
          <div className="team-detail__stats">
            <span>Budget iniziale: <strong>{team.budget} crediti</strong></span>
            <span>Spesi: <strong>{spentCredits} crediti</strong></span>
            <span className={remainingCredits < 0 ? 'is-negative' : 'is-positive'}>
              Rimanenti: {remainingCredits} crediti
            </span>
          </div>
        </div>
      </div>

      <div className="team-detail__grid">
        {['P', 'D', 'C', 'A'].map((role) => {
          const rolePlayers = teamPlayers.filter((p) => p.role === role);
          const target = ROLE_TARGETS[role];
          const isComplete = rolePlayers.length === target;
          const roleTotal = rolePlayers.reduce((sum, player) => sum + (Number(player.price_spent) || 0), 0);

          return (
            <div key={role} className="role-panel">
              <div className="role-panel__header">
                <h3 className="role-panel__title">
                  {ROLE_NAMES[role]} <span className="role-panel__title-count">({rolePlayers.length}/{target})</span>
                </h3>
                <span className="role-panel__total">
                  <span className="coin-badge">🪙</span>
                  {roleTotal} cr
                </span>
              </div>

              {rolePlayers.length === 0 ? (
                <p className="role-panel__empty">Nessun giocatore acquistato</p>
              ) : (
                <ul className="role-list">
                  {rolePlayers.map((p) => (
                    <li key={p.id} className="role-list__item">
                      <div className="role-list__info">
                        <span className="role-list__name">{p.name}</span>
                        <span className="role-list__team">{p.real_team}</span>
                      </div>
                      <div className="role-list__meta">
                        {canEdit && <button
                          type="button"
                          className="role-list__price-button"
                          onClick={() => handleUpdatePlayerPrice(p)}
                          title="Modifica costo speso"
                        >
                          {p.price_spent} cr
                        </button>}
                        {canEdit && <button
                          type="button"
                          className="role-list__release"
                          onClick={() => handleReleasePlayer(p)}
                          title="Svincola calciatore"
                        >
                          ✕
                        </button>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
