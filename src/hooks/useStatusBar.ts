import { useState, useCallback } from 'react';

interface StatusBarState {
  isLoading: boolean;
  navigationTree: string[];
  currentTier: number;
}

export const useStatusBar = () => {
  const [state, setState] = useState<StatusBarState>({
    isLoading: false,
    navigationTree: [],
    currentTier: 0
  });

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const updateNavigation = useCallback((tree: string[]) => {
    setState(prev => ({ ...prev, navigationTree: tree }));
  }, []);

  const setTier = useCallback((tier: number) => {
    setState(prev => ({ ...prev, currentTier: tier }));
  }, []);

  const addToNavigation = useCallback((item: string) => {
    setState(prev => ({
      ...prev,
      navigationTree: [...prev.navigationTree, item]
    }));
  }, []);

  const removeFromNavigation = useCallback((count: number = 1) => {
    setState(prev => ({
      ...prev,
      navigationTree: prev.navigationTree.slice(0, -count)
    }));
  }, []);

  return {
    ...state,
    setLoading,
    updateNavigation,
    setTier,
    addToNavigation,
    removeFromNavigation
  };
};
