import { format, parse } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function NextGameCard({ schedulesResponse }) {
    const navigate = useNavigate()
  const now = new Date();

  // Transform schedules into Date objects
  const games =
    schedulesResponse?.map((g) => {
      // date in your response is like "09-20-2025"
      const gameDateTime = parse(
        `${g.date} ${g.time}`,
        "MM-dd-yyyy HH:mm",
        new Date()
      );

      return {
        ...g,
        gameDateTime,
      };
    }) || [];

  // Filter future games
  const upcomingGames = games.filter((g) => g.gameDateTime > now);

  // Sort by soonest
  upcomingGames.sort((a, b) => a.gameDateTime - b.gameDateTime);

  const nextGame = upcomingGames[0];

  if (!nextGame) {
    return (
      <div className="bg-gray-100 text-gray-700 rounded-xl p-4 w-full shadow-md">
        <p className="text-sm font-medium">Next Game</p>
        <p className="mt-2 text-lg font-semibold">No upcoming games</p>
        <p className="text-sm opacity-80">Stay tuned for updates!</p>
      </div>
    );
  }

  const date = nextGame.gameDateTime;

  return (
    <div className="bg-blue-500 text-white rounded-xl p-4 w-full shadow-md">
      {/* Header */}
      <p className="text-sm font-medium">Next Game</p>

      {/* Date & Time */}
      <div className="flex justify-between items-center mt-1">
        <div>
          <p className="text-lg font-semibold">
            {format(date, "EEE, MMM. d")}
          </p>
          <p className="text-sm">{format(date, "h:mm a")}</p>
        </div>

        {/* Opponent & Location */}
        <div className="text-right">
          <p className="text-lg font-semibold">
            vs {nextGame.team2Name || "TBD"}
          </p>
          <p className="text-sm opacity-90">{nextGame.location}</p>
        </div>
      </div>

      {/* Button */}
      <button onClick={()=>{navigate("/schedule")}} className="mt-4 bg-white text-blue-600 px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-100">
        View Full Schedule
      </button>
    </div>
  );
}
