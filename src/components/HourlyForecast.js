import React, { useState } from "react";
import "./hourlyForecast.css";

const HourlyForecast = ({ forecastData, wicon }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const containerRef = React.useRef(null);
  let startX = 0;
  let endX = 0;

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

  const handleSwipeStart = (event) => {
    startX = event.touches[0].clientX;
  };

  const handleSwipeEnd = (event) => {
    endX = event.changedTouches[0].clientX;
    if (startX - endX > 50) {
      handleNextPage();
    } else if (endX - startX > 50) {
      handlePreviousPage();
    }
  };

  const forecastItems = forecastData.list.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return (
    <>
      <h2 style={{ textAlign: "left", color: "#ffffff" }}>Hourly Forecast</h2>
      <div
        className="container"
        ref={containerRef}
        onTouchStart={handleSwipeStart}
        onTouchEnd={handleSwipeEnd}
      >
        <div className="separate">
          {forecastItems.map((item) => {
            const iconCode = item.weather[0].icon;
            const iconUrl = `http://openweathermap.org/img/wn/${iconCode}.png`;

            return (
              <div key={item.dt} className="container-item">
                <p>
                  {new Date(item.dt * 1000).toLocaleTimeString("en-US", {
                    weekday: "short",
                    hour: "2-digit",
                  })}
                </p>
                <img
                  src={iconUrl}
                  alt="Weather Icon"
                  width="70px"
                  height="70px"
                />
                <p>{Math.floor(item.main.temp)}°C</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="pagination">
        {currentPage > 0 && (
          <button onClick={handlePreviousPage}>Previous</button>
        )}
        {currentPage < totalPages - 1 && (
          <button onClick={handleNextPage}>Next</button>
        )}
      </div>
    </>
  );
};

export default HourlyForecast;
