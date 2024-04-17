import "./Weather.css";
import search_icon from "./Assets/search.png";
import clear_icon from "./Assets/clear.png";
import clould_icon from "./Assets/cloud.png";
import drizzle_icon from "./Assets/drizzle.png";
import rain_icon from "./Assets/rain.png";
import snow_icon from "./Assets/snow.png";
import wind_icon from "./Assets/wind.png";
import humidity_icon from "./Assets/humidity.png";
import { useEffect, useState } from "react";

const Weather = () => {
  let api_key = "d184d4140463a0262b79ee3343105d4a";

  const [wicon, setWicon] = useState(clould_icon);
  const [location, setLocation] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [wind, setWind] = useState("");

  useEffect(() => {
    const fetchDefaultWeather = async () => {
      let url = `https://api.openweathermap.org/data/2.5/weather?q=Kathmandu&units=Metric&appid=${api_key}`;
      let response = await fetch(url);
      let data = await response.json();
      setTemperature(Math.floor(data.main.temp) + " C");
      setLocation(data.name);
      setHumidity(data.main.humidity + " %");
      setWind(data.wind.speed + " Km/h");
    };

    fetchDefaultWeather();
  });

  const search = async () => {
    const element = document.getElementsByClassName("city");
    if (element[0].value === "") {
      return 0;
    }
    let url = ` https://api.openweathermap.org/data/2.5/weather?q=${element[0].value}&units=Metric&appid=${api_key} `;

    let response = await fetch(url);
    let data = await response.json();
    const humidity = document.getElementsByClassName("humidity-percent");
    const wind = document.getElementsByClassName("wind-speed");
    const temperature = document.getElementsByClassName("weather-temp");
    const location = document.getElementsByClassName("weather-location");

    humidity[0].innerHTML = data.main.humidity + " %";
    wind[0].innerHTML = data.wind.speed + " Km/h";
    temperature[0].innerHTML = Math.floor(data.main.temp) + " C";
    location[0].innerHTML = data.name;

    if (data.weather[0].icon === "01d" || data.weather[0].icon === "01n") {
      setWicon(clear_icon);
    } else if (
      data.weather[0].icon === "02d" ||
      data.weather[0].icon === "02n"
    ) {
      setWicon(clould_icon);
    } else if (
      data.weather[0].icon === "03d" ||
      data.weather[0].icon === "03n"
    ) {
      setWicon(drizzle_icon);
    } else if (
      data.weather[0].icon === "04d" ||
      data.weather[0].icon === "04n"
    ) {
      setWicon(drizzle_icon);
    } else if (
      data.weather[0].icon === "09d" ||
      data.weather[0].icon === "09n"
    ) {
      setWicon(rain_icon);
    } else if (
      data.weather[0].icon === "10d" ||
      data.weather[0].icon === "10n"
    ) {
      setWicon(rain_icon);
    } else if (
      data.weather[0].icon === "13d" ||
      data.weather[0].icon === "13n"
    ) {
      setWicon(snow_icon);
    } else {
      setWicon(clear_icon);
    }
  };
  return (
    <div className="container">
      <div className="top-bar">
        <input type="text" className="city" placeholder="Search" />
        <div
          className="search_icon"
          onClick={() => {
            search();
          }}
        >
          <img src={search_icon} alt="" />
        </div>
      </div>

      <div className="weather-image">
        <img src={wicon} alt="" />
      </div>
      <div className="weather-temp">{temperature}</div>
      <div className="weather-location">{location}</div>
      <div className="data-container">
        <div className="element">
          <img src={humidity_icon} alt="" className="icon" />
          <div className="data">
            <div className="humidity-percent">{humidity}</div>
            <div className="text">Humidity</div>
          </div>
        </div>

        <div className="element">
          <img src={wind_icon} alt="" className="icon" />
          <div className="data">
            <div className="wind-speed">{wind}</div>
            <div className="text">Wind Speed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Weather;
