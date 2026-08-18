import React, { useState, useEffect } from 'react';
import { sql } from '../lib/db';

export default function TeamModal({ teamToEdit, onClose, onSave }) {
  const [name, setName] = useState('');
  const [president1, setPresident1] = useState('');
  const [president2, setPresident2] = useState('');
  const [budget, setBudget] = useState(1000);

  useEffect(() => {
    if (teamToEdit) {
      setName(teamToEdit.name || '');
      setPresident1(teamToEdit.president_1 || '');
      setPresident2(teamToEdit.president_2 || '');
      setBudget(teamToEdit.budget || 1000);
    } else {
      setName('');
      setPresident1('');
      setPresident2('');
      setBudget(1000);
    }
  }, [teamToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (teamToEdit) {
      await sql`
        UPDATE teams
        SET name = ${name}, president_1 = ${president1}, president_2 = ${president2}, budget = ${budget}
        WHERE id = ${teamToEdit.id}
      `;
    } else {
      await sql`
        INSERT INTO teams (name, president_1, president_2, budget)
        VALUES (${name}, ${president1}, ${president2}, ${budget})
      `;
    }

    onSave();
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <h3 className="modal-panel__title">
          {teamToEdit ? `Modifica squadra` : 'Nuova squadra'}
        </h3>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-field form-field--stack">
            <label htmlFor="team-name">Nome squadra</label>
            <input
              id="team-name"
              type="text"
              placeholder="Es. UomoControUomo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-field form-field--stack">
            <label htmlFor="president-1">Presidente 1</label>
            <input
              id="president-1"
              type="text"
              placeholder="Es. Giovambattista Martino"
              value={president1}
              onChange={(e) => setPresident1(e.target.value)}
            />
          </div>

          <div className="form-field form-field--stack">
            <label htmlFor="president-2">Presidente 2</label>
            <input
              id="president-2"
              type="text"
              placeholder="Es. Marco Gigliarano"
              value={president2}
              onChange={(e) => setPresident2(e.target.value)}
            />
          </div>

          <div className="form-field form-field--stack">
            <label htmlFor="budget">Budget iniziale</label>
            <input
              id="budget"
              type="number"
              min="1"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Annulla
            </button>
            <button type="submit" className="primary-button">
              {teamToEdit ? 'Salva modifiche' : 'Crea squadra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
