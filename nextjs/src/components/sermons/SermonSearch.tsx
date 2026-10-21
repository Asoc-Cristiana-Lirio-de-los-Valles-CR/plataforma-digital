'use client';

interface SermonSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SermonSearch({ value, onChange, placeholder = 'Buscar predicaciones...' }: SermonSearchProps) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-brand-900/40 text-brand-900 dark:text-white placeholder-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-brand-700 dark:hover:text-white"
          aria-label="Limpiar búsqueda"
        >
          ×
        </button>
      )}
    </div>
  );
}
