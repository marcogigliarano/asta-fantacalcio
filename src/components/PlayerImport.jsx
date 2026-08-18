import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { sql } from '../lib/db';

export default function PlayerImport({ playersCount, onImportComplete }) {
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);

  const parseListValue = (row) => {
    const preferredCandidates = [];
    const fallbackCandidates = [];

    if (row && typeof row === 'object') {
      Object.entries(row).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;

        const normalizedKey = String(key).trim().toLowerCase();
        const compactKey = normalizedKey.replace(/[^a-z0-9]/g, '');
        const isIdLike = /(id|index|row|numero)/.test(compactKey);

        if (isIdLike) return;

        const isFvm = /(fvm|fvmm)/.test(compactKey);
        const isValueLike = /(valore|prezzo|credit|market|value|list)/.test(compactKey);
        const isQtLike = /(qta|quota.*a|qt.*a)/.test(compactKey);

        if (isFvm || isValueLike) {
          preferredCandidates.push(value);
          return;
        }

        if (isQtLike) {
          fallbackCandidates.push(value);
          return;
        }

        if (/^\d+(?:[.,]\d+)?$/.test(String(value).trim())) {
          fallbackCandidates.push(value);
        }
      });
    }

    const legacyCandidates = [
      row?.['FVM'],
      row?.['FVM M'],
      row?.['Qt.A'],
      row?.['Qt.A.M'],
      row?.list_value,
      row?.listValue,
      row?.valore,
      row?.prezzo,
      row?.crediti,
      row?.credits,
      row?.valore_listone,
      row?.['Valore'],
      row?.['Prezzo'],
      row?.['Crediti'],
      row?.['market value'],
      row?.market_value,
      row?.value,
    ];

    const allCandidates = [...preferredCandidates, ...fallbackCandidates, ...legacyCandidates];

    for (const rawValue of allCandidates) {
      if (rawValue === null || rawValue === undefined || rawValue === '') continue;
      const normalized = Number(String(rawValue).replace(/[^0-9,.-]/g, '').replace(',', '.'));
      if (Number.isFinite(normalized)) return Math.round(normalized);
    }

    return 0;
  };

  const processRows = async (rows) => {
    setLoading(true);
    try {
      if (playersCount > 0) {
        await sql`DELETE FROM players`;
      }

      for (const row of rows) {
        const name = row.Nome || row.name || row.nome;
        const role = (row.Ruolo || row.role || row.R || row.ruolo || '').toString().toUpperCase();
        const real_team = row.Squadra || row.real_team || row.squadra || '';
        const listValue = parseListValue(row);

        if (name && role) {
          await sql`
            INSERT INTO players (name, role, real_team, is_available, price_spent, list_value)
            VALUES (${name}, ${role}, ${real_team}, TRUE, 0, ${listValue})
          `;
        }
      }
      alert('Listone caricato con successo!');
      setConfirmOverwrite(false);
      onImportComplete();
    } catch (err) {
      console.error(err);
      alert('Errore durante il caricamento del listone.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (playersCount > 0 && !confirmOverwrite) {
      alert('Devi prima confermare la sovrascrittura spuntando la casella di controllo.');
      e.target.value = '';
      return;
    }

    const fileExt = file.name.split('.').pop().toLowerCase();

    if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames.includes('Tutti') ? 'Tutti' : wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        let headerIndex = data.findIndex(
          (row) => Array.isArray(row) && row.includes('Nome') && (row.includes('R') || row.includes('Ruolo'))
        );
        if (headerIndex === -1) headerIndex = 0;

        const headers = data[headerIndex];
        const rIndex = headers.findIndex((h) => ['R', 'Ruolo', 'ruolo'].includes(String(h || '').trim()));
        const nameIndex = headers.findIndex((h) => ['Nome', 'nome'].includes(String(h || '').trim()));
        const teamIndex = headers.findIndex((h) => ['Squadra', 'squadra'].includes(String(h || '').trim()));

        const formattedRows = [];
        for (let i = headerIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const rowObject = {};
          headers.forEach((header, index) => {
            rowObject[header] = row[index];
          });

          formattedRows.push({
            name: row[nameIndex],
            role: row[rIndex],
            real_team: row[teamIndex],
            ...rowObject,
          });
        }
        await processRows(formattedRows);
      };
      reader.readAsBinaryString(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const normalizedRows = results.data.map((row) => ({ ...row }));
          await processRows(normalizedRows);
        },
      });
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '12px' }}>Carica Listone Calciatori (CSV o XLSX)</h3>

      {playersCount > 0 ? (
        <div className="import-panel__warning">
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>
            ⚠️ Listone già presente ({playersCount} calciatori nel database).
          </p>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px' }}>
            Se carichi un nuovo file, <strong>tutti i giocatori attuali, i calciatori aggiunti manualmente e le assegnazioni alle squadre verranno cancellati.</strong>
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={confirmOverwrite}
              onChange={(e) => setConfirmOverwrite(e.target.checked)}
            />
            Confermo di voler sovrascrivere il listone esistente
          </label>
        </div>
      ) : (
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '14px' }}>Nessun calciatore caricato nel database.</p>
      )}

      <div className="import-panel__row">
        <input
          type="file"
          accept=".csv, .xlsx, .xls"
          onChange={handleFileUpload}
          disabled={(playersCount > 0 && !confirmOverwrite) || loading}
        />
      </div>
      {loading && <p className="import-panel__status">Elaborazione in corso...</p>}
    </div>
  );
}
