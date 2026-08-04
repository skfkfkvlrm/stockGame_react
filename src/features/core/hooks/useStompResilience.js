import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export const ConnectionStatus = {
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    RECONNECTING: 'RECONNECTING',
    DISCONNECTED: 'DISCONNECTED',
    FAILED: 'FAILED'
};

export const useStompResilience = ({
    url = 'http://localhost:8082/ws',
    subscriptions = [],
    maxReconnectAttempts = 5,
    initialDelay = 1000,
    maxDelay = 30000
}) => {
    const [status, setStatus] = useState(ConnectionStatus.DISCONNECTED);
    const [retryCount, setRetryCount] = useState(0);
    const clientRef = useRef(null);
    const retryTimerRef = useRef(null);

    const calculateBackoffDelay = (attempt) => {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        const jitter = delay * 0.2 * Math.random();
        return Math.floor(delay + jitter);
    };

    const subscriptionsRef = useRef(subscriptions);
    subscriptionsRef.current = subscriptions;

    const connect = useCallback(() => {
        if (clientRef.current && clientRef.current.active) return;

        setStatus(ConnectionStatus.CONNECTING);

        const client = new Client({
            webSocketFactory: () => new SockJS(url),
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
            reconnectDelay: 0, // Direct control via backoff

            onConnect: () => {
                setStatus(ConnectionStatus.CONNECTED);
                setRetryCount(0);

                subscriptionsRef.current.forEach(({ topic, callback }) => {
                    client.subscribe(topic, callback);
                });
            },

            onDisconnect: () => {
                setStatus(ConnectionStatus.DISCONNECTED);
            },

            onStompError: (frame) => {
                console.error('STOMP Error:', frame.headers['message']);
            },

            onWebSocketClose: () => {
                setStatus((prev) => {
                    if (prev !== ConnectionStatus.FAILED) {
                        handleReconnect();
                    }
                    return prev;
                });
            }
        });

        clientRef.current = client;
        client.activate();
    }, [url]);

    const handleReconnect = useCallback(() => {
        setRetryCount((prevCount) => {
            const nextCount = prevCount + 1;
            if (nextCount > maxReconnectAttempts) {
                setStatus(ConnectionStatus.FAILED);
                console.error(`WebSocket Max reconnect attempts (${maxReconnectAttempts}) reached.`);
                return prevCount;
            }

            setStatus(ConnectionStatus.RECONNECTING);
            const delay = calculateBackoffDelay(nextCount);

            retryTimerRef.current = setTimeout(() => {
                if (clientRef.current) {
                    clientRef.current.activate();
                }
            }, delay);

            return nextCount;
        });
    }, [maxReconnectAttempts, initialDelay, maxDelay]);

    const disconnect = useCallback(() => {
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        if (clientRef.current) {
            clientRef.current.deactivate();
        }
        setStatus(ConnectionStatus.DISCONNECTED);
        setRetryCount(0);
    }, []);

    // Network online listener for instant recovery
    useEffect(() => {
        const handleOnline = () => {
            if (status === ConnectionStatus.RECONNECTING || status === ConnectionStatus.FAILED || status === ConnectionStatus.DISCONNECTED) {
                console.log('Network online detected: Re-activating WebSocket');
                setRetryCount(0);
                connect();
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [connect, status]);

    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, []);

    return { status, retryCount, reconnect: connect, disconnect };
};
