import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Coordinates, DriverRecord, RideRecord } from '../types/ridenexa';

interface SocketContextValue {
  connected: boolean;
  drivers: DriverRecord[];
  isSimulatedFleet: boolean;
  lastRideEvent: { type: 'created' | 'updated'; ride: RideRecord; ts: number } | null;
  refreshFleet: () => Promise<void>;
  emitDriverLocation: (driverId: string, coordinates: Coordinates, areaName?: string) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [isSimulatedFleet, setIsSimulatedFleet] = useState(true);
  const [lastRideEvent, setLastRideEvent] = useState<{
    type: 'created' | 'updated';
    ride: RideRecord;
    ts: number;
  } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const refreshFleet = async () => {
    try {
      const res = await fetch('/api/fleet/drivers');
      if (res.ok) {
        const data = (await res.json()) as { drivers: DriverRecord[]; isSimulatedFleet: boolean };
        setDrivers(data.drivers);
        setIsSimulatedFleet(data.isSimulatedFleet);
      }
    } catch {
      // Ignore network hiccup
    }
  };

  useEffect(() => {
    refreshFleet();

    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('fleet:sync', (payload: { drivers: DriverRecord[]; isSimulatedFleet: boolean }) => {
      setDrivers(payload.drivers);
      setIsSimulatedFleet(payload.isSimulatedFleet);
    });

    socket.on(
      'fleet:positions',
      (payload: { drivers: { id: string; coordinates: Coordinates; isSimulatedLocation: boolean }[] }) => {
        setDrivers((prev) =>
          prev.map((d) => {
            const match = payload.drivers.find((u) => u.id === d.id);
            return match ? { ...d, coordinates: match.coordinates, isSimulatedLocation: match.isSimulatedLocation } : d;
          })
        );
      }
    );

    socket.on('driver:updated', (updated: DriverRecord) => {
      setDrivers((prev) => {
        const exists = prev.some((d) => d.id === updated.id);
        return exists ? prev.map((d) => (d.id === updated.id ? updated : d)) : [...prev, updated];
      });
    });

    socket.on('ride:created', (ride: RideRecord) => {
      setLastRideEvent({ type: 'created', ride, ts: Date.now() });
    });

    socket.on('ride:updated', (ride: RideRecord) => {
      setLastRideEvent({ type: 'updated', ride, ts: Date.now() });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emitDriverLocation = (driverId: string, coordinates: Coordinates, areaName?: string) => {
    socketRef.current?.emit('driver:ping_location', { driverId, coordinates, areaName });
  };

  return (
    <SocketContext.Provider
      value={{
        connected,
        drivers,
        isSimulatedFleet,
        lastRideEvent,
        refreshFleet,
        emitDriverLocation,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}
