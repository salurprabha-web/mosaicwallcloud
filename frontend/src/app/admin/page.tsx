'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRootPage() {
  const router = useRouter();
  useEffect(() => {
    // Redirect bare /admin to /admin/default (the auto-created default mosaic)
    router.replace('/admin/default');
  }, [router]);
  return null;
}
