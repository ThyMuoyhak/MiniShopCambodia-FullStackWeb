import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiTrash2, FiUpload } from 'react-icons/fi';
import { createProduct, getProduct, listCategories, updateProduct, uploadImages, fullUrl } from '../api';
import { useAuth } from '../contexts/AuthContext';
import AttributeBuilder from '../components/AttributeBuilder';
import VariationBuilder from '../components/VariationBuilder';
import { btnGhost, btnPrimary, inputCls } from '../components/ui';

const emptyProduct = {
  name: '', description: '', price: 0, sale_price: '', quantity: 0,
  category_id: '', images: [], custom_attributes: [], variations: [], featured: false, status: 'active',
};

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyProduct);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const isEdit = !!id;

  useEffect(() => {
    listCategories(user.shop_id).then(setCategories);
    if (isEdit) {
      getProduct(id).then((p) => {
        setForm({
          name: p.name, description: p.description, price: p.price,
          sale_price: p.sale_price ?? '', quantity: p.quantity,
          category_id: p.category_id ?? '', images: p.images || [],
          custom_attributes: p.custom_attributes || [], variations: p.variations || [],
          featured: p.featured, status: p.status,
        });
      });
    }
  }, [id, isEdit, user.shop_id]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const res = await uploadImages(files);
      setForm({ ...form, images: [...form.images, ...res.urls] });
      toast.success('Images uploaded');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upload failed');
    }
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setForm({ ...form, images: form.images.filter((_, i) => i !== idx) });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    setSaving(true);
    const payload = {
      shop_id: user.shop_id,
      name: form.name, description: form.description,
      price: Number(form.price) || 0,
      sale_price: form.sale_price === '' || form.sale_price === null ? null : Number(form.sale_price),
      quantity: Number(form.quantity) || 0,
      category_id: form.category_id === '' ? null : Number(form.category_id),
      images: form.images,
      custom_attributes: form.custom_attributes.filter((a) => a.name.trim()),
      variations: form.variations.map((v) => ({ ...v, price: Number(v.price) || 0, quantity: Number(v.quantity) || 0 })),
      featured: form.featured, status: form.status,
    };
    try {
      if (isEdit) { await updateProduct(id, payload); toast.success('Product updated!'); }
      else { await createProduct(payload); toast.success('Product created!'); }
      navigate('/products');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
      <form onSubmit={submit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h2 className="font-bold">Basic Information</h2>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Product Name *</label>
            <input value={form.name} onChange={set('name')} className={inputCls} placeholder="e.g. Classic White T-Shirt" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Description</label>
            <textarea value={form.description} onChange={set('description')} rows="4" className={inputCls} placeholder="Describe your product..." />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block">Price *</label>
              <input type="number" step="0.01" value={form.price} onChange={set('price')} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block">Sale Price</label>
              <input type="number" step="0.01" value={form.sale_price} onChange={set('sale_price')} className={inputCls} placeholder="optional" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block">Quantity</label>
              <input type="number" value={form.quantity} onChange={set('quantity')} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block">Category</label>
              <select value={form.category_id} onChange={set('category_id')} className={inputCls}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Product Images</h2>
            <label className="flex items-center gap-1 text-indigo-600 text-sm font-semibold cursor-pointer hover:underline">
              <FiUpload /> Upload Images
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
            </label>
          </div>
          {form.images.length === 0 ? (
            <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4 text-center">No images yet. Upload product photos above.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={fullUrl(img)} alt="" className="w-full aspect-square object-cover rounded-lg border" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1.5 bg-white rounded-full shadow text-red-500 opacity-0 group-hover:opacity-100 transition">
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <AttributeBuilder attributes={form.custom_attributes} onChange={(v) => setForm({ ...form, custom_attributes: v })} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <VariationBuilder variations={form.variations} onChange={(v) => setForm({ ...form, variations: v })} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-4 h-4" />
              Featured product
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              Status:
              <select value={form.status} onChange={set('status')} className="border rounded-lg px-2 py-1 text-sm">
                <option value="active">Active</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
          <button type="button" onClick={() => navigate('/products')} className={btnGhost}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
