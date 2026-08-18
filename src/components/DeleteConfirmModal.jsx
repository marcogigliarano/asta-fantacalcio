import React from 'react';

export default function DeleteConfirmModal({ team, onClose, onConfirm }) {
  if (!team) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h3 style={{ marginTop: 0, color: '#dc3545' }}>⚠️ Conferma Eliminazione</h3>
        <p style={{ fontSize: '14px', color: '#333' }}>
          Sei sicuro di voler eliminare la squadra <strong>"{team.name}"</strong>?
        </p>
        <div style={{ fontSize: '13px', color: '#856404', background: '#fff3cd', padding: '10px', borderRadius: '6px', border: '1px solid #ffeeba', marginBottom: '20px' }}>
          <b>Attenzione:</b> Tutti i giocatori acquistati da questa squadra verranno automaticamente svincolati e torneranno tra i disponibili.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Annulla
          </button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Elimina Squadra
          </button>
        </div>
      </div>
    </div>
  );
}
