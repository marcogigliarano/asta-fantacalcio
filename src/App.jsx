import React, { useState, useEffect, useMemo } from 'react';
import {
  SignIn,
  UserButton,
  useAuth,
  useUser,
} from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sql } from './lib/db';
import TeamsGrid from './components/TeamsGrid';
import TeamDetail from './components/TeamDetail';
import PlayerSearch from './components/PlayerSearch';
import Settings from './components/Settings';
import AssignPlayerModal from './components/AssignPlayerModal';
import TeamModal from './components/TeamModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import { apiRequest, configureApiAuth } from './lib/db';

const ROLE_LABELS = {
  P: 'Portieri',
  D: 'Difensori',
  C: 'Centrocampisti',
  A: 'Attaccanti',
  ALL: 'Tutti',
};

const DEFAULT_ADMIN_EMAILS = [
  import.meta.env.VITE_ADMIN_EMAILS || '',
  import.meta.env.VITE_ADMIN_EMAIL || '',
]
  .flatMap((value) => value.split(','))
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)
  .filter((email, index, emails) => emails.indexOf(email) === index);

const normalizeAccessUser = (row) => ({
  email: String(row.email || '').trim().toLowerCase(),
  role: row.role === 'admin' ? 'admin' : 'user',
  isActive: row.is_active !== false && row.is_active !== 0,
  teamId: row.team_id ?? null,
});

const fetchUsersFromDb = async () => {
  try {
    const rows = await sql`SELECT email, role, is_active, team_id FROM app_users ORDER BY email ASC`;
    return rows.map(normalizeAccessUser);
  } catch (err) {
    console.warn('Unable to load app_users from Neon:', err);
    return DEFAULT_ADMIN_EMAILS.map((email) => ({ email, role: 'admin', isActive: true }));
  }
};

const getListValue = (player) => Number(player?.list_value ?? player?.price_spent ?? 0) || 0;

