'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LinearConnectButtonProps {
  workspaceSlug: string;
  isConnected: boolean;
  organizationId?: string;
}

export function LinearConnectButton({ workspaceSlug, isConnected, organizationId }: LinearConnectButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = () => {
    window.location.href = `/api/oauth/linear/authorize?workspace=${workspaceSlug}`;
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Linear? You will need to reconnect to create issues.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/oauth/linear/disconnect?workspace=${workspaceSlug}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      router.refresh();
    } catch (error) {
      console.error('Error disconnecting Linear:', error);
      alert('Failed to disconnect Linear');
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full" />
          <span className="text-sm text-gray-300">Connected</span>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 100 100" fill="currentColor">
        <path d="M15.08,66.92l19-19-19-19,11.3-11.31L64.69,55.9a4,4,0,0,1,0,5.66L26.38,99.87Z" />
        <path d="M84.92,66.92l-19-19,19-19L73.62,17.61,35.31,55.9a4,4,0,0,0,0,5.66L73.62,99.87Z" />
      </svg>
      Connect Linear
    </button>
  );
}
