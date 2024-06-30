import React from "react";
import "./Forecast.css";

const Forecast = ({ forecastData }) => {
  if (!forecastData) return null;

  const forecastItems = forecastData.list.filter(
    (item, index) => index % 8 === 0
  );

  return (
    <div className="forecast">
      <h2 style={{ textAlign: "left" }}>5 Days Forecast</h2>
      {forecastItems.map((item) => {
        const iconCode = item.weather[0].icon; // Assuming weather icon code is at item.weather[0].icon
        const iconUrl = `http://openweathermap.org/img/wn/${iconCode}.png`;

        return (
          <div key={item.dt} className="forecast-item">
            <p className="align">
              <img
                src={iconUrl}
                alt="Weather Icon"
                width="60px"
                height="60px"
              />
              {Math.floor(item.main.temp)}°C
            </p>
            <p>
              {new Date(item.dt * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
            <p>
              {new Date(item.dt * 1000).toLocaleDateString("en-US", {
                weekday: "short",
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default Forecast;