function UserAccessManager({ teams }) {
  const { user } = useUser();
  const currentUserEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshUsers = async () => {
    const nextUsers = await fetchUsersFromDb();
    setUsers(nextUsers);
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const currentUserEntry = useMemo(
    () => users.find((entry) => entry.email.toLowerCase() === currentUserEmail),
    [users, currentUserEmail]
  );

  const isAdmin = Boolean(
    currentUserEntry?.role === 'admin' && currentUserEntry?.isActive !== false
      || (
        DEFAULT_ADMIN_EMAILS.includes(currentUserEmail)
      )
  );

  const addUser = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const teamId = String(formData.get('team_id') || '');
    if (!email || !password) return;

    try {
      setError('');
      setIsSubmitting(true);
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, teamId: teamId ? Number(teamId) : null }),
      });
      e.currentTarget.reset();
      await refreshUsers();
    } catch (err) {
      console.error('Failed to add user:', err);
      setError(err.message || 'Impossibile aggiungere l’utente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (email) => {
    try {
      const nextValue = !users.find((entry) => entry.email.toLowerCase() === email.toLowerCase())?.isActive;
      await sql`
        UPDATE app_users
        SET is_active = ${nextValue}
        WHERE email = ${email.toLowerCase()}
      `;
      await refreshUsers();
    } catch (err) {
      console.error('Failed to toggle active state:', err);
    }
  };

  const toggleAdmin = async (email) => {
    try {
      const current = users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
      const nextRole = current?.role === 'admin' ? 'user' : 'admin';

      await sql`
        UPDATE app_users
        SET role = ${nextRole}
        WHERE email = ${email.toLowerCase()}
      `;
      await refreshUsers();
    } catch (err) {
      console.error('Failed to toggle admin role:', err);
    }
  };

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="panel-card" style={{ marginTop: '20px', padding: '24px' }}>
        <h2>Accesso non autorizzato</h2>
        <p>Il tuo account non ha i permessi per gestire gli utenti.</p>
      </div>
    );
  }

  return (
    <div className="panel-card" style={{ marginTop: '20px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div>
          <div className="eyebrow">Amministrazione</div>
          <h2 style={{ margin: 0 }}>Utenti e accessi</h2>
        </div>
        <UserButton />
      </div>

      <form onSubmit={addUser} style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="email"
          name="email"
          placeholder="nuovo.utente@email.com"
          style={{ flex: '1', minWidth: '220px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d1d5db' }}
        />
        <input
          type="password"
          name="password"
          placeholder="Password (min. 15 caratteri)"
          minLength={15}
          required
          style={{ flex: '1', minWidth: '220px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d1d5db' }}
        />
        <select name="team_id" defaultValue="" style={{ minWidth: '180px', padding: '10px 12px', borderRadius: '10px', border: '1px solid #d1d5db' }}>
          <option value="">Nessuna squadra</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Creazione...' : 'Aggiungi utente'}
        </button>
      </form>
      {error && <p style={{ color: '#b91c1c', marginBottom: '16px' }}>{error}</p>}

      <div style={{ display: 'grid', gap: '12px' }}>
        {users.length === 0 ? (
          <p>Nessun utente configurato.</p>
        ) : (
          users.map((entry) => (
            <div key={entry.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 14px', border: '1px solid #dfe3ea', borderRadius: '12px', background: '#f8fafc' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{entry.email}</div>
                <div style={{ color: '#64748b', fontSize: '12px' }}>
                  {entry.role === 'admin' ? 'Admin' : 'Utente'} • {entry.isActive === false ? 'Disabilitato' : 'Abilitato'}
                  {entry.teamId && ` • ${teams.find((team) => team.id === entry.teamId)?.name || 'Squadra assegnata'}`}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className="secondary-button" onClick={() => toggleAdmin(entry.email)}>
                  {entry.role === 'admin' ? 'Rimuovi admin' : 'Rendi admin'}
                </button>
                <button type="button" className="secondary-button" onClick={() => toggleActive(entry.email)}>
                  {entry.isActive === false ? 'Abilita' : 'Disabilita'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentRole, setCurrentRole] = useState('P');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [swapMode, setSwapMode] = useState(false);
  const [playerToSwapOut, setPlayerToSwapOut] = useState(null);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [accessUsers, setAccessUsers] = useState([]);
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const teamMatch = location.pathname.match(/^\/team\/(\d+)$/);
  const selectedTeamId = teamMatch ? Number(teamMatch[1]) : null;
  const activeTab = location.pathname === '/settings'
    ? 'settings'
    : location.pathname === '/users'
      ? 'users'
      : 'dashboard';

  useEffect(() => {
    configureApiAuth(getToken);
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && !user && !location.pathname.startsWith('/login')) {
      navigate('/login', { replace: true });
    } else if (isLoaded && user && location.pathname === '/login') {
      navigate('/', { replace: true });
    }
  }, [isLoaded, user, location.pathname, navigate]);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null;
  const auctionedPlayers = players.filter((player) => player.assigned_team_id !== null).length;

  const refreshAccessUsers = async () => {
    const users = await fetchUsersFromDb();
    setAccessUsers(users);
  };

  useEffect(() => {
    if (user) {
      refreshAccessUsers();
    }
  }, [user]);

  const currentUserEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
  const currentAccessEntry = accessUsers.find((entry) => entry.email.toLowerCase() === currentUserEmail);
  const hasAccess = Boolean(
    user &&
    (
      currentAccessEntry?.isActive !== false
        || DEFAULT_ADMIN_EMAILS.includes(currentUserEmail)
    )
  );
  const isAdmin = Boolean(
    user && (
      currentAccessEntry?.role === 'admin' && currentAccessEntry?.isActive !== false
        || DEFAULT_ADMIN_EMAILS.includes(currentUserEmail)
    )
  );

  const updateRoute = (path) => {
    const nextPath = path || '/';
    if (window.location.pathname !== nextPath) {
      navigate(nextPath);
    }
  };

  const goToDashboard = () => {
    updateRoute('/');
  };

  const goToSettings = () => {
    updateRoute('/settings');
  };

  const goToUsers = () => {
    updateRoute('/users');
  };

  const openTeam = (team) => {
    if (!team) {
      goToDashboard();
      return;
    }

    updateRoute(`/team/${team.id}`);
  };

  const closeTeamDetail = () => {
    updateRoute('/');
  };

  const fetchData = async () => {
    try {
      const teamsRes = await sql`SELECT * FROM teams ORDER BY id ASC`;
      setTeams(teamsRes);

      const playersRes = await sql`SELECT * FROM players ORDER BY name ASC`;
      const normalizedPlayers = playersRes.map((player) => ({
        ...player,
        list_value: player.list_value ?? player.price_spent ?? 0,
      }));

      setPlayers(normalizedPlayers);

      if (selectedTeamId && !teamsRes.some((team) => team.id === selectedTeamId)) {
        if (location.pathname.startsWith('/team/')) {
          updateRoute('/');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2500);

    return () => {
      clearInterval(interval);
    };
  }, [location.pathname]);

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

  if (!isLoaded) {
    return <div className="app-shell" style={{ padding: '40px' }}>Caricamento...</div>;
  }

  if (!user) {
    if (!location.pathname.startsWith('/login')) {
      return <div className="app-shell" style={{ padding: '40px' }}>Caricamento...</div>;
    }

    return (
      <div className="app-shell" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f7fb' }}>
        <div style={{ maxWidth: '420px', width: '100%' }}>
          <SignIn
            path="/login"
            routing="path"
            signUpUrl={undefined}
            afterSignInUrl="/"
            appearance={{
              elements: {
                rootBox: { width: '100%' },
                card: { width: '100%' },
              },
            }}
          />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f4f7fb' }}>
        <div className="panel-card" style={{ maxWidth: '420px', padding: '32px', textAlign: 'center' }}>
          <h2>Accesso negato</h2>
          <p style={{ color: '#475569' }}>
            Il tuo account non è stato abilitato. Contatta l’amministratore.
          </p>
          <UserButton />
        </div>
      </div>
    );
  }

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
          {isAdmin && (
            <button
              type="button"
              className={`nav-button ${activeTab === 'users' && !selectedTeam ? 'nav-button--active' : ''}`}
              onClick={goToUsers}
            >
              Utenti
            </button>
          )}
          <UserButton />
        </div>
      </header>

      {activeTab === 'users' ? (
        <UserAccessManager teams={teams} />
      ) : selectedTeam ? (
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
