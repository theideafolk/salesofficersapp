// Recent visit item component
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { RecentVisit } from '../hooks/useRecentVisits';

interface RecentVisitItemProps {
  visit: RecentVisit;
}

const RecentVisitItem: React.FC<RecentVisitItemProps> = ({ visit }) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center">
        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
        <span className="font-medium">{visit.name}</span>
      </div>
      <span className="text-gray-600">{visit.visit_time}</span>
    </div>
  );
};

export default RecentVisitItem;