import React, { useState, useEffect } from 'react';
import './StatusBar.css';

interface StatusBarProps {
  isLoading?: boolean;
  navigationTree?: string[];
  currentTier?: number;
  latency?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isLoading = false,
  navigationTree = [],
  currentTier = 0,
  latency: externalLatency
}) => {
  const [latency, setLatency] = useState<number>(0);

  useEffect(() => {
    if (externalLatency !== undefined) {
      setLatency(externalLatency);
    }
  }, [externalLatency]);

  const getLastTwoItems = (): string[] => {
    if (navigationTree.length === 0) return ['Start'];
    if (navigationTree.length === 1) return navigationTree;
    return navigationTree.slice(-2);
  };

  const lastTwoItems = getLastTwoItems();

  return (
    <div className="status-bar">
      <div className="status-section">
        <span className="breadcrumb">
          {lastTwoItems.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && ' › '}
              {item}
            </React.Fragment>
          ))}
        </span>
      </div>
      
      <div className="status-section center">
        <span className="tier-level">{currentTier > 0 ? `${currentTier}` : '01'}</span>
      </div>
      
      <div className="status-section" style={{ justifyContent: 'flex-end' }}>
        {isLoading && <div className="loading-spinner" />}
        <span className="latency">
          {latency > 0 ? `${latency} ms` : '-- ms'}
        </span>
      </div>
    </div>
  );
};
