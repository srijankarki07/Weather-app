// src/components/Highlights.js

import React, { useEffect, useState } from "react";
import axios from "axios";

const Highlights = ({ weatherData }) => {
  const [airQuality, setAirQuality] = useState(null);

  useEffect(() => {
    if (weatherData) {
      const { lat, lon } = weatherData.coord;
      getAirQuality(lat, lon);
    }
  }, [weatherData]);

  const getAirQuality = async (lat, lon) => {
    const apiKey = "d184d4140463a0262b79ee3343105d4a";
    const airQualityUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const response = await axios.get(airQualityUrl);
    setAirQuality(response.data.list[0].components);
  };

  if (!weatherData) return null;

  const { main, sys, visibility } = weatherData;
  const sunrise = new Date(sys.sunrise * 1000).toLocaleTimeString();
  const sunset = new Date(sys.sunset * 1000).toLocaleTimeString();

  return (
    <div className="highlights">
      <h2>Today's Highlights</h2>
      <div id="humidity">Humidity: {main.humidity}%</div>
      <div id="pressure">Pressure: {main.pressure} hPa</div>
      <div id="visibility">Visibility: {visibility / 1000} km</div>
      <div id="feels-like">Feels Like: {main.feels_like}°C</div>
      <div id="sunrise-sunset">
        Sunrise: {sunrise}, Sunset: {sunset}
      </div>
      {airQuality && (
        <div id="air-quality">
          <p>PM2.5: {airQuality.pm2_5}</p>
          <p>SO2: {airQuality.so2}</p>
          <p>NO2: {airQuality.no2}</p>
          <p>O3: {airQuality.o3}</p>
        </div>
      )}
    </div>
  );
};

export default Highlights;
