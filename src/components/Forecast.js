import React from "react";
import "./Forecast.css";

const Forecast = ({ forecastData, wicon }) => {
  if (!forecastData) return null;

  const forecastItems = forecastData.list.filter(
    (item, index) => index % 8 === 0
  );

  console.log(forecastItems, "forecast");

  return (
    <div className="forecast">
      <h2 style={{ textAlign: "left" }}>5 Days Forecast</h2>
      {forecastItems.map((item) => (
        <div key={item.dt} className="forecast-item">
          <p>
            {Math.floor(item.main.temp)}°C
            <img src={wicon} alt="Weather Icon" width="40px" height="40px" />
          </p>
          <p>
            {new Date(item.dt * 1000).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>

          <p>
            {new Date(item.dt * 1000).toLocaleDateString("en-US", {
              weekday: "long",
            })}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Forecast;
