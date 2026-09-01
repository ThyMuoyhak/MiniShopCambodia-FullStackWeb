import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { createUser, deleteUser, listShops, listUsers, updateUser } from '../api';
import { Empty, Loading, Modal, btnPrimary, btnGhost, inputCls } from '../components/ui';

const emptyForm = { username: '', email: '', password: '', role: 'shop_owner', shop_id: '' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => Promise.all([listUsers(), listShops()])
    .then(([u, s]) => { setUsers(u); setShops(s); })
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ username: u.username, email: u.email, password: '', role: u.role, shop_id: u.shop_id ?? '' });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!editing && (!form.username || !form.password)) {
      toast.error('Username and password are required');
      return;
    }
    try {
      const payload = { ...form, shop_id: form.shop_id === '' ? null : Number(form.shop_id) };
      if (!payload.password) delete payload.password;
      if (editing) {
        await updateUser(editing.id, payload);
        toast.success('User updated');
      } else {
        await createUser(payload);
        toast.success('User created');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save user');
    }
  };

  const remove = async (user) => {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    try {
      await deleteUser(user.id);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete');
    }
  };

  const toggleStatus = async (user) => {
    try {
      await updateUser(user.id, { status: user.status === 'active' ? 'suspended' : 'active' });
      toast.success('Status updated');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed');
    }
  };

  const resetPassword = async (user) => {
    const newPass = window.prompt(`Enter a new password for ${user.username}:`);
    if (!newPass) return;
    try {
      await updateUser(user.id, { password: newPass });
      toast.success('Password reset');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to reset password');
    }
  };

  if (loading) return <Loading />;

  const roleColor = { admin: 'bg-purple-100 text-purple-700', shop_owner: 'bg-indigo-100 text-indigo-700', staff: 'bg-amber-100 text-amber-700' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <button className={btnPrimary} onClick={openCreate}>+ Create User</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {users.length === 0 ? <Empty message="No users found" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{u.username}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${roleColor[u.role] || roleColor.shop_owner}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.shop_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="Edit"><FiEdit /></button>
                      <button onClick={() => resetPassword(u)} className="p-2 rounded-lg hover:bg-slate-100 text-amber-600 text-xs font-semibold" title="Reset password">Reset PW</button>
                      <button onClick={() => toggleStatus(u)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-semibold" title="Toggle status">{u.status === 'active' ? 'Suspend' : 'Activate'}</button>
                      <button onClick={() => remove(u)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} title={editing ? `Edit ${editing.username}` : 'Create User'} onClose={() => setModal(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block">Username *</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputCls} disabled={!!editing} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="user@shop.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
              <option value="shop_owner">Shop Owner</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Shop</label>
            <select value={form.shop_id} onChange={(e) => setForm({ ...form, shop_id: e.target.value })} className={inputCls}>
              <option value="">No shop</option>
              {shops.map((s) => <option key={s.id} value={s.id}>{s.shop_name} (@{s.username})</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className={btnPrimary}>{editing ? 'Save Changes' : 'Create User'}</button>
            <button type="button" onClick={() => setModal(false)} className={btnGhost}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
