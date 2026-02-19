"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  Check,
  SlidersHorizontal,
  Newspaper,
  Tag,
  Gauge,
  AlertTriangle,
  Zap,
  Calendar,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useNewsStore, type FilterState } from "@/stores/news-store";
import {
  CATEGORY_CONFIG,
  type Category,
  type BiasRating,
  type Sentiment,
  type Urgency,
} from "@/types";
import { getAllSources, type RssSource } from "@/lib/news-service";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Filter type definitions
type FilterType =
  | "sources"
  | "categories"
  | "bias"
  | "sentiment"
  | "urgency"
  | "locations"
  | "date";

interface FilterConfig {
  id: FilterType;
  label: string;
  icon: React.ReactNode;
}

const FILTER_CONFIGS: FilterConfig[] = [
  { id: "sources", label: "Sources", icon: <Newspaper className="w-3.5 h-3.5" /> },
  { id: "categories", label: "Category", icon: <Tag className="w-3.5 h-3.5" /> },
  { id: "locations", label: "Location", icon: <MapPin className="w-3.5 h-3.5" /> },
  { id: "bias", label: "Bias", icon: <Gauge className="w-3.5 h-3.5" /> },
  { id: "sentiment", label: "Sentiment", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { id: "urgency", label: "Urgency", icon: <Zap className="w-3.5 h-3.5" /> },
  { id: "date", label: "Date", icon: <Calendar className="w-3.5 h-3.5" /> },
];

const BIAS_OPTIONS: { value: BiasRating; label: string; color: string }[] = [
  { value: "left", label: "Left", color: "#3B82F6" },
  { value: "center-left", label: "Center-Left", color: "#0EA5E9" },
  { value: "center", label: "Center", color: "#6B7280" },
  { value: "center-right", label: "Center-Right", color: "#F97316" },
  { value: "right", label: "Right", color: "#EF4444" },
];

const SENTIMENT_OPTIONS: { value: Sentiment; label: string; color: string }[] = [
  { value: "positive", label: "Positive", color: "#10B981" },
  { value: "negative", label: "Negative", color: "#EF4444" },
  { value: "neutral", label: "Neutral", color: "#6B7280" },
  { value: "mixed", label: "Mixed", color: "#F59E0B" },
];

const URGENCY_OPTIONS: { value: Urgency; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "#EF4444" },
  { value: "high", label: "High", color: "#F97316" },
  { value: "medium", label: "Medium", color: "#F59E0B" },
  { value: "low", label: "Low", color: "#10B981" },
];

const DATE_PRESETS = [
  {
    label: "Today",
    getValue: () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return { start, end: null };
    },
  },
  {
    label: "Last 24h",
    getValue: () => ({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: null,
    }),
  },
  {
    label: "Last 3 days",
    getValue: () => ({
      start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      end: null,
    }),
  },
  {
    label: "This week",
    getValue: () => {
      const start = new Date();
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      return { start, end: null };
    },
  },
];

