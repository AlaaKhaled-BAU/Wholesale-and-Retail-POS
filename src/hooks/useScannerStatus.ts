import { useState, useEffect, useRef, useCallback } from 'react';

export type ScannerStatus = 'connected' | 'disconnected' | 'unknown';

const SCAN_TIMEOUT = 60_000; // Mark as disconnected after 60s of no scans
const CHECK_INTERVAL = 5_000; // Check hardware every 5s when in Tauri

export function useScannerStatus() {
  const [status, setStatus] = useState<ScannerStatus>('unknown');
  const [deviceName, setDeviceName] = useState<string>('');
  const lastScanRef = useRef<number>(0);
  const scanBufferRef = useRef('');
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isTauriRef = useRef(false);

  // Detect if running inside Tauri
  useEffect(() => {
    isTauriRef.current = typeof window !== 'undefined' && '__TAURI__' in window;
  }, []);

  // Listen for scan events globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Enter' && scanBufferRef.current.length >= 6) {
        // Scan detected!
        lastScanRef.current = Date.now();
        setStatus('connected');
        scanBufferRef.current = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Character key - accumulate in buffer
        clearTimeout(scanTimerRef.current);
        scanBufferRef.current += e.key;
        scanTimerRef.current = setTimeout(() => {
          scanBufferRef.current = '';
        }, 200);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(scanTimerRef.current);
    };
  }, []);

  // Activity-based timeout check
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastScanRef.current > 0) {
        const elapsed = Date.now() - lastScanRef.current;
        if (elapsed > SCAN_TIMEOUT && status === 'connected') {
          setStatus('disconnected');
        }
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [status]);

  // Optional: try calling Tauri hardware detection
  const checkHardware = useCallback(async () => {
    if (!isTauriRef.current) return;
    try {
      const { checkScannerConnected } = await import('../lib/tauri-commands');
      const result = await checkScannerConnected() as { connected: boolean; deviceName?: string };
      setStatus(result.connected ? 'connected' : 'disconnected');
      if (result.deviceName) setDeviceName(result.deviceName);
    } catch {
      // Tauri command not implemented yet by Dev B - fallback to activity-based
    }
  }, []);

  useEffect(() => {
    if (!isTauriRef.current) return;
    checkHardware();
    checkIntervalRef.current = setInterval(checkHardware, CHECK_INTERVAL);
    return () => clearInterval(checkIntervalRef.current);
  }, [checkHardware]);

  return { status, deviceName };
}
