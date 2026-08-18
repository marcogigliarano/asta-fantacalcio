import React, { useState } from 'react';
import { sql } from '../lib/db';

const getListValue = (player) => Number(player?.list_value ?? player?.price_spent ?? 0) || 0;

export default function PlayerSearch({ players, currentRole, swapMode, onSelectPlayer, onExecuteSwap, onPlayerAdded }) {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortMode, setSortMode] = useState('value');
  const [sortDirection, setSortDirection] = useState('desc');

  // Form per nuovo giocatore
  const [newName, setNewName] = useState('');
  const [newTeam, setNewTeam] = useState('');

  // Form per modifica giocatore
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('P');
  const [editTeam, setEditTeam] = useState('');

  const searchLower = search.toLowerCase();

  // Lista squadre Serie A
  const serieATeams = Array.from(
    new Set(players.map((p) => p.real_team).filter((team) => team && team.trim() !== ''))
  ).sort();

  const filtered = players.filter(
    (p) =>
      p.is_available &&
      p.role === currentRole &&
      (p.name.toLowerCase().includes(searchLower) ||
       (p.real_team && p.real_team.toLowerCase().includes(searchLower)))
  );

  const sortedPlayers = [...filtered].sort((a, b) => {
    if (sortMode === 'value') {
      const aValue = getListValue(a);
      const bValue = getListValue(b);
      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    }

    const result = (a.name || '').localeCompare(b.name || '');
    return sortDirection === 'asc' ? result : -result;
  });

  // 1. Aggiunta rapida
  const handleAddManualPlayer = async (e) => {
    e.preventDefault();
    if (!newName) return;

    await sql`
      INSERT INTO players (name, role, real_team, is_available)
      VALUES (${newName}, ${currentRole}, ${newTeam || 'Svincolato'}, TRUE)
    `;

    setNewName('');
    setNewTeam('');
    setShowAddForm(false);
    onPlayerAdded();
  };

  // 2. Avvio Modifica
  const handleStartEdit = (player) => {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditRole(player.role);
    setEditTeam(player.real_team || '');
  };

  // 3. Salvataggio Modifica
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPlayer || !editName) return;

    await sql`
      UPDATE players
      SET name = ${editName}, role = ${editRole}, real_team = ${editTeam || 'Svincolato'}
      WHERE id = ${editingPlayer.id}
    `;

    setEditingPlayer(null);
    onPlayerAdded();
  };

  // 4. Eliminazione
  const handleDeletePlayer = async (player) => {
    if (!window.confirm(`Vuoi davvero eliminare ${player.name} dal database?`)) return;

    await sql`DELETE FROM players WHERE id = ${player.id}`;
    onPlayerAdded();
  };

  return (
    <div className="form-card player-search">
      <div className="search-toolbar">
        <h3>Cerca Giocatore ({currentRole})</h3>
        <button
          type="button"
          className={`primary-button ${showAddForm ? 'secondary-button' : ''}`}
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ minWidth: '180px' }}
        >
          {showAddForm ? 'Chiudi' : '➕ Aggiungi calciatore'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddManualPlayer} className="form-card" style={{ background: '#f8fafc', marginBottom: '12px' }}>
          <div className="form-card__title">Nuovo giocatore · {currentRole}</div>
          <div className="form-row">
            <div className="form-field">
              <label>Nome e cognome</label>
              <input
                type="text"
                placeholder="Nome e Cognome"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Squadra</label>
              <select value={newTeam} onChange={(e) => setNewTeam(e.target.value)}>
                <option value="">-- Seleziona Squadra Serie A --</option>
                {serieATeams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
                <option value="Svincolato">Svincolato / Altro</option>
              </select>
            </div>
            <div className="form-field" style={{ maxWidth: '120px' }}>
              <label>&nbsp;</label>
              <button type="submit" className="primary-button" style={{ width: '100%' }}>
                Salva
              </button>
            </div>
          </div>
        </form>
      )}

      {editingPlayer && (
        <form onSubmit={handleSaveEdit} className="form-card" style={{ background: '#eef5ff', marginBottom: '12px' }}>
          <div className="form-card__title">Modifica: {editingPlayer.name}</div>
          <div className="form-row">
            <div className="form-field">
              <label>Nome</label>
              <input
                type="text"
                placeholder="Nome"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="form-field" style={{ maxWidth: '100px' }}>
              <label>Ruolo</label>
              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                <option value="P">P</option>
                <option value="D">D</option>
                <option value="C">C</option>
                <option value="A">A</option>
              </select>
            </div>
            <div className="form-field">
              <label>Squadra</label>
              <select value={editTeam} onChange={(e) => setEditTeam(e.target.value)}>
                <option value="">-- Squadra Serie A --</option>
                {serieATeams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
                <option value="Svincolato">Svincolato / Altro</option>
              </select>
            </div>
            <div className="form-field" style={{ maxWidth: '180px' }}>
              <label>&nbsp;</label>
              <div className="form-row" style={{ gap: '8px' }}>
                <button type="submit" className="primary-button" style={{ flex: '1' }}>
                  Salva
                </button>
                <button type="button" className="secondary-button" onClick={() => setEditingPlayer(null)}>
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="search-shell">
        <input
          className="search-field"
          type="text"
          placeholder="Cerca per nome o squadra..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff' }}
          >
            <option value="name">Ordina: Nome</option>
            <option value="value">Ordina: Valore</option>
          </select>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')}
            title={sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        <div className="search-count">{filtered.length}</div>
      </div>

      <div className="player-list" style={{ maxHeight: '360px', overflowY: 'auto' }}>
        {sortedPlayers.length === 0 ? (
          <div className="empty-state" style={{ margin: '10px', borderStyle: 'dashed' }}>
            Nessun calciatore trovato.
          </div>
        ) : (
          sortedPlayers.map((p) => (
            <div key={p.id} className="player-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <span className={`player-row__role-badge role-${p.role.toLowerCase()}`}>{p.role}</span>
                <div className="player-meta">
                  <span className="player-meta__name">{p.name}</span>
                  <span className="player-meta__club">{p.real_team || 'Svincolato'}</span>
                </div>
              </div>

              <div className="player-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    minWidth: '66px',
                    padding: '5px 8px',
                    borderRadius: '999px',
                    background: '#eef2ff',
                    color: '#4338ca',
                    fontSize: '12px',
                    fontWeight: '800',
                    textAlign: 'center',
                  }}
                  title="Valore listone"
                >
                  {getListValue(p)}
                </span>
                {swapMode ? (
                  <button type="button" className="swap-button" onClick={() => onExecuteSwap(p)}>
                    Sostituisci
                  </button>
                ) : (
                  <button type="button" className="select-button" onClick={() => onSelectPlayer(p)}>
                    Seleziona
                  </button>
                )}
                <button type="button" onClick={() => handleStartEdit(p)} title="Modifica">
                  ✏️
                </button>
                <button type="button" className="danger-button" onClick={() => handleDeletePlayer(p)} title="Elimina">
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
