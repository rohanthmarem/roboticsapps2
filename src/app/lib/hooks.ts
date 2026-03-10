import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("settings")
      .select("key, value")
      .then(({ data, error }) => {
        if (error) console.error("Failed to fetch settings:", error);
        const map: Record<string, any> = {};
        (data || []).forEach((s) => (map[s.key] = s.value));
        setSettings(map);
        setLoading(false);
      });
  }, []);

  const updateSetting = async (key: string, value: any) => {
    // Try update first, then insert if not found
    const { data: existing } = await supabase
      .from("settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) {
        console.error("Failed to update setting:", key, error);
        return;
      }
    } else {
      const { error } = await supabase
        .from("settings")
        .insert({ key, value, updated_at: new Date().toISOString() });
      if (error) {
        console.error("Failed to insert setting:", key, error);
        return;
      }
    }
    // Only update local state after successful DB write
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return { settings, loading, updateSetting };
}

export function usePositions() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = useCallback(async () => {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("sort_order");
    if (error) console.error("Failed to fetch positions:", error);
    setPositions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return { positions, loading, refetch: fetchPositions };
}

export function useQuestions() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) console.error("Failed to fetch questions:", error);
    setQuestions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return { questions, loading, refetch: fetchQuestions };
}

// Returns the single application for a user, with its positions via junction table
export function useApplication(userId?: string) {
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchApplication = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("applications")
      .select("*, application_positions(*, positions(title, description, spots))")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) console.error("Failed to fetch application:", error);
    setApplication(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  return { application, loading, refetch: fetchApplication };
}

// Returns all applications for admin view, each with positions and profile
export function useAllApplications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    const { data, error } = await supabase
      .from("applications")
      .select("*, application_positions(*, positions(title)), profiles(first_name, last_name, email)")
      .order("created_at", { ascending: false });
    if (error) console.error("Failed to fetch all applications:", error);
    setApplications(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return { applications, loading, refetch: fetchApplications };
}
