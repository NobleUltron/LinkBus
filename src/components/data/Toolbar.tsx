import React from 'react';
import { FilterIcon, XIcon } from 'lucide-react';
import { DateInput, FIELD_WIDTH, IconSelect, SearchInput } from '../ui/Inputs';

export interface FilterConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  type?: 'select' | 'date';
  /** Optional leading glyph; falls back to a funnel so every filter reads the same. */
  icon?: React.ReactNode;
}

interface ToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  searching?: boolean;
  filters?: FilterConfig[];
  values: Record<string, string>;
  onFilter: (key: string, value: string) => void;
  onClear: () => void;
  activeFilterCount: number;
  children?: React.ReactNode;
}

export function Toolbar({
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  searching = false,
  filters = [],
  values,
  onFilter,
  onClear,
  activeFilterCount,
  children,
}: ToolbarProps) {
  return (
    <div className="thin-scroll flex flex-wrap items-center gap-3 overflow-x-auto border-b border-line px-5 py-3.5 sm:flex-nowrap">
      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder={searchPlaceholder}
        loading={searching}
        className={FIELD_WIDTH.search}
      />

      {filters.length > 0 &&
        filters.map((filter) => {
          const value = values[filter.key] ?? '';

          return filter.type === 'date' ? (
            <DateInput
              key={filter.key}
              label={filter.label}
              value={value}
              onChange={(event) => onFilter(filter.key, event.target.value)}
              onClear={() => onFilter(filter.key, '')}
            />
          ) : (
            <IconSelect
              key={filter.key}
              icon={filter.icon ?? <FilterIcon className="h-4 w-4" aria-hidden />}
              placeholder={filter.label}
              options={filter.options}
              value={value}
              onChange={(event) => onFilter(filter.key, event.target.value)}
            />
          );
        })}

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
        >
          <XIcon className="h-3.5 w-3.5" aria-hidden />
          Clear
          <span className="rounded-full bg-brand-600 px-1.5 text-[0.625rem] font-bold leading-4 tabular-nums text-white">
            {activeFilterCount}
          </span>
        </button>
      )}

      {children && <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}