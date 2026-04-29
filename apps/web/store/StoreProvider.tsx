'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure the store is created only once per request/client
  const storeRef = useRef(store);
  
  return <Provider store={storeRef.current}>{children}</Provider>;
}
