import { useEffect } from "react";

export function useSocket(setup) {
  useEffect(() => {
    const maybeCleanup = setup();
    return () => {
      if (typeof maybeCleanup === "function") maybeCleanup();
    };
  }, [setup]);
}
