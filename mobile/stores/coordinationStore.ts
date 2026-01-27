import { create } from 'zustand';

interface CoordinationState {
  // Track if monitoring should start (triggered by navigation)
  shouldStartMonitoring: boolean;
  // Track if navigation should start (triggered by monitoring)
  shouldStartNavigation: boolean;
  // Track if monitoring should stop (triggered by navigation)
  shouldStopMonitoring: boolean;
  // Track if navigation should stop (triggered by monitoring)
  shouldStopNavigation: boolean;
  // Flag to prevent infinite loops
  isCoordinating: boolean;

  // Actions
  requestMonitoringStart: () => void;
  requestNavigationStart: () => void;
  requestMonitoringStop: () => void;
  requestNavigationStop: () => void;
  clearMonitoringRequest: () => void;
  clearNavigationRequest: () => void;
  clearMonitoringStopRequest: () => void;
  clearNavigationStopRequest: () => void;
  setCoordinating: (isCoordinating: boolean) => void;
}

export const useCoordinationStore = create<CoordinationState>((set) => ({
  shouldStartMonitoring: false,
  shouldStartNavigation: false,
  shouldStopMonitoring: false,
  shouldStopNavigation: false,
  isCoordinating: false,

  requestMonitoringStart: () => set({ shouldStartMonitoring: true }),
  requestNavigationStart: () => set({ shouldStartNavigation: true }),
  requestMonitoringStop: () => set({ shouldStopMonitoring: true }),
  requestNavigationStop: () => set({ shouldStopNavigation: true }),
  clearMonitoringRequest: () => set({ shouldStartMonitoring: false }),
  clearNavigationRequest: () => set({ shouldStartNavigation: false }),
  clearMonitoringStopRequest: () => set({ shouldStopMonitoring: false }),
  clearNavigationStopRequest: () => set({ shouldStopNavigation: false }),
  setCoordinating: (isCoordinating: boolean) => set({ isCoordinating }),
}));
