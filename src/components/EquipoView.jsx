import { useMemo, useState } from 'react'
import { api } from '../services/api'
import useAsync from '../lib/useAsync'
import { fmtInt, roleLabel } from '../lib/format'
import { PageHeader, StatTile, StatGrid, ErrorState, EmptyState, SkeletonRows, Segmented, Notice } from './ui'
import { IconClose, IconPlus, IconTrash } from './ui/Icons'

async function loadTeam() {
  const [users, persons] = await Promise.all([api.users.getAll(), api.persons.getAll().catch(() => [])])
  const phoneByPerson = new Map(persons.map(p => [p.id_person, p.phone]))
  return users
    .filter(u => Number(u.id_role) !== 1)
    .map(u => ({
      id_user: u.id_user,
      id_person: u.id_person,
      name: u.name || u.username || u.email,
      email: u.email,
      phone: phoneByPerson.get(u.id_person) || '',
      id_role: Number(u.id_role),
    }))
}

const EMPTY_INVITE = { name: '', email: '', phone: '', id_role: '3', password: '' }

export default function EquipoView({ user }) {
  const { data, loading, error, reload } = useAsync(loadTeam, [])
  const team = useMemo(() => data || [], [data])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState(EMPTY_INVITE)
  const [inviteCompany, setInviteCompany] = useState(user?.companies?.[0]?.id_company ?? '')
  const [saving, setSaving] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [toDelete, setToDelete] = useState(null)

  const owners = team.filter(m => m.id_role === 2).length
  const managers = team.filter(m => m.id_role === 3).length
  const q = search.trim().toLowerCase()
  const list = team.filter(m =>
    (filter === 'all' || String(m.id_role) === filter) &&
    (!q || m.name.toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q)))

  const flash = (type, text) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  const submitInvite = async (e) => {
    e.preventDefault()
    setInviteError('')
    if (invite.password.length < 8) { setInviteError('La contraseña temporal debe tener al menos 8 caracteres.'); return }
    if (!inviteCompany) { setInviteError('No hay una empresa a la cual asignar el miembro.'); return }
    setSaving(true)
    try {
      const person = await api.persons.create({ name: invite.name.trim(), email: invite.email.trim(), phone: invite.phone.trim() || null })
      if (!person?.id_person) throw new Error('El servidor no devolvió el identificador de la persona.')
      await api.users.create({
        id_person: person.id_person,
        id_company: Number(inviteCompany),
        id_role: Number(invite.id_role),
        password_hash: invite.password,
      })
      setShowInvite(false)
      setInvite(EMPTY_INVITE)
      flash('success', `${invite.name.trim()} se agregó al equipo como ${roleLabel(invite.id_role)}. Comparte con esta persona su contraseña temporal.`)
      reload()
    } catch (err) {
      setInviteError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    const member = toDelete
    setToDelete(null)
    try {
      await api.users.remove(member.id_user)
      flash('success', `${member.name} fue retirado del equipo.`)
      reload()
    } catch (err) {
      flash('error', `No se pudo retirar a ${member.name}: ${err.message}`)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Equipo"
        subtitle={user?.company_name ? `Miembros con acceso a ${user.company_name}` : 'Miembros con acceso a tu empresa'}
        actions={<button className="btn-primary" onClick={() => { setInviteError(''); setShowInvite(true) }}><IconPlus size={16} /> Agregar miembro</button>}
      />

      {error && <ErrorState message={error.message} onRetry={reload} />}
      {feedback && <div className={`alert-message ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`} role="status">{feedback.text}</div>}

      <StatGrid>
        <StatTile label="Miembros" value={fmtInt(team.length)} loading={loading && !data} />
        <StatTile label="Owners" value={fmtInt(owners)} hint="Acceso completo y financiero" loading={loading && !data} />
        <StatTile label="Managers" value={fmtInt(managers)} hint="Acceso operativo, sin finanzas" loading={loading && !data} />
      </StatGrid>

      <div className="toolbar">
        <Segmented
          label="Filtrar por rol"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: `Todos (${team.length})` },
            { value: '2', label: `Owners (${owners})` },
            { value: '3', label: `Managers (${managers})` },
          ]}
        />
        <input className="input-control toolbar-search" placeholder="Buscar por nombre o correo" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar miembro" />
      </div>

      <div className="card card-flush">
        {loading && !data ? <div style={{ padding: 20 }}><SkeletonRows rows={3} /></div> : list.length === 0 ? (
          <EmptyState title="Sin miembros que coincidan" />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Rol</th><th aria-label="Acciones" /></tr>
              </thead>
              <tbody>
                {list.map(m => {
                  const self = m.id_user === user?.id_user
                  return (
                    <tr key={m.id_user}>
                      <td>
                        <div className="person-cell">
                          <span className="person-avatar" aria-hidden="true">{(m.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                          <span className="cell-strong">{m.name}{self && <span className="cell-muted"> (tú)</span>}</span>
                        </div>
                      </td>
                      <td className="cell-muted">{m.email}</td>
                      <td className="cell-muted">{m.phone || '—'}</td>
                      <td><span className={`badge ${m.id_role === 2 ? 'badge-primary' : 'badge-neutral'}`}>{roleLabel(m.id_role)}</span></td>
                      <td className="num">
                        {!self && (
                          <button type="button" className="icon-btn icon-btn-danger" onClick={() => setToDelete(m)} aria-label={`Retirar a ${m.name}`} title="Retirar del equipo">
                            <IconTrash size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Notice>El cambio de rol de un usuario existente lo realiza el Super Admin desde el panel de administración.</Notice>

      {showInvite && (
        <div className="modal-backdrop" onClick={() => !saving && setShowInvite(false)} role="dialog" aria-modal="true" aria-labelledby="invite-title">
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 id="invite-title" className="modal-title">Agregar miembro</h2>
                <p className="modal-subtitle">Crea el acceso con una contraseña temporal</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowInvite(false)} aria-label="Cerrar"><IconClose size={16} /></button>
            </div>
            {inviteError && <div className="alert-message alert-error" role="alert">{inviteError}</div>}
            <form onSubmit={submitInvite} className="account-form">
              <fieldset disabled={saving} style={{ border: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label htmlFor="inv-name">Nombre completo</label>
                  <input id="inv-name" className="input-control" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} required />
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="inv-email">Correo</label>
                    <input id="inv-email" type="email" className="input-control" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="inv-phone">Teléfono <span className="label-hint">(opcional)</span></label>
                    <input id="inv-phone" type="tel" className="input-control" value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="inv-role">Rol</label>
                    <select id="inv-role" className="input-control" value={invite.id_role} onChange={(e) => setInvite({ ...invite, id_role: e.target.value })}>
                      <option value="3">Manager — operativo</option>
                      <option value="2">Owner — completo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="inv-company">Empresa</label>
                    <select id="inv-company" className="input-control" value={inviteCompany} onChange={(e) => setInviteCompany(e.target.value)}>
                      {(user?.companies || []).map(c => <option key={c.id_company} value={c.id_company}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="inv-pass">Contraseña temporal</label>
                  <input id="inv-pass" type="text" className="input-control mono" value={invite.password} onChange={(e) => setInvite({ ...invite, password: e.target.value })} minLength={8} required autoComplete="off" />
                  <span className="field-hint">Mínimo 8 caracteres. El miembro podrá cambiarla desde “Mi cuenta” o con “Olvidé mi contraseña”.</span>
                </div>
              </fieldset>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowInvite(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Agregar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toDelete && (
        <div className="modal-backdrop" onClick={() => setToDelete(null)} role="alertdialog" aria-modal="true" aria-labelledby="del-title">
          <div className="modal-container modal-sm" onClick={(e) => e.stopPropagation()}>
            <h2 id="del-title" className="modal-title">Retirar miembro</h2>
            <p className="modal-subtitle" style={{ margin: '8px 0 20px' }}>
              {toDelete.name} perderá el acceso a la plataforma. Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setToDelete(null)}>Cancelar</button>
              <button className="btn-primary btn-danger" onClick={confirmDelete}>Retirar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
