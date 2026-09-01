import React, { useState } from 'react';
import { FiPlus, FiTrash2, FiZap } from 'react-icons/fi';
import { inputCls, btnGhost } from './ui';

export default function VariationBuilder({ variations, onChange }) {
  const [attrName, setAttrName] = useState('');
  const [attrOptions, setAttrOptions] = useState('');

  const addVariation = () => {
    onChange([...variations, { attrs: {}, price: 0, quantity: 0, sku: '' }]);
  };

  const update = (idx, field, val) => {
    onChange(variations.map((v, i) => (i === idx ? { ...v, [field]: val } : v)));
  };

  const updateAttr = (idx, key, val) => {
    onChange(variations.map((v, i) => {
      if (i !== idx) return v;
      const attrs = { ...v.attrs };
      if (val) attrs[key] = val;
      else delete attrs[key];
      return { ...v, attrs };
    }));
  };

  const remove = (idx) => {
    onChange(variations.filter((_, i) => i !== idx));
  };

  const allAttrNames = [...new Set(variations.flatMap((v) => Object.keys(v.attrs || {})))];

  const generateVariations = () => {
    const name = attrName.trim();
    const options = attrOptions.split(',').map((o) => o.trim()).filter(Boolean);
    if (!name || options.length === 0) return;
    onChange(options.map((opt) => ({ attrs: { [name]: opt }, price: 0, quantity: 0, sku: '' })));
    setAttrName('');
    setAttrOptions('');
  };

  const addNewVariationAttr = (idx) => {
    const name = prompt('Variation attribute name (e.g. Size):');
    if (!name) return;
    updateAttr(idx, name.trim(), '');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">Product Variations</h3>
        <button type="button" onClick={addVariation} className="flex items-center gap-1 text-indigo-600 text-sm font-semibold hover:underline">
          <FiPlus /> Add Variation
        </button>
      </div>

      {/* Generate variations tool */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1"><FiZap /> Generate variations automatically</p>
        <div className="grid grid-cols-2 gap-2">
          <input value={attrName} onChange={(e) => setAttrName(e.target.value)} className={inputCls} placeholder="Attribute (e.g. size)" />
          <input value={attrOptions} onChange={(e) => setAttrOptions(e.target.value)} className={inputCls} placeholder="Options (e.g. S,M,L,XL)" />
        </div>
        <button type="button" onClick={generateVariations} className={`${btnGhost} w-full text-indigo-700 border-indigo-300 hover:bg-indigo-100`}>
          Generate {attrOptions.split(',').filter((o) => o.trim()).length || ''} variations
        </button>
      </div>

      {variations.length === 0 && (
        <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-3">
          No variations. Use "Generate variations automatically" or "Add Variation".
        </p>
      )}

      {variations.map((v, idx) => (
        <div key={idx} className="bg-gray-50 border rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Variation #{idx + 1}</span>
            <button type="button" onClick={() => remove(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {allAttrNames.map((attr) => (
              <div key={attr} className="flex items-center gap-1">
                <span className="text-xs font-medium text-gray-600 bg-white border rounded-md px-2 py-1.5">{attr}:</span>
                <input
                  value={v.attrs?.[attr] || ''}
                  onChange={(e) => updateAttr(idx, attr, e.target.value)}
                  className={`${inputCls} w-24`}
                  placeholder="value"
                />
              </div>
            ))}
            {allAttrNames.length === 0 && (
              <button type="button" onClick={() => addNewVariationAttr(idx)} className="text-xs text-indigo-600 font-semibold hover:underline">
                + Add variation attribute
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">Price</label>
              <input type="number" step="0.01" value={v.price} onChange={(e) => update(idx, 'price', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">Quantity</label>
              <input type="number" value={v.quantity} onChange={(e) => update(idx, 'quantity', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">SKU</label>
              <input value={v.sku} onChange={(e) => update(idx, 'sku', e.target.value)} className={inputCls} placeholder="optional" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
