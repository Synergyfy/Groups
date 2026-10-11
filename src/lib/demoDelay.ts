import { useEffect, useState } from "react";

export function demoDelay(ms = 600): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function useDemoLoading(ms = 600): boolean {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(timer);
  }, [ms]);

  return loading;
}
