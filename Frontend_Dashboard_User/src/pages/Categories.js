import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Empty, Loading, Modal, btnPrimary, btnGhost, inputCls } from '../components/ui';

const emptyForm = { name: '', slug: '', sort_order: 0 };

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => listCategories(user.shop_id).then(setCategories).finally(() => setLoading(false));
  useEffect(() => { load(); }, [user.shop_id]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, slug: c.slug, sort_order: c.sort_order }); setModal(true); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Category name is required'); return; }
    try {
      const payload = { shop_id: user.shop_id, ...form, sort_order: Number(form.sort_order) || 0 };
      if (editing) {
        await updateCategory(editing.id, payload);
        toast.success('Category updated');
      } else {
        await createCategory(payload);
        toast.success('Category created');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save category');
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await deleteCategory(c.id);
      toast.success('Category deleted');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete');
    }
  };

  const move = async (c, dir) => {
    try {
      await updateCategory(c.id, { sort_order: c.sort_order + dir });
      load();
    } catch { /* ignore */ }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button className={btnPrimary} onClick={openCreate}>+ Add Category</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {categories.length === 0 ? <Empty message="No categories yet. Create one to organise your products." /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Sort</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => move(c, -1)} className="w-6 h-6 rounded hover:bg-gray-100 text-gray-500">↑</button>
                      <span className="w-6 text-center">{c.sort_order}</span>
                      <button onClick={() => move(c, 1)} className="w-6 h-6 rounded hover:bg-gray-100 text-gray-500">↓</button>
                    </div>
                  </td>
                  <td className="px-4 py-3">{c.product_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><FiEdit /></button>
                      <button onClick={() => remove(c)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} title={editing ? 'Edit Category' : 'Add Category'} onClose={() => setModal(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. Men" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Slug</label>
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} placeholder="men (auto if empty)" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Sort Order</label>
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputCls} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className={btnPrimary}>{editing ? 'Save Changes' : 'Add Category'}</button>
            <button type="button" onClick={() => setModal(false)} className={btnGhost}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
