import React from "react";
import { Autocomplete, TextField, Avatar, Box, Typography } from "@mui/material";
import { Users } from "lucide-react"; // optional icon

export default function TeamSelector({
  organizations,
  team1,
  setTeam1,
  team2,
  setTeam2,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Users size={20} className="text-blue-600" />
        Teams
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Team 1 */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Team 1 *
          </Typography>
          <Autocomplete
            value={team1}
            onChange={(e, newValue) => setTeam1(newValue)}
            options={organizations.filter(org => org.id !== team2?.id)}
            getOptionLabel={(option) => option.name}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 1,
                  borderBottom: "1px solid #f3f3f3",
                }}
              >
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: "primary.light",
                    fontSize: 13,
                  }}
                >
                  {option.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.city}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search for organization"
                variant="outlined"
                fullWidth
              />
            )}
            openOnFocus // 🔹 shows dropdown immediately when clicked
            disablePortal // 🔹 keeps dropdown closer to the input
          />
        </Box>

        {/* VS Divider */}
        <div className="flex justify-center items-center h-full">
          <span className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-lg">
            VS
          </span>
        </div>

        {/* Team 2 */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Team 2 *
          </Typography>
          <Autocomplete
            value={team2}
            onChange={(e, newValue) => setTeam2(newValue)}
            options={organizations.filter(org => org.id !== team1?.id)}
            getOptionLabel={(option) => option.name}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 1,
                  borderBottom: "1px solid #f3f3f3",
                }}
              >
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: "orange.light",
                    fontSize: 13,
                  }}
                >
                  {option.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {option.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.city}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search for organization"
                variant="outlined"
                fullWidth
              />
            )}
            openOnFocus
            disablePortal
          />
        </Box>
      </div>
    </div>
  );
}
