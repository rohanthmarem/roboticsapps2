import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "./supabase";

interface DataContextType {
  settings: Record<string, any>;
  settingsLoading: boolean;
  updateSetting: (key: string, value: any) => Promise<void>;

  positions: any[];
  positionsLoading: boolean;
  refetchPositions: () => Promise<void>;

  questions: any[];
  questionsLoading: boolean;
  refetchQuestions: () => Promise<void>;

  application: any | null;
  applicationLoading: boolean;
  refetchApplication: () => Promise<void>;

  allApplications: any[];
  allApplicationsLoading: boolean;
  refetchAllApplications: () => Promise<void>;

  progressCounts: { activities: number; responses: number; honors: number };
  refetchProgressCounts: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

const STALE_TIME = 30_000; // 30 seconds

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  // --- Settings ---
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const settingsFetchedAt = useRef(0);

  const fetchSettings = useCallback(async (force = false) => {
    if (!force && Date.now() - settingsFetchedAt.current < STALE_TIME) return;
    const { data, error } = await supabase.from("settings").select("key, value");
    if (error) { console.error("Failed to fetch settings:", error); setSettingsLoading(false); return; }
    const map: Record<string, any> = {};
    (data || []).forEach((s) => (map[s.key] = s.value));
    setSettings(map);
    settingsFetchedAt.current = Date.now();
    setSettingsLoading(false);
  }, []);

  const updateSetting = useCallback(async (key: string, value: any) => {
    const { data: existing } = await supabase
      .from("settings").select("id").eq("key", key).maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
      if (error) { console.error("Failed to update setting:", key, error); return; }
    } else {
      const { error } = await supabase
        .from("settings").insert({ key, value, updated_at: new Date().toISOString() });
      if (error) { console.error("Failed to insert setting:", key, error); return; }
    }
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Realtime subscription for settings changes (enables instant maintenance mode)
  useEffect(() => {
    const channel = supabase
      .channel("settings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload: any) => {
          if (payload.new && payload.new.key) {
            setSettings((prev) => ({ ...prev, [payload.new.key]: payload.new.value }));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- Positions ---
  const [positions, setPositions] = useState<any[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const positionsFetchedAt = useRef(0);

  const fetchPositions = useCallback(async (force = false) => {
    if (!force && Date.now() - positionsFetchedAt.current < STALE_TIME) return;
    const { data, error } = await supabase.from("positions").select("*").order("sort_order");
    if (error) { console.error("Failed to fetch positions:", error); setPositionsLoading(false); return; }
    setPositions(data || []);
    positionsFetchedAt.current = Date.now();
    setPositionsLoading(false);
  }, []);

  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  // --- Questions ---
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const questionsFetchedAt = useRef(0);

  const fetchQuestions = useCallback(async (force = false) => {
    if (!force && Date.now() - questionsFetchedAt.current < STALE_TIME) return;
    const { data, error } = await supabase.from("questions").select("*").eq("is_active", true).order("sort_order");
    if (error) { console.error("Failed to fetch questions:", error); setQuestionsLoading(false); return; }
    setQuestions(data || []);
    questionsFetchedAt.current = Date.now();
    setQuestionsLoading(false);
  }, []);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // --- Application (user-specific) ---
  const [application, setApplication] = useState<any>(null);
  const [applicationLoading, setApplicationLoading] = useState(true);
  const applicationFetchedAt = useRef(0);

  const fetchApplication = useCallback(async (force = false) => {
    if (!profile?.id) { setApplicationLoading(false); return; }
    if (!force && Date.now() - applicationFetchedAt.current < STALE_TIME) return;
    const { data, error } = await supabase
      .from("applications")
      .select("*, application_positions(*, positions(title, description, spots))")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (error) console.error("Failed to fetch application:", error);
    setApplication(data);
    applicationFetchedAt.current = Date.now();
    setApplicationLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    // Reset when user changes
    applicationFetchedAt.current = 0;
    setApplication(null);
    setApplicationLoading(true);
    fetchApplication();
  }, [fetchApplication]);

  // --- All Applications (admin) ---
  const [allApplications, setAllApplications] = useState<any[]>([]);
  const [allApplicationsLoading, setAllApplicationsLoading] = useState(true);
  const allAppsFetchedAt = useRef(0);

  const fetchAllApplications = useCallback(async (force = false) => {
    if (!force && Date.now() - allAppsFetchedAt.current < STALE_TIME) return;
    const { data, error } = await supabase
      .from("applications")
      .select("*, application_positions(*, positions(title)), profiles(first_name, last_name, email)")
      .order("created_at", { ascending: false });
    if (error) { console.error("Failed to fetch all applications:", error); setAllApplicationsLoading(false); return; }
    setAllApplications(data || []);
    allAppsFetchedAt.current = Date.now();
    setAllApplicationsLoading(false);
  }, []);

  useEffect(() => { fetchAllApplications(); }, [fetchAllApplications]);

  // --- Progress Counts (applicant sidebar) ---
  const [progressCounts, setProgressCounts] = useState({ activities: 0, responses: 0, honors: 0 });

  const fetchProgressCounts = useCallback(async () => {
    if (!profile?.id) return;
    const [actsRes, honorsRes, respsRes] = await Promise.all([
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
      supabase.from("honors").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
      application?.id
        ? supabase.from("responses").select("id", { count: "exact", head: true }).eq("application_id", application.id)
        : Promise.resolve({ count: 0 }),
    ]);
    setProgressCounts({
      activities: actsRes.count || 0,
      honors: honorsRes.count || 0,
      responses: respsRes.count || 0,
    });
  }, [profile?.id, application?.id]);

  useEffect(() => { fetchProgressCounts(); }, [fetchProgressCounts]);

  return (
    <DataContext.Provider
      value={{
        settings, settingsLoading, updateSetting,
        positions, positionsLoading, refetchPositions: () => fetchPositions(true),
        questions, questionsLoading, refetchQuestions: () => fetchQuestions(true),
        application, applicationLoading, refetchApplication: () => fetchApplication(true),
        allApplications, allApplicationsLoading, refetchAllApplications: () => fetchAllApplications(true),
        progressCounts, refetchProgressCounts: fetchProgressCounts,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataContext must be used within DataProvider");
  return ctx;
}
