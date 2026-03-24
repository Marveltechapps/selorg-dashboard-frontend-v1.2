import React from 'react';
import { EmptyState } from '../components/ui/ux-components';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/page-header';
import { AlertTriangle } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-6">
      <div className="max-w-3xl mx-auto space-y-6 pt-10">
        <PageHeader
          title="Page Not Found"
          subtitle="This route does not exist."
          actions={
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-[#4F46E5] text-white font-medium rounded-lg hover:bg-[#4338CA]"
            >
              Go to Login
            </button>
          }
        />

        <EmptyState
          icon={AlertTriangle}
          title="404"
          description="Try navigating back to a valid dashboard screen."
        />
      </div>
    </div>
  );
}

