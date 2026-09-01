import React from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { inputCls } from './ui';

const TYPES = ['text', 'number', 'date', 'boolean', 'select', 'color', 'image'];

export default function AttributeBuilder({ attributes, onChange }) {
  const addAttribute = () => {
    onChange([
      ...attributes,
      { name: '', label: '', type: 'text', value: '', options: '', required: false },
    ]);
  };

  const update = (idx, field, val) => {
    onChange(attributes.map((a, i) => (i === idx ? { ...a, [field]: val } : a)));
  };

  const remove = (idx) => {
    onChange(attributes.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700">Dynamic Attributes</h3>
        <button
          type="button"
          onClick={addAttribute}
          className="flex items-center gap-1 text-indigo-600 text-sm font-semibold hover:underline"
        >
          <FiPlus /> Add More
        </button>
      </div>

      {attributes.length === 0 && (
        <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-3">
          No custom attributes yet. Click "Add More" to create unlimited custom fields.
        </p>
      )}

      {attributes.map((attr, idx) => (
        <div key={idx} className="bg-gray-50 border rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">Attribute Name</label>
              <input
                value={attr.name}
                onChange={(e) => update(idx, 'name', e.target.value)}
                className={inputCls}
                placeholder="e.g. material"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">Label</label>
              <input
                value={attr.label}
                onChange={(e) => update(idx, 'label', e.target.value)}
                className={inputCls}
                placeholder="e.g. Material"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">Type</label>
              <select
                value={attr.type}
                onChange={(e) => update(idx, 'type', e.target.value)}
                className={inputCls}
              >
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">Options (comma-separated)</label>
              <input
                value={attr.options}
                onChange={(e) => update(idx, 'options', e.target.value)}
                className={inputCls}
                placeholder="e.g. Red,Blue,Green"
                disabled={!['select', 'color'].includes(attr.type)}
              />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-0.5">
                {attr.type === 'color' ? 'Default Color' : attr.type === 'boolean' ? 'Default (true/false)' : 'Value'}
              </label>
              {attr.type === 'color' ? (
                <input
                  type="color"
                  value={attr.value || '#000000'}
                  onChange={(e) => update(idx, 'value', e.target.value)}
                  className="w-full h-9 border rounded-lg"
                />
              ) : (
                <input
                  value={attr.value}
                  onChange={(e) => update(idx, 'value', e.target.value)}
                  className={inputCls}
                  placeholder={attr.type === 'boolean' ? 'true' : 'e.g. 100% Cotton'}
                />
              )}
            </div>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 pb-2">
              <input
                type="checkbox"
                checked={attr.required}
                onChange={(e) => update(idx, 'required', e.target.checked)}
                className="w-4 h-4"
              />
              Required
            </label>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg mb-1"
              title="Remove attribute"
            >
              <FiTrash2 />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
