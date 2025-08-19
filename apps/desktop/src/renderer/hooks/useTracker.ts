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

  const { data: dashboardData = getDefaultData() } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const data = await window.electronAPI.dashboard.getData();
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: screenshots = [] } = useQuery({
    queryKey: ['screenshots'],
    queryFn: async () => {
      const data = await window.electronAPI.screenshots.getToday();
      return data;
    },
    refetchInterval: 60000,
  });

  const startSessionMutation = useMutation({
    mutationFn: async ({ mode, task, projectId }: any) => {
      return window.electronAPI.session.start(mode, task, projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const switchModeMutation = useMutation({
    mutationFn: async ({ mode, task, projectId }: any) => {
      return window.electronAPI.session.switchMode(mode, task, projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const stopSessionMutation = useMutation({
    mutationFn: async () => {
      return window.electronAPI.session.stop();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  useEffect(() => {
    const handleIdleStatus = (event: any, idle: boolean) => {
      setIsIdle(idle);
    };

    window.electronAPI?.on('idle-status', handleIdleStatus);
    return () => {
      window.electronAPI?.off('idle-status', handleIdleStatus);
    };
  }, []);

  return {
    currentSession: dashboardData.currentSession,
    todayStats: dashboardData.todayStats,
    weekStats: dashboardData.weekStats,
    screenshots,
    isIdle,
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