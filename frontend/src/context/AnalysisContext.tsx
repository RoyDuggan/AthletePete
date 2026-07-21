import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import type { AdvisoryData } from "../types/advisoryData";
import type { CornerExecution, FingerprintResult } from "../types/fingerprint";

type AnalysisContextValue = {
  /** Selected session storage keys — shared by Telemetry and Coaching. */
  selectedKeys: string[];
  setSelectedKeys: (keys: string[]) => void;
  toggleKey: (key: string) => void;

  /** Analysis basis (zone-map id; "" = auto-detect / fastest). Shared. */
  zoneMapId: string;
  setZoneMapId: (id: string) => void;

  /** Telemetry page: the loaded lap-comparison analysis. */
  advisoryData: AdvisoryData | null;
  setAdvisoryData: (data: AdvisoryData | null) => void;

  /** Coaching page: the fingerprint analysis and its view state. */
  fingerprint: FingerprintResult | null;
  setFingerprint: (result: FingerprintResult | null) => void;
  sensitivity: number;
  setSensitivity: (value: number) => void;
  selectedExec: CornerExecution | null;
  setSelectedExec: (exec: CornerExecution | null) => void;
  coaching: string | null;
  setCoaching: (text: string | null) => void;

  /** Wipe the whole working set (new-set load, sign-out). */
  clear: () => void;
};

const DEFAULT_SENSITIVITY = 55;

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

/**
 * Holds the active analysis "working set" for the signed-in session: the
 * selected sessions + basis (shared by the Telemetry and Coaching pages) and
 * the results each page produces. Mounted above the routed pages so it survives
 * navigation between /app/* pages. In-memory only — a full page refresh starts
 * fresh — and cleared automatically on sign-out so a new sign-in never inherits
 * a previous user's analysis.
 */
export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [zoneMapId, setZoneMapId] = useState<string>("");
  const [advisoryData, setAdvisoryData] = useState<AdvisoryData | null>(null);
  const [fingerprint, setFingerprint] = useState<FingerprintResult | null>(null);
  const [sensitivity, setSensitivity] = useState<number>(DEFAULT_SENSITIVITY);
  const [selectedExec, setSelectedExec] = useState<CornerExecution | null>(null);
  const [coaching, setCoaching] = useState<string | null>(null);

  const clear = () => {
    setSelectedKeys([]);
    setZoneMapId("");
    setAdvisoryData(null);
    setFingerprint(null);
    setSensitivity(DEFAULT_SENSITIVITY);
    setSelectedExec(null);
    setCoaching(null);
  };

  const toggleKey = (key: string) =>
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  // Clear when the user signs out (user id goes null). AuthContext only nulls
  // the user on explicit logout, so this never fires mid-session.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value: AnalysisContextValue = {
    selectedKeys,
    setSelectedKeys,
    toggleKey,
    zoneMapId,
    setZoneMapId,
    advisoryData,
    setAdvisoryData,
    fingerprint,
    setFingerprint,
    sensitivity,
    setSensitivity,
    selectedExec,
    setSelectedExec,
    coaching,
    setCoaching,
    clear,
  };

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
};

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return ctx;
}
