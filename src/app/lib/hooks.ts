import { useDataContext } from "./DataContext";

export function useSettings() {
  const { settings, settingsLoading, updateSetting } = useDataContext();
  return { settings, loading: settingsLoading, updateSetting };
}

export function usePositions() {
  const { positions, positionsLoading, refetchPositions } = useDataContext();
  return { positions, loading: positionsLoading, refetch: refetchPositions };
}

export function useQuestions() {
  const { questions, questionsLoading, refetchQuestions } = useDataContext();
  return { questions, loading: questionsLoading, refetch: refetchQuestions };
}

// Returns the single application for a user, with its positions via junction table
// userId param is kept for API compatibility but ignored — DataContext uses the auth profile
export function useApplication(_userId?: string) {
  const { application, applicationLoading, refetchApplication } = useDataContext();
  return { application, loading: applicationLoading, refetch: refetchApplication };
}

// Returns all applications for admin view, each with positions and profile
export function useAllApplications() {
  const { allApplications, allApplicationsLoading, refetchAllApplications } = useDataContext();
  return { applications: allApplications, loading: allApplicationsLoading, refetch: refetchAllApplications };
}
