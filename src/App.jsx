import React, { useState, useEffect } from 'react';
import { sql } from './lib/db';
import TeamsGrid from './components/TeamsGrid';
import TeamDetail from './components/TeamDetail';
import PlayerSearch from './components/PlayerSearch';
import Settings from './components/Settings';
import AssignPlayerModal from './components/AssignPlayerModal';
import TeamModal from './components/TeamModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';

const ROLE_LABELS = {
  P: 'Portieri',
  D: 'Difensori',
  C: 'Centrocampisti',
  A: 'Attaccanti',
  ALL: 'Tutti',
};

const getListValue = (player) => Number(player?.list_value ?? player?.price_spent ?? 0) || 0;

export default function App() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentRole, setCurrentRole] = useState('P');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [swapMode, setSwapMode] = useState(false);
  const [playerToSwapOut, setPlayerToSwapOut] = useState(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTeamId, setSelectedTeamId] = useState(() => {
    const match = window.location.pathname.match(/^\/team\/(\d+)$/);
    return match ? Number(match[1]) : null;
  });
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [teamToDelete, setTeamToDelete] = useState(null);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null;
  const auctionedPlayers = players.filter((player) => player.assigned_team_id !== null).length;

  const updateRoute = (path) => {
    const nextPath = path || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  };

  const goToDashboard = () => {
    setSelectedTeamId(null);
    setActiveTab('dashboard');
    updateRoute('/');
  };

  const goToSettings = () => {
    setSelectedTeamId(null);
    setActiveTab('settings');
    updateRoute('/settings');
  };

  const openTeam = (team) => {
    if (!team) {
      goToDashboard();
      return;
    }

    setSelectedTeamId(team.id);
    setActiveTab('dashboard');
    updateRoute(`/team/${team.id}`);
  };

  const closeTeamDetail = () => {
    setSelectedTeamId(null);
    setActiveTab('dashboard');
    updateRoute('/');
  };

  const fetchData = async () => {
    try {
      const teamsRes = await sql`SELECT * FROM teams ORDER BY id ASC`;
      const playersRes = await sql`SELECT * FROM players ORDER BY name ASC`;
      const normalizedPlayers = playersRes.map((player) => ({
        ...player,
        list_value: player.list_value ?? player.price_spent ?? 0,
      }));

      setTeams(teamsRes);
      setPlayers(normalizedPlayers);

      if (selectedTeamId && !teamsRes.some((team) => team.id === selectedTeamId)) {
        setSelectedTeamId(null);
        if (window.location.pathname.startsWith('/team/')) {
          updateRoute('/');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const syncFromUrl = () => {
      const match = window.location.pathname.match(/^\/team\/(\d+)$/);
      const nextId = match ? Number(match[1]) : null;
      setSelectedTeamId(nextId);
      setActiveTab(nextId ? 'dashboard' : (window.location.pathname === '/settings' ? 'settings' : 'dashboard'));
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);

    fetchData();
    const interval = setInterval(fetchData, 2500);

    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      clearInterval(interval);
    };
  }, []);

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    await sql`
      UPDATE players
      SET assigned_team_id = NULL, price_spent = 0, is_available = TRUE
      WHERE assigned_team_id = ${teamToDelete.id}
    `;

    await sql`DELETE FROM teams WHERE id = ${teamToDelete.id}`;

    setTeamToDelete(null);
    fetchData();
  };

  const handleExecuteSwap = async (newPlayer) => {
    if (!playerToSwapOut) return;

    const oldPrice = playerToSwapOut.price_spent;
    const teamId = playerToSwapOut.assigned_team_id;

    await sql`UPDATE players SET assigned_team_id = NULL, price_spent = 0, is_available = TRUE WHERE id = ${playerToSwapOut.id}`;
    await sql`UPDATE players SET assigned_team_id = ${teamId}, price_spent = ${oldPrice}, is_available = FALSE WHERE id = ${newPlayer.id}`;

    setSwapMode(false);
    setPlayerToSwapOut(null);
    fetchData();
  };

  const liveActivity = [...players]
    .filter((player) => player.assigned_team_id !== null && Number(player.price_spent) > 0)
    .sort((a, b) => Number(b.price_spent) - Number(a.price_spent))
    .slice(0, 5)
    .map((player) => {
      const team = teams.find((item) => item.id === player.assigned_team_id);
      return {
        id: player.id,
        playerName: player.name,
        teamName: team ? team.name : 'Squadra',
        price: Number(player.price_spent) || 0,
      };
    });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">⚽</span>
          <span>Asta Fantacalcio Live</span>
        </div>

        <div className="topbar-actions">
          <div className="stat-chip">
            <span className="stat-chip__label">Giocatori acquistati</span>
            <span className="stat-chip__value">{auctionedPlayers}</span>
          </div>

          <button
            type="button"
            className={`nav-button ${activeTab === 'dashboard' && !selectedTeam ? 'nav-button--active' : ''}`}
            onClick={goToDashboard}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`nav-button ${activeTab === 'settings' && !selectedTeam ? 'nav-button--active' : ''}`}
            onClick={goToSettings}
          >
            Impostazioni
          </button>
        </div>
      </header>

      {selectedTeam ? (
        <div className="workspace-grid workspace-grid--single" style={{ marginTop: '18px' }}>
          <div className="panel-card main-column">
            <TeamDetail
              team={selectedTeam}
              players={players}
              onBack={closeTeamDetail}
              onUpdate={fetchData}
            />
          </div>
        </div>
      ) : activeTab === 'settings' ? (
        <div style={{ marginTop: '20px' }}>
          <Settings playersCount={players.length} onUpdate={fetchData} />
        </div>
      ) : (
        <>
          <TeamsGrid
            teams={teams}
            players={players}
            onSelectTeam={openTeam}
            onAddTeam={() => {
              setTeamToEdit(null);
              setShowTeamModal(true);
            }}
            onEditTeam={(team) => {
              setTeamToEdit(team);
              setShowTeamModal(true);
            }}
            onDeleteTeam={(team) => setTeamToDelete(team)}
          />

          <div className="workspace-grid">
            <div className="panel-card main-column">
              <div className="board-header">
                <div>
                  <div className="eyebrow">Board d'asta</div>
                  <h2>Mercato disponibili</h2>
                </div>
              </div>

              <div className="role-tabs" style={{ marginBottom: '18px' }}>
                {['P', 'D', 'C', 'A'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    className={`role-tab ${currentRole === role ? 'is-active' : ''}`}
                    onClick={() => setCurrentRole(role)}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>

              <PlayerSearch
                players={players}
                currentRole={currentRole}
                swapMode={swapMode}
                onSelectPlayer={(player) => setSelectedPlayer(player)}
                onExecuteSwap={handleExecuteSwap}
                onPlayerAdded={fetchData}
              />
            </div>

            <aside className="panel-card sidebar-column">
              <div className="sidebar-card">
                <div className="sidebar-card__header">
                  <div className="eyebrow">Attività live</div>
                </div>

                {liveActivity.length === 0 ? (
                  <div className="empty-state">Nessun acquisto completato.</div>
                ) : (
                  <ul className="activity-list">
                    {liveActivity.map((item) => (
                      <li key={item.id} className="activity-item">
                        <div className="activity-item__meta">
                          <span className="activity-item__label">{item.playerName}</span>
                          <span className="activity-item__sub">{item.teamName}</span>
                        </div>
                        <span className="activity-item__value">{item.price} cr</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </>
      )}

      {showTeamModal && (
        <TeamModal
          teamToEdit={teamToEdit}
          onClose={() => {
            setShowTeamModal(false);
            setTeamToEdit(null);
          }}
          onSave={fetchData}
        />
      )}

      {teamToDelete && (
        <DeleteConfirmModal
          team={teamToDelete}
          onClose={() => setTeamToDelete(null)}
          onConfirm={confirmDeleteTeam}
        />
      )}

      {selectedPlayer && (
        <AssignPlayerModal
          player={selectedPlayer}
          players={players}
          teams={teams}
          onClose={() => setSelectedPlayer(null)}
          onAssigned={fetchData}
        />
      )}
    </div>
  );
}