// Filter selector component for choosing which filter to add
function FilterSelector({
  onSelect,
  activeFilters,
}: {
  onSelect: (type: FilterType) => void;
  activeFilters: FilterType[];
}) {
  return (
    <Command className="rounded-lg">
      <CommandInput placeholder="Filter by..." className="h-9" />
      <CommandList>
        <CommandEmpty>No filter found.</CommandEmpty>
        <CommandGroup>
          {FILTER_CONFIGS.map((config) => {
            const isActive = activeFilters.includes(config.id);
            return (
              <CommandItem
                key={config.id}
                onSelect={() => onSelect(config.id)}
                className="flex items-center gap-2"
              >
                {config.icon}
                <span>{config.label}</span>
                {isActive && (
                  <Check className="ml-auto w-4 h-4 text-primary" />
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// Generic multi-select filter content
function MultiSelectFilter<T extends string>({
  options,
  selected,
  onChange,
  searchable = false,
}: {
  options: { value: T; label: string; color?: string }[];
  selected: T[];
  onChange: (selected: T[]) => void;
  searchable?: boolean;
}) {
  const toggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Command className="rounded-lg">
      {searchable && <CommandInput placeholder="Search..." className="h-9" />}
      <CommandList className="max-h-[200px]">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <CommandItem
                key={option.value}
                onSelect={() => toggle(option.value)}
                className="flex items-center gap-2"
              >
                <Checkbox checked={isSelected} className="pointer-events-none" />
                {option.color && (
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                <span>{option.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// Date filter content
function DateFilter({
  dateRange,
  onChange,
}: {
  dateRange: FilterState["dateRange"];
  onChange: (range: FilterState["dateRange"]) => void;
}) {
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <div className="p-2 space-y-1">
      {DATE_PRESETS.map((preset) => (
        <button
          key={preset.label}
          onClick={() => onChange(preset.getValue())}
          className={cn(
            "w-full text-left px-3 py-2 rounded-lg text-sm",
            "transition-colors duration-100",
            "hover:bg-muted/80"
          )}
        >
          {preset.label}
        </button>
      ))}
      <div className="h-px bg-border my-2" />
      <button
        onClick={() => setShowCalendar(!showCalendar)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
          "transition-colors duration-100",
          showCalendar ? "bg-muted" : "hover:bg-muted/80"
        )}
      >
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span>Custom date</span>
      </button>
      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <CalendarComponent
              mode="single"
              selected={dateRange.start || undefined}
              onSelect={(date) => onChange({ start: date || null, end: null })}
              disabled={(date) => date > new Date()}
              className="mt-2"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Active filter pill component
function ActiveFilterPill({
  label,
  value,
  onRemove,
  color,
}: {
  label: string;
  value: string;
  onRemove: () => void;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-muted text-xs"
    >
      {color && (
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded hover:bg-background/80 transition-colors"
      >
        <X className="w-3 h-3 text-muted-foreground" />
      </button>
    </motion.div>
  );
}

// Main Filter Button Component
export function FilterButton() {
  const { filters, setFilters, clearFilters, getUniqueLocations } = useNewsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState<FilterType | null>(null);
  const [allSources, setAllSources] = useState<RssSource[]>([]);

  // Fetch sources on mount
  useEffect(() => {
    const fetchSources = async () => {
      const sources = await getAllSources();
      setAllSources(sources);
    };
    fetchSources();
  }, []);

  // Calculate active filter count
  const activeFilterCount =
    filters.sources.length +
    filters.categories.length +
    filters.biasRatings.length +
    filters.sentiments.length +
    filters.urgencies.length +
    filters.locations.length +
    (filters.dateRange.start ? 1 : 0);

  // Get which filter types have values
  const activeFilterTypes: FilterType[] = useMemo(() => {
    const types: FilterType[] = [];
    if (filters.sources.length > 0) types.push("sources");
    if (filters.categories.length > 0) types.push("categories");
    if (filters.locations.length > 0) types.push("locations");
    if (filters.biasRatings.length > 0) types.push("bias");
    if (filters.sentiments.length > 0) types.push("sentiment");
    if (filters.urgencies.length > 0) types.push("urgency");
    if (filters.dateRange.start) types.push("date");
    return types;
  }, [filters]);

  // Source options
  const sourceOptions = useMemo(
    () => allSources.map((s) => ({ value: s.name, label: s.name })),
    [allSources]
  );

  // Category options
  const categoryOptions = useMemo(
    () =>
      Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
        value: key as Category,
        label: config.label,
        color: config.color,
      })),
    []
  );

  // Location options - get unique locations from the store
  const locationOptions = useMemo(
    () => getUniqueLocations().map((loc) => ({ value: loc, label: loc })),
    [getUniqueLocations]
  );

  const handleFilterSelect = (type: FilterType) => {
    setActiveFilterType(type);
  };

  const handleBack = () => {
    setActiveFilterType(null);
  };

  const renderFilterContent = () => {
    if (!activeFilterType) {
      return (
        <FilterSelector
          onSelect={handleFilterSelect}
          activeFilters={activeFilterTypes}
        />
      );
    }

    switch (activeFilterType) {
      case "sources":
        return (
          <MultiSelectFilter
            options={sourceOptions}
            selected={filters.sources}
            onChange={(sources) => setFilters({ sources })}
            searchable
          />
        );
      case "categories":
        return (
          <MultiSelectFilter
            options={categoryOptions}
            selected={filters.categories}
            onChange={(categories) => setFilters({ categories })}
          />
        );
      case "locations":
        return (
          <MultiSelectFilter
            options={locationOptions}
            selected={filters.locations}
            onChange={(locations) => setFilters({ locations })}
            searchable
          />
        );
      case "bias":
        return (
          <MultiSelectFilter
            options={BIAS_OPTIONS}
            selected={filters.biasRatings}
            onChange={(biasRatings) => setFilters({ biasRatings })}
          />
        );
      case "sentiment":
        return (
          <MultiSelectFilter
            options={SENTIMENT_OPTIONS}
            selected={filters.sentiments}
            onChange={(sentiments) => setFilters({ sentiments })}
          />
        );
      case "urgency":
        return (
          <MultiSelectFilter
            options={URGENCY_OPTIONS}
            selected={filters.urgencies}
            onChange={(urgencies) => setFilters({ urgencies })}
          />
        );
      case "date":
        return (
          <DateFilter
            dateRange={filters.dateRange}
            onChange={(dateRange) => setFilters({ dateRange })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-lg shrink-0",
            "bg-background/60 backdrop-blur-sm",
            "border border-border/60",
            "transition-all duration-200 ease-out",
            "hover:border-border hover:bg-background/80",
            "relative",
            activeFilterCount > 0 && "border-primary/40 bg-primary/5"
          )}
        >
          <SlidersHorizontal className={cn(
            "w-3.5 h-3.5",
            activeFilterCount > 0 ? "text-primary" : "text-muted-foreground"
          )} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-semibold text-primary-foreground bg-primary rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[240px] p-0"
        align="end"
        sideOffset={8}
      >
        {activeFilterType && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-medium">
              {FILTER_CONFIGS.find((c) => c.id === activeFilterType)?.label}
            </span>
            <button
              onClick={handleBack}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Back →
            </button>
          </div>
        )}
        {renderFilterContent()}
        {activeFilterCount > 0 && (
          <>
            <CommandSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearFilters();
                  setActiveFilterType(null);
                }}
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all filters
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Active filters display component (shows pills of active filters)
export function ActiveFilters() {
  const { filters, setFilters } = useNewsStore();

  const removeSource = (source: string) => {
    setFilters({ sources: filters.sources.filter((s) => s !== source) });
  };

  const removeCategory = (category: Category) => {
    setFilters({ categories: filters.categories.filter((c) => c !== category) });
  };

  const removeLocation = (location: string) => {
    setFilters({ locations: filters.locations.filter((l) => l !== location) });
  };

  const removeBias = (bias: BiasRating) => {
    setFilters({ biasRatings: filters.biasRatings.filter((b) => b !== bias) });
  };

  const removeSentiment = (sentiment: Sentiment) => {
    setFilters({ sentiments: filters.sentiments.filter((s) => s !== sentiment) });
  };

  const removeUrgency = (urgency: Urgency) => {
    setFilters({ urgencies: filters.urgencies.filter((u) => u !== urgency) });
  };

  const removeDate = () => {
    setFilters({ dateRange: { start: null, end: null } });
  };

  const hasFilters =
    filters.sources.length > 0 ||
    filters.categories.length > 0 ||
    filters.locations.length > 0 ||
    filters.biasRatings.length > 0 ||
    filters.sentiments.length > 0 ||
    filters.urgencies.length > 0 ||
    filters.dateRange.start;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      <AnimatePresence mode="popLayout">
        {filters.sources.map((source) => (
          <ActiveFilterPill
            key={`source-${source}`}
            label="Source"
            value={source}
            onRemove={() => removeSource(source)}
          />
        ))}
        {filters.categories.map((category) => (
          <ActiveFilterPill
            key={`cat-${category}`}
            label="Category"
            value={CATEGORY_CONFIG[category]?.label || category}
            onRemove={() => removeCategory(category)}
            color={CATEGORY_CONFIG[category]?.color}
          />
        ))}
        {filters.locations.map((location) => (
          <ActiveFilterPill
            key={`loc-${location}`}
            label="Location"
            value={location}
            onRemove={() => removeLocation(location)}
          />
        ))}
        {filters.biasRatings.map((bias) => (
          <ActiveFilterPill
            key={`bias-${bias}`}
            label="Bias"
            value={bias.replace("-", " ")}
            onRemove={() => removeBias(bias)}
            color={BIAS_OPTIONS.find((o) => o.value === bias)?.color}
          />
        ))}
        {filters.sentiments.map((sentiment) => (
          <ActiveFilterPill
            key={`sent-${sentiment}`}
            label="Sentiment"
            value={sentiment}
            onRemove={() => removeSentiment(sentiment)}
            color={SENTIMENT_OPTIONS.find((o) => o.value === sentiment)?.color}
          />
        ))}
        {filters.urgencies.map((urgency) => (
          <ActiveFilterPill
            key={`urg-${urgency}`}
            label="Urgency"
            value={urgency}
            onRemove={() => removeUrgency(urgency)}
            color={URGENCY_OPTIONS.find((o) => o.value === urgency)?.color}
          />
        ))}
        {filters.dateRange.start && (
          <ActiveFilterPill
            key="date"
            label="Since"
            value={format(filters.dateRange.start, "MMM d")}
            onRemove={removeDate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Legacy export for backwards compatibility - now just re-exports ActiveFilters
export function FilterPanel() {
  return <ActiveFilters />;
}
