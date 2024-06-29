import React, { useState } from "react";
import "./hourlyForecast.css";

const HourlyForecast = ({ forecastData, wicon }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;

  if (!forecastData) return null;

  const totalPages = Math.ceil(forecastData.list.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const forecastItems = forecastData.list.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <>
      <h2 style={{ textAlign: "left", color: "#ffffff" }}>Hourly Forecast</h2>
      <div className="container">
        <div className="separate">
          {forecastItems.map((item) => (
            <div key={item.dt} className="container-item">
              <p>
                {new Date(item.dt * 1000).toLocaleTimeString("en-US", {
                  weekday: "short",
                  hour: "2-digit",
                })}
              </p>
              <img src={wicon} alt="Weather Icon" width="80px" height="80px" />
              <p>{Math.floor(item.main.temp)}°C</p>
            </div>
          ))}
        </div>
        <div className="pagination">
          {currentPage > 0 && (
            <button onClick={handlePreviousPage}>Previous</button>
          )}
          {currentPage < totalPages - 1 && (
            <button onClick={handleNextPage}>Next</button>
          )}
        </div>
      </div>
    </>
  );
};

export default HourlyForecast;
