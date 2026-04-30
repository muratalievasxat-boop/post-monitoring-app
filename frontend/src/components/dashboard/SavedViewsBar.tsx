import { useState, useRef, useEffect } from 'react';
import { useDashboardFilters } from '@/lib/dashboardFilters';

const LONG_PRESS_MS = 600;

export default function SavedViewsBar() {
  const { listViews, loadView, deleteView, saveCurrentView } = useDashboardFilters();
  const views = listViews();

  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (saving) inputRef.current?.focus();
  }, [saving]);

  // Close confirm state when clicking elsewhere
  useEffect(() => {
    if (!confirmId) return;
    function handle(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-saved-view-chip]')) setConfirmId(null);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [confirmId]);

  function handleSave() {
    if (!saveName.trim()) return;
    saveCurrentView(saveName.trim());
    setSaveName('');
    setSaving(false);
  }

  function handleDeleteClick(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (confirmId === id) {
      deleteView(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
    }
  }

  function startLongPress(id: string) {
    longPressTimer.current = setTimeout(() => setConfirmId(id), LONG_PRESS_MS);
  }

  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        overflowX: 'auto', padding: '6px 10px',
        borderRadius: 8, border: '1px solid hsl(var(--border))',
        background: 'hsl(var(--background))',
        // hide scrollbar but keep scroll
        scrollbarWidth: 'none',
      }}
    >
      {views.length === 0 && !saving && (
        <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Сохранённых видов нет. Настройте фильтры и нажмите «Сохранить вид»
        </span>
      )}

      {views.map(view => (
        confirmId === view.id ? (
          <div
            key={view.id}
            data-saved-view-chip
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 6, flexShrink: 0,
              background: '#dc262618', border: '1px solid #dc262640',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#dc2626', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Удалить «{view.name.length > 20 ? view.name.slice(0, 18) + '…' : view.name}»?
            </span>
            <button
              onClick={() => { deleteView(view.id); setConfirmId(null); }}
              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '1px 6px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
            >
              Да
            </button>
            <button
              onClick={() => setConfirmId(null)}
              style={{ background: 'none', border: '1px solid hsl(var(--border))', borderRadius: 4, padding: '1px 6px', fontSize: 11, cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}
            >
              Нет
            </button>
          </div>
        ) : (
          <div
            key={view.id}
            data-saved-view-chip
            onClick={() => loadView(view.id)}
            onTouchStart={() => startLongPress(view.id)}
            onTouchEnd={cancelLongPress}
            onTouchMove={cancelLongPress}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', borderRadius: 6, flexShrink: 0,
              background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))',
              cursor: 'pointer', userSelect: 'none',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--accent))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'hsl(var(--muted))')}
          >
            <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--foreground))', whiteSpace: 'nowrap' }}>
              {view.name.length > 24 ? view.name.slice(0, 22) + '…' : view.name}
            </span>
            <button
              onClick={e => handleDeleteClick(e, view.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'hsl(var(--muted-foreground))', padding: '0 2px',
                fontSize: 13, lineHeight: 1, borderRadius: 3,
                display: 'flex', alignItems: 'center',
              }}
              title="Удалить вид"
            >
              ×
            </button>
          </div>
        )
      ))}

      {saving ? (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <input
            ref={inputRef}
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') { setSaving(false); setSaveName(''); }
            }}
            placeholder="Название вида…"
            style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 12,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--background))', color: 'hsl(var(--foreground))',
              width: 160, outline: 'none',
            }}
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            style={{
              padding: '3px 9px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer',
              opacity: saveName.trim() ? 1 : 0.5,
            }}
          >
            ✓
          </button>
          <button
            onClick={() => { setSaving(false); setSaveName(''); }}
            style={{
              padding: '3px 7px', borderRadius: 6, fontSize: 12,
              background: 'none', border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--muted-foreground))', cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSaving(true)}
          style={{
            flexShrink: 0, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: 'none', border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--muted-foreground))', cursor: 'pointer',
            whiteSpace: 'nowrap', marginLeft: 'auto',
            transition: 'background 0.12s, color 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--muted))'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--foreground))'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--muted-foreground))'; }}
        >
          Сохранить вид
        </button>
      )}
    </div>
  );
}
