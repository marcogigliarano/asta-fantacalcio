import React from 'react';
import PlayerImport from './PlayerImport';

export default function Settings({ playersCount, onUpdate }) {
  return (
    <div className="settings-shell">
      <div className="settings-header">
        <h2>⚙️ Impostazioni e Gestione Listone</h2>
      </div>
      <div className="import-panel">
        <PlayerImport playersCount={playersCount} onImportComplete={onUpdate} />
      </div>
    </div>
  );
}
