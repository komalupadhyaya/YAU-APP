
const Table = ({ headers, children, className = '' }) => {
  // If headers are provided, use the old pattern (auto-generate thead)
  if (headers && Array.isArray(headers)) {
    return (
      <div className="overflow-x-auto -mx-4 lg:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border border-gray-200 lg:rounded-lg">
            <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (
                    <th 
                      key={index}
                      className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {children}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // If no headers, render children directly (children should include thead/tbody)
  return (
    <div className="overflow-x-auto -mx-4 lg:mx-0">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden border border-gray-200 lg:rounded-lg">
          <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
            {children}
          </table>
        </div>
      </div>
    </div>
  );
};

export const TableRow = ({ children, className = '' }) => (
  <tr className={`hover:bg-gray-50 transition-colors ${className}`}>
    {children}
  </tr>
);

export const TableCell = ({ children, className = '', colSpan, isHeader = false }) => {
  const Tag = isHeader ? 'th' : 'td';
  return (
    <Tag 
      colSpan={colSpan}
      className={`px-3 lg:px-6 py-4 whitespace-nowrap text-sm ${className}`}
    >
      {children}
    </Tag>
  );
};

export default Table;