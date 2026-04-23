import { useEffect } from "react";
import { useLocation } from "wouter";

export function ChatPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/studio", { replace: true });
  }, [setLocation]);

  return null;
}
