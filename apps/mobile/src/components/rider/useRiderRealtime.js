import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { connectRealtime } from '../../services/realtime';
import { RIDER_DEMO_LOCATION, syncRiderData } from '../../redux/apiThunks';
import { selectRiderAccount } from '../../redux/riderSlice';

const LOCATION_MS = 60000; // dispatch only offers orders to riders seen in the last 2 minutes
const FALLBACK_POLL_MS = 10000;
// Server events that mean "your offers or orders changed": delivery.offer, offer.expired, order.*
const REFRESH_EVENT = /^(delivery|offer|order)\./;

// True while the rider app is connected to FoodMind's live updates.
export const RiderLiveContext = createContext(false);
export const useRiderLive = () => useContext(RiderLiveContext);

// Keeps the rider's offers, active delivery and its Mapbox map up to date over a WebSocket.
// Each event triggers syncRiderData(), which reloads the details through the normal REST calls into Redux.
export default function useRiderRealtime(enabled) {
  const dispatch = useDispatch();
  const online = useSelector(state => selectRiderAccount(state).online);
  const [live, setLive] = useState(false);
  const connection = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    dispatch(syncRiderData());
    connection.current = connectRealtime({
      // On every (re)connect, catch up on anything missed while disconnected.
      onStatus: open => { setLive(open); if (open) dispatch(syncRiderData()); },
      onMessage: message => { if (REFRESH_EVENT.test(message?.type || '')) dispatch(syncRiderData()); },
    });
    return () => {
      connection.current?.close();
      connection.current = null;
      setLive(false);
    };
  }, [enabled, dispatch]);

  // The rider's location goes over the same socket every minute while online.
  useEffect(() => {
    if (!enabled || !online || !live) return undefined;
    const sendLocation = () => connection.current?.send('rider.location', RIDER_DEMO_LOCATION);
    sendLocation();
    const timer = setInterval(sendLocation, LOCATION_MS);
    return () => clearInterval(timer);
  }, [enabled, online, live]);

  // Backup only while the socket is down: refresh every 10 seconds like before.
  useEffect(() => {
    if (!enabled || live) return undefined;
    const timer = setInterval(() => dispatch(syncRiderData()), FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, live, dispatch]);

  return live;
}
