// src/components/ScheduleTable.jsx
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Card,
  CardContent,
  useMediaQuery,
  Alert,
} from "@mui/material";
import React, { useState } from "react";

const ScheduleTable = ({ org, ageGroup, onBack, schedules }) => {
  const [tab, setTab] = useState("upcoming");
  const isMobile = useMediaQuery("(max-width:600px)");
  const now = new Date();

  console.log("ScheduleTable - schedules:", schedules);

  // Check if schedules array contains actual match data or organization data
  const hasMatchStructure = schedules.length > 0 && schedules[0].team1 && schedules[0].team2;

  // Filter games for this organization and age group
  const games = hasMatchStructure ? schedules.filter(game => {
    const team1Ages = Array.isArray(game.team1.ageGroup)
      ? game.team1.ageGroup
      : [game.team1.ageGroup];
    const team2Ages = Array.isArray(game.team2.ageGroup)
      ? game.team2.ageGroup
      : [game.team2.ageGroup];

    const isOrgGame = game.team1.orgName === org.name || game.team2.orgName === org.name;
    const isAgeGroupMatch = team1Ages.includes(ageGroup) || team2Ages.includes(ageGroup);
    return isOrgGame && isAgeGroupMatch;
  }) : [];


  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    return timeString || 'Time TBD';
  };

  // Get sport name from game
  const getSportName = (game) => {
    return game.team1?.sport || 'Sport TBD';
  };

  // Separate upcoming and completed games
  const upcoming = games.filter((g) => new Date(g.date) >= now);
  const completed = games.filter((g) => new Date(g.date) < now);
  const displayed = tab === "upcoming" ? upcoming : completed;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Breadcrumb */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 0.5, fontSize: { xs: "0.8rem", md: "0.9rem" } }}
      >
        Dashboard / {org.name} / {ageGroup}
      </Typography>

      {/* Title */}
      <Typography
        variant="h5"
        sx={{ mt: 1, fontSize: { xs: "1.25rem", md: "1.5rem" } }}
      >
        Game Schedule - {ageGroup}
      </Typography>

      {/* Subtext */}
      <Typography
        variant="body1"
        sx={{ mb: 2, fontSize: { xs: "0.9rem", md: "1rem" } }}
      >
        {org.name} — {ageGroup}{" "}
        <span style={{ color: "#6b7280" }}>Upcoming matchups & notes</span>
      </Typography>

      {/* Debug Info - Remove in production */}
      {!hasMatchStructure && schedules.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Debug: Received {schedules.length} items, but they don't appear to be match data. 
          Please check the API response structure.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        variant={isMobile ? "fullWidth" : "standard"}
        sx={{
          mb: 2,
          borderBottom: "1px solid #e5e7eb",
          "& .MuiTab-root": { textTransform: "none", fontWeight: 500 },
        }}
      >
        <Tab label={`Upcoming (${upcoming.length})`} value="upcoming" />
        <Tab label={`Completed (${completed.length})`} value="completed" />
      </Tabs>

      {games.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No Games Scheduled
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            There are no {tab} games scheduled for {org.name} - {ageGroup} at this time.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Check back later for updates to the schedule.
          </Typography>
        </Box>
      ) : isMobile ? (
        // MOBILE VIEW - CARD LIST
        <Box>
          {displayed.map((game) => (
            <Card
              key={game.id}
              sx={{
                mb: 2,
                borderRadius: 2,
                boxShadow:
                  "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
              }}
            >
              <CardContent>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, color: "#1e3a8a" }}
                >
                  {game.matchup}
                </Typography>
                <Typography sx={{ fontSize: "0.9rem" }}>
                  🏀 <strong>Sport:</strong> {getSportName(game).replace('_', ' ')}
                </Typography>
                <Typography sx={{ fontSize: "0.9rem" }}>
                  📅 <strong>Date:</strong> {formatDate(game.date)}
                </Typography>
                <Typography sx={{ fontSize: "0.9rem" }}>
                  ⏰ <strong>Time:</strong> {formatTime(game.time)}
                </Typography>
                <Typography sx={{ fontSize: "0.9rem" }}>
                  📍{" "}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      game.location
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#2563eb",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    {game.location}
                  </a>
                </Typography>
                {game.notes && (
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      mt: 1,
                      color: "#4b5563",
                      fontStyle: "italic",
                    }}
                  >
                    📝 {game.notes}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        // DESKTOP TABLE VIEW
        <Box
          sx={{
            width: "100%",
            overflowX: "auto",
            borderRadius: 2,
            boxShadow:
              "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
            backgroundColor: "white",
          }}
        >
          <Table
            sx={{
              minWidth: 600,
              "& th": {
                backgroundColor: "#eff6ff",
                color: "#1e3a8a",
                fontWeight: 600,
              },
              "& td, & th": { fontSize: { xs: "0.8rem", md: "0.95rem" } },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Matchup</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Sport</TableCell>
                <TableCell>Special Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayed.map((game) => (
                <TableRow
                  key={game.id}
                  hover
                  sx={{
                    "&:hover": { backgroundColor: "#f9fafb" },
                    transition: "background 0.2s ease",
                  }}
                >
                  <TableCell sx={{ minWidth: 120 }}>{game.matchup}</TableCell>

                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(game.date)}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatTime(game.time)}</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        game.location
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "#2563eb",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                    >
                      {game.location}
                    </a>
                  </TableCell>
                                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {getSportName(game).replace('_', ' ')}
                  </TableCell>
                  <TableCell sx={{ minWidth: 200 }}>{game.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Back Button */}
      <Button
        variant="outlined"
        sx={{
          mt: 3,
          textTransform: "none",
          fontWeight: 500,
          borderRadius: 2,
          borderColor: "#3b82f6",
          color: "#2563eb",
          "&:hover": {
            backgroundColor: "#eff6ff",
            borderColor: "#2563eb",
          },
        }}
        onClick={onBack}
      >
        ← Back to Age Groups
      </Button>
    </Box>
  );
};

export default ScheduleTable;