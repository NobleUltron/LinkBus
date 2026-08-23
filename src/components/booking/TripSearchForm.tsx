import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRightIcon, MapPinIcon, SearchIcon, UsersIcon } from 'lucide-react';
import { getActiveTerminals } from '../../services/trips';
import type { Terminal } from '../../types/models';
import { toDateInput } from '../../utils/format';
import { Button } from '../ui/Button';
import { DateInput, IconSelect } from '../ui/Inputs';

interface TripSearchFormProps {
  initial?: {
    origin?: string;
    destination?: string;
    date?: string;
    passengers?: string;
  };
  variant?: 'hero' | 'panel';
  onSubmitted?: () => void;
}

export function TripSearchForm({ initial, variant = 'panel', onSubmitted }: TripSearchFormProps) {
  const navigate = useNavigate();
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [origin, setOrigin] = useState(initial?.origin ?? '');
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [date, setDate] = useState(initial?.date ?? toDateInput(new Date()));
  const [passengers, setPassengers] = useState(initial?.passengers ?? '1');

  useEffect(() => {
    getActiveTerminals()
      .then(setTerminals)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (initial?.origin !== undefined) setOrigin(initial.origin);
    if (initial?.destination !== undefined) setDestination(initial.destination);
    if (initial?.date !== undefined) setDate(initial.date);
    if (initial?.passengers !== undefined) setPassengers(initial.passengers);
  }, [initial?.origin, initial?.destination, initial?.date, initial?.passengers]);

  const swap = () => {
    const prevOrigin = origin;
    const prevDestination = destination;
    setOrigin(prevDestination);
    setDestination(prevOrigin);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (destination) params.set('destination', destination);
    if (date) params.set('date', date);
    if (passengers) params.set('passengers', passengers);
    navigate(`/search?${params.toString()}`);
    onSubmitted?.();
  };

  const labelTone = variant === 'hero' ? 'text-white/70' : 'text-muted';
  const terminalOptions = terminals.map((terminal) => ({
    value: String(terminal.id),
    label: `${terminal.city} — ${terminal.name}`,
  }));

  return (
    <form
      onSubmit={submit}
      className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_10.75rem_10.5rem_auto] lg:items-end ${
        variant === 'hero' ? 'glass-card p-4' : ''
      }`}
    >
      <div className="min-w-0">
        <label htmlFor="search-origin" className={`mb-1.5 block text-xs font-semibold ${labelTone}`}>
          From
        </label>
        <IconSelect
          id="search-origin"
          className="w-full"
          icon={<MapPinIcon className="h-4 w-4" aria-hidden />}
          placeholder="Any terminal"
          options={terminalOptions}
          value={origin}
          onChange={(event) => setOrigin(event.target.value)}
        />
      </div>

      <div className="hidden lg:block">
        <button
          type="button"
          onClick={swap}
          aria-label="Swap origin and destination"
          title="Swap origin and destination"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
        >
          <ArrowLeftRightIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="min-w-0">
        <label htmlFor="search-destination" className={`mb-1.5 block text-xs font-semibold ${labelTone}`}>
          To
        </label>
        <IconSelect
          id="search-destination"
          className="w-full"
          icon={<MapPinIcon className="h-4 w-4" aria-hidden />}
          placeholder="Any terminal"
          options={terminalOptions}
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
        />
      </div>

      <div className="min-w-0">
        <label htmlFor="search-date" className={`mb-1.5 block text-xs font-semibold ${labelTone}`}>
          Date
        </label>
        <DateInput
          id="search-date"
          className="w-full"
          label="Travel date"
          value={date}
          min={toDateInput(new Date())}
          onChange={(event) => setDate(event.target.value)}
          onClear={() => setDate('')}
        />
      </div>

      <div className="min-w-0">
        <label htmlFor="search-passengers" className={`mb-1.5 block text-xs font-semibold ${labelTone}`}>
          Passengers
        </label>
        <IconSelect
          id="search-passengers"
          className="w-full"
          icon={<UsersIcon className="h-4 w-4" aria-hidden />}
          placeholder="1 passenger"
          options={[1, 2, 3, 4, 5].map((count) => ({
            value: String(count),
            label: `${count} ${count === 1 ? 'passenger' : 'passengers'}`,
          }))}
          value={passengers}
          onChange={(event) => setPassengers(event.target.value || '1')}
        />
      </div>

      <Button type="submit" icon={<SearchIcon className="h-4 w-4" />} className="px-5 sm:col-span-2 lg:col-span-1">
        Search trips
      </Button>
    </form>
  );
}