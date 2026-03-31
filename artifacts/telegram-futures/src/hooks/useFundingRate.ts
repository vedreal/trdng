import { useEffect, useRef, useState } from "react";

function formatCountdown(targetMs: number): string {
  const diff = targetMs - Date.now();
  if (diff <= 0) return "00:00";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useFundingRate(_symbol = "BTCUSDT") {
  const fundingRate = -0.0004;
  const nextFundingTime = useRef(Date.now() + 34 * 60 * 1000 + 47 * 1000);
  const [countdown, setCountdown] = useState("34:47");

  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown(formatCountdown(nextFundingTime.current));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return {
    rate: fundingRate,
    countdown,
  };
}
