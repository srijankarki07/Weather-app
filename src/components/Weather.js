import React, { useEffect, useState } from "react";
import "./Weather.css";
import search_icon from "./Assets/search.png";
import clear_icon from "./Assets/clear.png";
import cloud_icon from "./Assets/cloud.png";
import drizzle_icon from "./Assets/drizzle.png";
import rain_icon from "./Assets/rain.png";
import snow_icon from "./Assets/snow.png";
import wind_icon from "./Assets/wind.png";
import moon_icon from "./Assets/moon.png";
import humidity_icon from "./Assets/humidity.png";
import mist_icon from "./Assets/mist.png";
import thunder_icon from "./Assets/thunderstrom.png";
import broken_icon from "./Assets/broken.png";

const Weather = () => {
  const api_key = process.env.REACT_APP_OPENWEATHER_API_KEY;
  const [wicon, setWicon] = useState("");
  const [weatherDescription, setWeatherDescription] = useState(""); // New state for description
  const [location, setLocation] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [wind, setWind] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchWeather = async (city) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=Metric&appid=${api_key}`
      );
      const data = await response.json();
      setTemperature(Math.floor(data.main.temp) + " °C");
      setLocation(data.name);
      setHumidity(data.main.humidity + " %");
      setWind(data.wind.speed + " Km/h");
      const { icon, description } = getWeatherIcon(data.weather[0].icon); // Destructure icon and description
      setWicon(icon);
      setWeatherDescription(description); // Set the description state
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather("Kathmandu");
  }, [api_key]);

  const getWeatherIcon = (iconCode) => {
    const iconMap = {
      "01d": { icon: clear_icon, description: "Clear Sky" },
      "01n": { icon: moon_icon, description: "Clear Sky" },
      "02d": { icon: cloud_icon, description: "Few Clouds" },
      "02n": { icon: cloud_icon, description: "Few Clouds" },
      "03d": { icon: broken_icon, description: "Scattered Clouds" },
      "03n": { icon: broken_icon, description: "Scattered Clouds" },
      "04d": { icon: broken_icon, description: "Broken Clouds" },
      "04n": { icon: broken_icon, description: "Broken Clouds" },
      "09d": { icon: drizzle_icon, description: "Shower Rain" },
      "09n": { icon: drizzle_icon, description: "Shower Rain" },
      "10d": { icon: rain_icon, description: "Rain" },
      "10n": { icon: rain_icon, description: "Rain" },
      "11d": { icon: thunder_icon, description: "Thunderstorm" },
      "11n": { icon: thunder_icon, description: "Thunderstorm" },
      "13d": { icon: snow_icon, description: "Snow" },
      "13n": { icon: snow_icon, description: "Snow" },
      "50d": { icon: mist_icon, description: "Mist" },
      "50n": { icon: mist_icon, description: "Mist" },
    };
    return iconMap[iconCode] || { icon: clear_icon, description: "Clear Sky" };
  };

  return (
    <div className="container">
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="title">Real-Time Weather App with React</div>
          <div className="top-bar">
            <input type="text" className="city" placeholder="Search" />
            <div
              className="search_icon"
              onClick={() =>
                fetchWeather(document.querySelector(".city").value)
              }
            >
              <img src={search_icon} alt="Search" />
            </div>
          </div>
          <div className="weather-image">
            <img src={wicon} alt="Weather Icon" />
          </div>
          <div className="description">{weatherDescription}</div>

          <div className="weather-temp">{temperature}</div>
          <div className="weather-location">{location}</div>
          <div className="data-container">
            <div className="element">
              <img src={humidity_icon} alt="Humidity Icon" className="icon" />
              <div className="data">
                <div>{humidity}</div>
                <div className="text">Humidity</div>
              </div>
            </div>
            <div className="element">
              <img src={wind_icon} alt="Wind Icon" className="icon" />
              <div className="data">
                <div>{wind}</div>
                <div className="text">Wind Speed</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Weather;
