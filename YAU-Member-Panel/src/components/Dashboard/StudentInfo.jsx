import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import defaultChild from '../../assets/child.jpg';
import { useNavigate } from "react-router-dom";


export default function StudentInfo({ childrenData}) {
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();
  const handleNext = () => {
    if (currentPage < childrenData.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="bg-white  w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-gray-600">Student</span>
        <button className="text-sm text-blue-600 hover:underline">
          Email
        </button>
      </div>

      {/* Student Card */}
      {childrenData.length > 0 && (
        <div className="flex items-center gap-4">
          {/* Photo */}
          <img
            src={childrenData[currentPage].headshotUrl ||  defaultChild }
            alt={childrenData[currentPage].firstName}
            className="w-20 h-20 rounded-lg object-cover"
          />

          {/* Info */}
          <div className="flex-1">
            <p className="font-bold text-lg">
              {childrenData[currentPage].firstName}{" "}
              {childrenData[currentPage].lastName}
            </p>
            <p className="text-sm text-gray-600">
              {childrenData[currentPage].grade || childrenData[currentPage].ageGroup || "N/A"}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              Jersey #{childrenData[currentPage].uniformTop || "N/A"}
            </p>

            <span
              className={`text-xs px-2 py-1 rounded ${
                childrenData[currentPage].idStatus === "active"
                  ? "bg-green-500 text-white"
                  : childrenData[currentPage].idStatus === "pending"
                  ? "bg-yellow-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {childrenData[currentPage].idStatus}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 mt-3 text-sm text-blue-600 font-medium">
        <button
        //   onClick={() => navigate(`/messages/${childrenData[currentPage].uid}`)}
          onClick={() => navigate(`/messages`)}
          className="hover:underline"
        >
          View Team Messages
        </button>
        <button
        //   onClick={() => navigate(`/idcard/${childrenData[currentPage].uid}`)}
          onClick={() => navigate(`/child-id`)}
          className="hover:underline"
        >
          View ID Card
        </button>
      </div>

      {/* Pagination Arrows */}
      {childrenData.length > 1 && (
        <div className="flex justify-center items-center mt-4 gap-6">
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            className="disabled:opacity-40"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm text-gray-600">
            {currentPage + 1} / {childrenData.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage === childrenData.length - 1}
            className="disabled:opacity-40"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
