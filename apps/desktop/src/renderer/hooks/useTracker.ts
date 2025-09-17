import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TrackerData {
  currentSession: any;
  todayStats: {
    clientHours: number;
    commandHours: number;
    totalHours: number;
    analytics: {
      focusMinutes: number;
      handsOnMinutes: number;
      researchMinutes: number;
      aiMinutes: number;
    };
  };
  weekStats: {
    clientHours: number;
    commandHours: number;
    totalHours: number;
  };
  screenshots: any[];
  isIdle: boolean;
}

export function useTracker() {
  const queryClient = useQueryClient();
  const [isIdle, setIsIdle] = useState(false);
  const [isOperationInProgress, setIsOperationInProgress] = useState(false);

  // Main dashboard data query
  const { data: dashboardData = getDefaultData(), refetch: refetchDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const data = await window.electronAPI.dashboard.getData();
      return data;
    },
    // Only refetch when not in an operation
    refetchInterval: isOperationInProgress ? false : 10000,
  });

  // Screenshots query
  const { data: screenshots = [] } = useQuery({
    queryKey: ['screenshots'],
    queryFn: async () => {
      const data = await window.electronAPI.screenshots.getToday();
      return data;
    },
    refetchInterval: 60000,
  });

  // Start session mutation - simplified
  const startSessionMutation = useMutation({
    mutationFn: async ({ mode, task, projectId }: any) => {
      setIsOperationInProgress(true);
      try {
        const result = await window.electronAPI.session.start(mode, task, projectId);
        // Wait for backend to fully process
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Immediately refetch to get the latest state
        await refetchDashboard();
        return result;
      } finally {
        setIsOperationInProgress(false);
      }
    },
  });

  // Switch mode mutation - simplified
  const switchModeMutation = useMutation({
    mutationFn: async ({ mode, task, projectId }: any) => {
      setIsOperationInProgress(true);
      try {
        const result = await window.electronAPI.session.switchMode(mode, task, projectId);
        // Wait for backend to fully process
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Immediately refetch to get the latest state
        await refetchDashboard();
        return result;
      } finally {
        setIsOperationInProgress(false);
      }
    },
  });

  // Stop session mutation - simplified
  const stopSessionMutation = useMutation({
    mutationFn: async () => {
      setIsOperationInProgress(true);
      try {
        const result = await window.electronAPI.session.stop();
        // Wait for backend to fully process
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Immediately refetch to get the latest state
        await refetchDashboard();
        return result;
      } finally {
        setIsOperationInProgress(false);
      }
    },
  });

  // Listen for session updates from main process
  useEffect(() => {
    const handleIdleStatus = (event: any, idle: boolean) => {
      setIsIdle(idle);
    };
    
    const handleSessionUpdate = (event: any, data: any) => {
      console.log('Session update received:', data);
      // Only refetch if we're not in the middle of an operation
      if (!isOperationInProgress) {
        refetchDashboard();
      }
    };

    window.electronAPI?.on('idle-status', handleIdleStatus);
    window.electronAPI?.on('session-update', handleSessionUpdate);
    
    return () => {
      window.electronAPI?.off('idle-status', handleIdleStatus);
      window.electronAPI?.off('session-update', handleSessionUpdate);
    };
  }, [isOperationInProgress, refetchDashboard]);

  return {
    currentSession: dashboardData.currentSession,
    todayStats: dashboardData.todayStats,
    weekStats: dashboardData.weekStats,
    screenshots,
    isIdle,
    isOperationInProgress,
    startSession: (mode: string, task: string, projectId?: string) => 
      startSessionMutation.mutateAsync({ mode, task, projectId }),
    switchMode: (mode: string, task: string, projectId?: string) =>
      switchModeMutation.mutateAsync({ mode, task, projectId }),
    stopSession: () => stopSessionMutation.mutateAsync(),
  };
}

function getDefaultData(): TrackerData {
  return {
    currentSession: null,
    todayStats: {
      clientHours: 0,
      commandHours: 0,
      totalHours: 0,
      analytics: {
        focusMinutes: 0,
        handsOnMinutes: 0,
        researchMinutes: 0,
        aiMinutes: 0,
      },
    },
    weekStats: {
      clientHours: 0,
      commandHours: 0,
      totalHours: 0,
    },
    screenshots: [],
    isIdle: false,
  };
}