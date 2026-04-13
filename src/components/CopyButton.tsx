"use client";
import { useState, useCallback } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied!",
  className = "btn btnSecondary",
  style,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      window.prompt("Copy this:", text);
    }
  }, [text]);

  return (
    <button className={className} style={style} type="button" onClick={handleCopy}>
      {copied ? copiedLabel : label}
    </button>
  );
}
