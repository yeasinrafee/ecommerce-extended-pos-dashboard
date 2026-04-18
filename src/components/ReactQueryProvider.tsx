'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

interface Props {
  children: ReactNode;
}

export default function ReactQueryProvider({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <DndProvider backend={HTML5Backend}>{children}</DndProvider>
    </QueryClientProvider>
  );
}
