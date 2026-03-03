import { useEffect, useRef, useCallback } from 'react';
import { AssetReport, ReportStatus } from '../types';

export type WsEventType = 'report:created' | 'report:status_updated' | 'connection:ok' | 'connection:error';

export interface WsMessage {
    type: WsEventType;
    payload: any;
}

interface UseReportSocketOptions {
    /** Called when a new report is received (admin side) */
    onReportCreated?: (report: AssetReport) => void;
    /** Called when one of the user's reports has its status updated */
    onStatusUpdated?: (data: { id: string; status: ReportStatus; assetId: string; updatedAt: string }) => void;
}

const WS_URL = (() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Vite dev proxy target (backend port)
    const host = window.location.hostname;
    const port = 3001; // adjust if backend uses different port
    return `${proto}//${host}:${port}/ws`;
})();

export function useReportSocket({ onReportCreated, onStatusUpdated }: UseReportSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);

    const connect = useCallback(() => {
        const token = localStorage.getItem('asset_track_token');
        if (!token) return; // not authenticated

        const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[WS] Connected to report socket');
            // Clear any pending reconnect
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const msg: WsMessage = JSON.parse(event.data);
                switch (msg.type) {
                    case 'report:created':
                        onReportCreated?.(msg.payload);
                        break;
                    case 'report:status_updated':
                        onStatusUpdated?.(msg.payload);
                        break;
                    default:
                        break;
                }
            } catch (err) {
                console.warn('[WS] Failed to parse message', event.data);
            }
        };

        ws.onclose = (e) => {
            console.log('[WS] Connection closed', e.code);
            if (isMountedRef.current) {
                // Auto-reconnect after 3 seconds
                reconnectTimerRef.current = setTimeout(() => {
                    if (isMountedRef.current) connect();
                }, 3000);
            }
        };

        ws.onerror = (err) => {
            console.warn('[WS] Socket error', err);
            ws.close();
        };
    }, [onReportCreated, onStatusUpdated]);

    useEffect(() => {
        isMountedRef.current = true;
        connect();

        return () => {
            isMountedRef.current = false;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            wsRef.current?.close();
        };
    }, [connect]);
}
