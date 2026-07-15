'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ScoresPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/scores/upload'); }, [router]);
  return null;
}
