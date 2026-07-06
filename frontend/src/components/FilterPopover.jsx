import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FilterPopover = ({
  label,
  open,
  active = false,
  onToggle,
  onReset,
  onCancel,
  onApply,
  children,
  align = 'right',
  panelWidthClass = 'w-[280px]',
  className = '',
}) => {
  const { t } = useTranslation();
  const wrapperRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        onCancel?.();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, onCancel]);

  useLayoutEffect(() => {
    if (!open || !wrapperRef.current || !panelRef.current) return;

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const panelRect = panelRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - wrapperRect.bottom;
    const spaceAbove = wrapperRect.top;
    const openUpward = spaceBelow < panelRect.height + 16 && spaceAbove > spaceBelow;
    const panelWidth = panelRect.width || 280;
    const panelHeight = panelRect.height || 0;
    const leftBase = align === 'left' ? wrapperRect.left : wrapperRect.right - panelWidth;
    const left = Math.max(8, Math.min(leftBase, viewportWidth - panelWidth - 8));
    const topBase = openUpward ? wrapperRect.top - panelHeight - 8 : wrapperRect.bottom + 8;
    const top = Math.max(8, Math.min(topBase, viewportHeight - panelHeight - 8));
    const maxHeight = Math.max(220, viewportHeight - top - 8);

    setPanelStyle({
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      maxHeight: `${maxHeight}px`,
    });
  }, [open, children, panelWidthClass, align]);

  useEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return undefined;
    }

    const handleViewportChange = () => {
      if (!wrapperRef.current || !panelRef.current) return;
      const wrapperRect = wrapperRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - wrapperRect.bottom;
      const spaceAbove = wrapperRect.top;
      const openUpward = spaceBelow < panelRect.height + 16 && spaceAbove > spaceBelow;
      const panelWidth = panelRect.width || 280;
      const panelHeight = panelRect.height || 0;
      const leftBase = align === 'left' ? wrapperRect.left : wrapperRect.right - panelWidth;
      const left = Math.max(8, Math.min(leftBase, viewportWidth - panelWidth - 8));
      const topBase = openUpward ? wrapperRect.top - panelHeight - 8 : wrapperRect.bottom + 8;
      const top = Math.max(8, Math.min(topBase, viewportHeight - panelHeight - 8));
      const maxHeight = Math.max(220, viewportHeight - top - 8);

      setPanelStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        maxHeight: `${maxHeight}px`,
      });
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open, align]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
          active || open
            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
        }`}
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={panelStyle || undefined}
          className={`${panelStyle ? 'fixed' : 'absolute top-full mt-2'} z-[120] ${panelWidthClass} rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl overflow-y-auto ${
            panelStyle ? '' : align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="space-y-3">{children}</div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {t('btn_reset_filter', 'TEMİZLE')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {t('btn_cancel', 'İPTAL')}
            </button>
            <button
              type="button"
              onClick={onApply}
              className="px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {t('btn_confirm_filter', 'ONAYLA')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPopover;
