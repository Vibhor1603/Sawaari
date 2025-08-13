import React, { useState, useEffect } from "react";

const PerformanceMonitor = ({ options = [], visible = false }) => {
  const [renderTime, setRenderTime] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);

  useEffect(() => {
    if (!visible) return;

    const startTime = performance.now();

    // Simulate render completion
    const timer = setTimeout(() => {
      const endTime = performance.now();
      setRenderTime(Math.round(endTime - startTime));
    }, 0);

    // Monitor memory usage if available
    if (performance.memory) {
      setMemoryUsage(
        Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)
      );
    }

    return () => clearTimeout(timer);
  }, [options.length, visible]);

  if (!visible || process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded border border-sawaari-yellow/30 z-50">
      <div className="font-semibold text-sawaari-yellow mb-1">
        Performance Monitor
      </div>
      <div>Options: {options.length}</div>
      <div>Render: {renderTime}ms</div>
      {memoryUsage > 0 && <div>Memory: {memoryUsage}MB</div>}
    </div>
  );
};

export default PerformanceMonitor;
