// frontend/src/components/ThreatFiltersPanel.tsx
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { BadgeProps } from "@/components/ui/badge";

import type { ThreatFilters, Severity, ThreatStatus, ThreatType } from '@/types/threats';
type BadgeVariant = BadgeProps["variant"];

interface ThreatFiltersProps {
  filters: ThreatFilters;
  onFiltersChange: (filters: ThreatFilters) => void;
  onClearFilters: () => void;
}

export const ThreatFiltersPanel = ({ filters, onFiltersChange, onClearFilters }: ThreatFiltersProps) => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.dateFrom ? new Date(filters.dateFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.dateTo ? new Date(filters.dateTo) : undefined
  );

  const severityOptions: { value: Severity; label: string; color: BadgeVariant }[] = [
  { value: 'critical', label: 'Critical', color: 'destructive' },
  { value: 'high', label: 'High', color: 'default' },
  { value: 'medium', label: 'Medium', color: 'secondary' },
  { value: 'low', label: 'Low', color: 'outline' },
];


  const statusOptions: { value: ThreatStatus; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'resolved', label: 'Resolved' },
  ];

  const typeOptions: { value: ThreatType; label: string }[] = [
  { value: 'phishing', label: 'Phishing' },
  { value: 'brute_force', label: 'Brute Force' },
  { value: 'malware', label: 'Malware' },

  // NEW SAFE TYPES
  { value: 'safe_traffic', label: 'Safe Traffic' },
  { value: 'auth_traffic', label: 'Auth (Safe)' },
  { value: 'file_scan', label: 'File Scan (Safe)' },
];


  const handleSeverityToggle = (severity: Severity) => {
    const current = filters.severity || [];
    const updated = current.includes(severity)
      ? current.filter(s => s !== severity)
      : [...current, severity];
    
    onFiltersChange({ ...filters, severity: updated.length > 0 ? updated : undefined });
  };

  const handleStatusChange = (status: string) => {
    onFiltersChange({ 
      ...filters, 
      status: status === 'all' ? undefined : [status as ThreatStatus] 
    });
  };

  const handleTypeChange = (type: string) => {
    onFiltersChange({ 
      ...filters, 
      type: type === 'all' ? undefined : [type as ThreatType] 
    });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    setDateFrom(date);
    onFiltersChange({ 
      ...filters, 
      dateFrom: date ? date.toISOString() : undefined 
    });
  };

  const handleDateToChange = (date: Date | undefined) => {
    setDateTo(date);
    onFiltersChange({ 
      ...filters, 
      dateTo: date ? date.toISOString() : undefined 
    });
  };

  const hasActiveFilters = Boolean(
    filters.q || 
    filters.severity?.length || 
    filters.status?.length || 
    filters.type?.length || 
    filters.dateFrom || 
    filters.dateTo
  );

  return (
    <div className="mb-6 p-4 bg-card border border-border rounded-lg">
      <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search threats by source, summary, or type..."
              value={filters.q || ''}
              onChange={(e) => onFiltersChange({ ...filters, q: e.target.value || undefined })}
              className="pl-10"
            />
          </div>

          {/* Severity Chips */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</label>
            <div className="flex flex-wrap gap-2">
              {severityOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={
  filters.severity?.includes(option.value)
    ? option.color
    : "outline"
}


                  className="cursor-pointer"
                  onClick={() => handleSeverityToggle(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Status and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
              <Select
                value={filters.status?.[0] || 'all'}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
              <Select
                value={filters.type?.[0] || 'all'}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={handleDateFromChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={handleDateToChange}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-muted-foreground"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>
    </div>
  );
};