// EnhancedTimesheet.jsx
import React, { useState, useEffect } from "react";
import { Edit, Trash2 } from "lucide-react";
import {
  getTimesheetEntries,
  createTimesheetEntry,
  updateTimesheetEntry,
  deleteTimesheetEntry,
  getAllLocations,
} from "../../firebase/apis/timesheet";

const Timesheet = ({ coachId }) => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalHours, setTotalHours] = useState(0);
  const [totalMinutes, setTotelMinutes] = useState(0);
  const [editingEntry, setEditingEntry] = useState({
    id: null,
    date: "",
    location: "",
    hours: "",
    note: "",
  });
  const [locations, setLocations] = useState([["Roosevelt HS – Turf"]]);
  const totalHoursDecimal = entries.reduce(
    (sum, entry) => sum + Number(entry.hours),
    0
  );

  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    location: "Roosevelt HS – Turf",
    hours: "",
    note: "",
  });

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const data = await getTimesheetEntries(coachId);
        // Convert decimal hours back to HH:MM format for display in inputs
        const formattedData = data.map((entry) => ({
          ...entry,
          hours: convertDecimalToTime(entry.hours),
        }));
        setEntries(formattedData);
        const res = await getAllLocations();
        if (res.success && res.data) {
          const locNames = res.data.map((loc) => loc.name);
          setLocations(locNames);
        }
      } catch (err) {
        console.error("Failed to fetch timesheet entries:", err);
      }
    };
    fetchEntries();
  }, [coachId]);

  // Apply filter and search
  useEffect(() => {
    let filtered = entries;
    setFilteredEntries(filtered);
  }, [entries]);

  // Helper function to convert HH:MM to decimal hours
  const convertTimeToDecimal = (timeString) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(":").map(Number);
    return parseFloat((hours + minutes / 60).toFixed(2));
  };

  // Add new entry
  const handleAddEntry = async () => {
    if (!newEntry.hours || !newEntry.date || !newEntry.location) {
      alert("Please fill in required fields");
      return;
    }

    try {
      const savedEntry = await createTimesheetEntry({
        ...newEntry,
        hours: convertTimeToDecimal(newEntry.hours),
        coachId,
      });

      // Convert the returned entry back to HH:MM format for local state
      const formattedEntry = {
        ...savedEntry,
        hours: convertDecimalToTime(savedEntry.hours),
      };
      setEntries([...entries, formattedEntry]);

      setEntries([...entries, savedEntry]);
      setNewEntry((prev) => ({
        ...prev,
        hours: "",
        note: "",
      }));
    } catch (err) {
      console.error("Failed to add timesheet entry:", err);
    }
  };

  // Edit entry
  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  // Helper function to convert decimal hours to HH:MM format
  const convertDecimalToTime = (decimalHours) => {
    if (!decimalHours) return "00:00";
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    setTotelMinutes((prevMinutes) => prevMinutes + minutes);
    setTotalHours((prevMinutes) => prevMinutes + hours);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  // Save edited entry
  const handleSaveEdit = async () => {
    if (!editingEntry.date || !editingEntry.hours || !editingEntry.location) {
      alert("Please fill in required fields");
      return;
    }

    try {
      const updatedEntry = await updateTimesheetEntry(editingEntry.id, {
        ...editingEntry,
        hours: convertTimeToDecimal(editingEntry.hours),
      });

      // Convert the returned entry back to HH:MM format for local state
      const formattedEntry = {
        ...updatedEntry,
        hours: convertDecimalToTime(updatedEntry.hours),
      };
      setEntries(
        entries.map((e) => (e.id === formattedEntry.id ? formattedEntry : e))
      );

      setEntries(
        entries.map((e) => (e.id === updatedEntry.id ? updatedEntry : e))
      );
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to update timesheet entry:", err);
    }
  };

  // Delete entry
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      await deleteTimesheetEntry(id);
      setEntries(entries.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete timesheet entry:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <h1 className="text-sm font-medium text-gray-700 mb-2">
        Dashbord / Timesheet
      </h1>
      <h1 className="text-3xl font-bold text-gray-700 mb-2">Timesheet</h1>
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Add Hours
            </h1>
          </div>
        </div>

        {/* Add Entry Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={newEntry.date}
              onChange={(e) =>
                setNewEntry({ ...newEntry, date: e.target.value })
              }
            />
          </div>

          {/* Select version that stores same data format */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Hours
            </label>
            <div className="flex space-x-2">
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-[50%]"
                value={newEntry.hours.split(":")[0] || "00"}
                onChange={(e) => {
                  const hours = e.target.value;
                  const minutes = newEntry.hours.split(":")[1] || "00";
                  setNewEntry({ ...newEntry, hours: `${hours}:${minutes}` });
                }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i.toString().padStart(2, "0")}>
                    {i.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-[50%]"
                value={newEntry.hours.split(":")[1] || "00"}
                onChange={(e) => {
                  const minutes = e.target.value;
                  const hours = newEntry.hours.split(":")[0] || "00";
                  setNewEntry({ ...newEntry, hours: `${hours}:${minutes}` });
                }}
              >
                <option value="00">00</option>
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="45">45</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={newEntry.location}
              onChange={(e) =>
                setNewEntry({ ...newEntry, location: e.target.value })
              }
            >
              <option value="">Select a location</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex flex-col md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="Add a note..."
              className="border border-gray-300 rounded-lg px-3 py-2 w-full md:w-auto focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={newEntry.note}
              onChange={(e) =>
                setNewEntry({ ...newEntry, note: e.target.value })
              }
            />
          </div>
        </div>

        <div className="mt-6 flex justify-start">
          <button
            // api comment
            // onClick={handleAddEntry}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition duration-200"
          >
            + Add Entry
          </button>
        </div>
      </div>

      {/* Timesheet Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                    Location
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                    Hours
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b">
                    Note
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700 border-b">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length > 0 ? (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 border-b text-gray-800">
                        {entry.date}
                      </td>
                      <td className="px-4 py-2 border-b text-gray-800">
                        {entry.location}
                      </td>
                      <td className="px-4 py-2 border-b text-gray-800">
                        {entry.hours}
                      </td>
                      <td className="px-4 py-2 border-b text-gray-800">
                        {entry.note}
                      </td>
                      <td className="px-4 py-2 border-b text-center space-x-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          // api comment
                          // onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center text-gray-500 py-4 italic"
                    >
                      No entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 flex justify-between">
          <p className="text-sm text-gray-500 mt-2">
            Total entries : {entries.length}
          </p>
          <div className="text-sm text-gray-500 mt-2">
            {(() => {
              const parseHours = (str) => {
                const [h, m] = str.split(":").map(Number);
                return h + m / 60;
              };
              const totalHoursDecimal = entries.reduce(
                (sum, entry) => sum + parseHours(entry.hours),
                0
              );
              const totalHours = Math.floor(totalHoursDecimal);
              const totalMinutes = Math.round(
                (totalHoursDecimal - totalHours) * 60
              );
              return `Total Hours: ${totalHours}h : ${totalMinutes}m`;
            })()}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Entry</h2>

            <div className="flex flex-col mb-3">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={editingEntry.date}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, date: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col mb-3">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="time"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={editingEntry.hours}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, hours: e.target.value })
                }
              />
            </div>

            <div className="flex flex-col mb-3">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={editingEntry.location}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, location: e.target.value })
                }
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={editingEntry.note}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, note: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                // api comment
                // onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheet;