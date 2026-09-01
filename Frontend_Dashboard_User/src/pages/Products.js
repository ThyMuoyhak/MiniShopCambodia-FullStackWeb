import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiEdit, FiEye, FiTrash2 } from 'react-icons/fi';
import { deleteProduct, listProducts, fullUrl } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Empty, Loading, btnPrimary } from '../components/ui';

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => listProducts(user.shop_id).then(setProducts).finally(() => setLoading(false));
  useEffect(() => { load(); }, [user.shop_id]);

  const remove = async (product) => {
    if (!window.confirm(`Delete product "${product.name}"?`)) return;
    try {
      await deleteProduct(product.id);
      toast.success('Product deleted');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete');
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link to="/products/new" className={btnPrimary}>+ Add Product</Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full md:w-72 border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? <Empty message={products.length === 0 ? 'No products yet. Add your first product!' : 'No products match your search'} /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Variations</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={fullUrl(p.images[0])} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">🛍️</div>
                      )}
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category_name || '—'}</td>
                  <td className="px-4 py-3">
                    {p.sale_price != null && p.sale_price < p.price ? (
                      <span><span className="font-bold text-green-600">{p.sale_price.toFixed(2)}</span> <span className="text-gray-400 line-through text-xs">{p.price.toFixed(2)}</span></span>
                    ) : (
                      <span className="font-bold">{p.price.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.quantity <= 0 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Out of stock</span>
                    ) : p.quantity <= 5 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Low ({p.quantity})</span>
                    ) : (
                      <span className="font-semibold text-green-600">{p.quantity}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.variations?.length || 0}</td>
                  <td className="px-4 py-3">{p.featured ? '⭐' : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <a href={`http://localhost:3000/${user.username}/product/${p.id}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="View in store"><FiEye /></a>
                      <Link to={`/products/${p.id}/edit`} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="Edit"><FiEdit /></Link>
                      <button onClick={() => remove(p)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
