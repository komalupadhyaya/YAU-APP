import React from 'react';
import {
  PackageCheck,
  PackageX,
  Clock3,
  ShoppingCart,
} from 'lucide-react';

const iconMap = {
  "Total Orders": <ShoppingCart className="w-8 h-8 lg:w-8 lg:h-8 text-blue-500" />,
  "Received": <PackageCheck className="w-8 h-8 lg:w-8 lg:h-8 text-green-500" />,
  "Not Received": <PackageX className="w-8 h-8 lg:w-8 lg:h-8 text-red-500" />,
  "Pending Payment": <Clock3 className="w-8 h-8 lg:w-8 lg:h-8 text-yellow-500" />,
};

const StatCard = ({ value, title, iconKey }) => {
  return (
    <div className="glass flex  items-center justify-start gap-4 rounded-2xl p-2  text-center shadow-md hover:shadow-lg hover:-translate-y-1 transition-transform duration-300">
      <div className="mb-3 flex justify-center">{iconMap[title]}</div>
      <div className='text-left'>

        <div className="text-3xl lg:text-4xl font-extrabold gradient-text mb-1">
        {value}
      </div>
      <div className="text-gray-600 font-medium text-sm lg:text-base">
        {title}
      </div>
      </div>
      
    </div>
  );
};

export default StatCard;
