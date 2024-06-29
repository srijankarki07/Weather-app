import React, { useState } from "react";
import "./hourlyForecast.css";

const HourlyForecast = ({ forecastData, wicon }) => {
  const [selectedDay, setSelectedDay] = useState(
    new Date().toISOString().split("T")[0]
  );

  if (!forecastData) return null;

  const selectedDate = new Date(selectedDay);
  selectedDate.setHours(0, 0, 0, 0);

  const forecastItems = forecastData.list.filter((item) => {
    const itemDate = new Date(item.dt * 1000);
    return itemDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <>
      <h2 style={{ textAlign: "left", color: "#ffffff" }}>Today at</h2>
      <div className="container">
        <div className="separate">
          {forecastItems.map((item) => (
            <div key={item.dt} className="container-item">
              <p>
                {new Date(item.dt * 1000).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                })}
              </p>
              <img src={wicon} alt="Weather Icon" width="80px" height="80px" />
              <p>{Math.floor(item.main.temp)}°C</p>
            </div>
          ))}
        </div>
        {/* <div className="day-selector">
          <label htmlFor="day">Select a day: </label>
          <input
            type="date"
            id="day"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          />
        </div> */}
      </div>
    </>
  );
};

export default HourlyForecast;
