import React, { useState } from 'react';

const ROLE_TARGETS = { P: 3, D: 8, C: 8, A: 6 };

export default function TeamsGrid({ teams, players, onSelectTeam, onAddTeam, onEditTeam, onDeleteTeam }) {
  const [displayMode, setDisplayMode] = useState('scroll');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="teams-panel">
      <div className="teams-strip__header">
        <div className="section-title">
          <span>Squadre</span>
        </div>

        <div className="section-actions">
          <div className="segmented-control">
            <button
              type="button"
              className={displayMode === 'scroll' ? 'is-active' : ''}
              onClick={() => setDisplayMode('scroll')}
            >
              1-Row Scroll
            </button>
            <button
              type="button"
              className={displayMode === 'grid' ? 'is-active' : ''}
              onClick={() => setDisplayMode('grid')}
            >
              2-Row Grid
            </button>
          </div>

          <button type="button" className="ghost-button" onClick={() => setIsCollapsed((current) => !current)}>
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>

          <button type="button" className="primary-button" onClick={onAddTeam}>
            + Aggiungi Squadra
          </button>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="empty-state">
          Nessuna squadra creata. Clicca su <strong>+ Aggiungi Squadra</strong> per iniziare.
        </div>
      ) : (
        <div className={`teams-strip ${displayMode === 'grid' ? 'teams-strip--grid' : ''} ${isCollapsed ? 'is-collapsed' : ''}`}>
          {teams.map((team) => {
            const teamPlayers = players.filter((p) => p.assigned_team_id === team.id);
            const spentCredits = teamPlayers.reduce((acc, p) => acc + (Number(p.price_spent) || 0), 0);
            const remainingCredits = Number(team.budget || 0) - spentCredits;

            const pCount = teamPlayers.filter((p) => p.role === 'P').length;
            const dCount = teamPlayers.filter((p) => p.role === 'D').length;
            const cCount = teamPlayers.filter((p) => p.role === 'C').length;
            const aCount = teamPlayers.filter((p) => p.role === 'A').length;

            const roleSummary = [
              { key: 'P', count: pCount, target: ROLE_TARGETS.P, className: 'role-pill--p' },
              { key: 'D', count: dCount, target: ROLE_TARGETS.D, className: 'role-pill--d' },
              { key: 'C', count: cCount, target: ROLE_TARGETS.C, className: 'role-pill--c' },
              { key: 'A', count: aCount, target: ROLE_TARGETS.A, className: 'role-pill--a' },
            ];

            const presidents = [team.president_1, team.president_2].filter(Boolean).join(' & ');
            const budgetRatio = Number(team.budget || 0) > 0 ? Math.min(100, (spentCredits / Number(team.budget)) * 100) : 0;
            const progressClass = remainingCredits / Math.max(Number(team.budget || 1), 1) > 0.5 ? 'budget-progress__fill' : remainingCredits / Math.max(Number(team.budget || 1), 1) > 0.2 ? 'budget-progress__fill budget-progress__fill--warning' : 'budget-progress__fill budget-progress__fill--danger';

            return (
              <article
                key={team.id}
                className="team-card"
                onClick={() => onSelectTeam(team)}
              >
                <div className="team-card__header">
                  <div className="team-card__title" title={team.name}>{team.name}</div>
                  <div className="team-card__actions">
                    <button
                      type="button"
                      className="icon-button"
                      title="Modifica squadra"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditTeam(team);
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      title="Elimina squadra"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteTeam(team);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {presidents && (
                  <div className="team-card__president">👑 {presidents}</div>
                )}

                <div className="team-card__budget">
                  <div className="team-card__budget-row">
                    <span>Budget</span>
                    <span className="team-card__budget-remaining" style={{ color: remainingCredits < 0 ? 'var(--danger)' : 'var(--text-main)' }}>
                      {remainingCredits} / {team.budget}
                    </span>
                  </div>

                  <div className="budget-progress">
                    <div className={progressClass} style={{ width: `${Math.max(6, 100 - budgetRatio)}%` }} />
                  </div>
                </div>

                <div className="team-card__slots">
                  {roleSummary.map(({ key, count, target, className }) => {
                    const isFull = count >= target;

                    return (
                      <div
                        key={key}
                        className={`role-pill ${className} ${isFull ? 'role-pill--full' : ''}`}
                        title={isFull ? `${key} quota raggiunta` : `${key} ${count}/${target}`}
                      >
                        {isFull ? (
                          <>
                            <span className="role-pill__label">{key}</span>
                            <span className="role-pill__check">✓</span>
                          </>
                        ) : (
                          <>
                            <span className="role-pill__label">{key}</span>
                            <span className="role-pill__count">{count}/{target}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
