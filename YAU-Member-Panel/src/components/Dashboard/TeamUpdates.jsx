import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function TeamUpdates({ teams }) {
    const navigate = useNavigate()
  return (
    <div className="bg-white rounded-xl shadow-md w-full p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Team Updates</h3>
        <button className="text-xs text-blue-600 hover:underline" onClick={()=>{navigate("/messages")}}>View All</button>
      </div>

      {/* Updates list */}
      <div className="space-y-3 cursor-pointer"   onClick={()=>{navigate("/messages")}}     >
        {teams && teams.map((team) => {
          if (!team.latestMessage) return null;
          const msg = team.latestMessage;
          const formattedDate = format(new Date(msg.timestamp), "MMM d");

          return (
            <div
              key={msg.id}
              className="bg-gray-50 rounded-lg p-3 flex items-start gap-3"
            >
              {/* Avatar circle */}
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-xs">
                {msg.senderName?.charAt(0).toUpperCase()}
              </div>

              {/* Text section */}
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-800">
                    {msg.senderName}
                  </p>
                  <p className="text-xs text-gray-500">{formattedDate}</p>
                </div>
                <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                  {msg.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
