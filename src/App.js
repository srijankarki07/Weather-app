import React, { useEffect, useState } from "react";
import "./App.css";
import Header from "./components/Header";
import Weather from "./components/Weather";
import Forecast from "./components/Forecast";
import HourlyForecast from "./components/HourlyForecast";
import clear_icon from "./components/Assets/clear.png";
import cloud_icon from "./components/Assets/cloud.png";
import drizzle_icon from "./components/Assets/drizzle.png";
import rain_icon from "./components/Assets/rain.png";
import snow_icon from "./components/Assets/snow.png";
import moon_icon from "./components/Assets/moon.png";
import mist_icon from "./components/Assets/mist.png";
import thunder_icon from "./components/Assets/thunderstrom.png";
import broken_icon from "./components/Assets/broken.png";
import Now from "./components/Now";

function App() {
  const api_key = process.env.REACT_APP_OPENWEATHER_API_KEY;
  const [wicon, setWicon] = useState("");
  const [weatherDescription, setWeatherDescription] = useState("");
  const [location, setLocation] = useState("");
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [feelsLike, setFeelsLike] = useState("");
  const [humidity, setHumidity] = useState("");
  const [pressure, setPressure] = useState("");
  const [visibility, setVisibility] = useState("");
  const [wind, setWind] = useState("");
  const [sunrise, setSunrise] = useState("");
  const [sunset, setSunset] = useState("");
  const [forecastData, setForecastData] = useState(null);
  const [airPollution, setAirPollution] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWeatherData = async (latitude, longitude) => {
    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${api_key}`
      );
      if (!weatherResponse.ok) {
        throw new Error(`Error: ${weatherResponse.statusText}`);
      }
      const weatherData = await weatherResponse.json();
      setTemperature(Math.floor(weatherData.main.temp) + " °C");
      setFeelsLike(Math.floor(weatherData.main.feels_like) + " °C");
      setLocation(weatherData.name + ", " + weatherData.sys.country);
      setTime(new Date(weatherData.dt * 1000).toLocaleTimeString());
      setTime(
        new Date(weatherData.dt * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );

      setDate(
        new Date(weatherData.dt * 1000).toLocaleDateString([], {
          month: "short",
          day: "numeric",
          weekday: "short",
        })
      );

      setHumidity(weatherData.main.humidity + " %");
      setPressure(weatherData.main.pressure + " hPa");
      setVisibility(weatherData.visibility / 1000 + " km");
      setWind(weatherData.wind.speed + " Km/h");
      setSunrise(new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString());
      setSunset(new Date(weatherData.sys.sunset * 1000).toLocaleTimeString());
      const { icon, description } = getWeatherIcon(weatherData.weather[0].icon);
      setWicon(icon);
      setWeatherDescription(description);

      // Fetch forecast data
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${api_key}`
      );
      if (!forecastResponse.ok) {
        throw new Error(`Error: ${forecastResponse.statusText}`);
      }
      const forecastData = await forecastResponse.json();
      setForecastData(forecastData);

      // Fetch air pollution data
      const airPollutionResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${api_key}`
      );
      if (!airPollutionResponse.ok) {
        throw new Error(`Error: ${airPollutionResponse.statusText}`);
      }
      const airPollutionData = await airPollutionResponse.json();
      setAirPollution(airPollutionData.list[0]);
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCoords = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLoading(true);
        setError(null);
        await fetchWeatherData(latitude, longitude);
      },
      (error) => {
        setError(error.message);
      }
    );
  };

  const fetchWeatherByName = async (city) => {
    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${api_key}`
      );
      if (!weatherResponse.ok) {
        throw new Error(`Error: ${weatherResponse.statusText}`);
      }
      const weatherData = await weatherResponse.json();
      setTemperature(Math.floor(weatherData.main.temp) + " °C");
      setFeelsLike(Math.floor(weatherData.main.feels_like) + " °C");
      setLocation(weatherData.name);
      setTime(
        new Date(weatherData.dt * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setDate(
        new Date(weatherData.dt * 1000).toLocaleDateString([], {
          month: "short",
          day: "numeric",
          weekday: "short",
        })
      );
      setHumidity(weatherData.main.humidity + " %");
      setPressure(weatherData.main.pressure + " hPa");
      setVisibility(weatherData.visibility / 1000 + " km");
      setWind(weatherData.wind.speed + " Km/h");
      setSunrise(new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString());
      setSunset(new Date(weatherData.sys.sunset * 1000).toLocaleTimeString());
      const { icon, description } = getWeatherIcon(weatherData.weather[0].icon);
      setWicon(icon);
      setWeatherDescription(description);
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
      setError(error.message);
    }
  };

  useEffect(() => {
    fetchWeatherByCoords();
  }, []);

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
    <div className="App" style={{ padding: "20px" }}>
      <Header
        fetchWeatherByCoords={fetchWeatherByCoords}
        fetchWeatherByName={fetchWeatherByName}
      />
      {error && <div className="error">{error}</div>}
      <div style={{ display: "flex", gap: "6rem" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4rem",
          }}
        >
          <Now
            weatherDescription={weatherDescription}
            temperature={temperature}
            wicon={wicon}
            location={location}
            date={date}
            time={time}
          />
          <Forecast forecastData={forecastData} wicon={wicon} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <Weather
            loading={loading}
            wicon={wicon}
            weatherDescription={weatherDescription}
            temperature={temperature}
            feelsLike={feelsLike}
            location={location}
            date={date}
            humidity={humidity}
            pressure={pressure}
            visibility={visibility}
            wind={wind}
            sunrise={sunrise}
            sunset={sunset}
            forecast={forecastData}
            airPollution={airPollution}
          />
          <HourlyForecast
            forecastData={forecastData}
            style={{ width: "100%" }}
            wicon={wicon}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
