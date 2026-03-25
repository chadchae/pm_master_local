"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface HighlightCtx {
  filterImportance: boolean;
  filterUrgency: boolean;
  filterSeverity: boolean;
  filterDefault: boolean;
  toggleFilterImportance: () => void;
  toggleFilterUrgency: () => void;
  toggleFilterSeverity: () => void;
  toggleFilterDefault: () => void;
}

const HighlightContext = createContext<HighlightCtx>({
  filterImportance: false,
  filterUrgency: false,
  filterSeverity: false,
  filterDefault: false,
  toggleFilterImportance: () => {},
  toggleFilterUrgency: () => {},
  toggleFilterSeverity: () => {},
  toggleFilterDefault: () => {},
});

export function HighlightProvider({ children }: { children: React.ReactNode }) {
  const [filterImportance, setFilterImportance] = useState(false);
  const [filterUrgency, setFilterUrgency] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState(false);
  const [filterDefault, setFilterDefault] = useState(true);

  const toggleFilterImportance = useCallback(() => setFilterImportance((p) => !p), []);
  const toggleFilterUrgency = useCallback(() => setFilterUrgency((p) => !p), []);
  const toggleFilterSeverity = useCallback(() => setFilterSeverity((p) => !p), []);
  const toggleFilterDefault = useCallback(() => setFilterDefault((p) => !p), []);

  return (
    <HighlightContext.Provider value={{
      filterImportance, filterUrgency, filterSeverity, filterDefault,
      toggleFilterImportance, toggleFilterUrgency, toggleFilterSeverity, toggleFilterDefault,
    }}>
      {children}
    </HighlightContext.Provider>
  );
}

export function useHighlightFilter() {
  return useContext(HighlightContext);
}
