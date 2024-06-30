import React, { useEffect, useState } from "react";
import "./App.css";
import Header from "./components/Header";
import Weather from "./components/Weather";
import Forecast from "./components/Forecast";
import HourlyForecast from "./components/HourlyForecast";
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
        `https://api.openweathermap.org/data/2.5/forecast?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&units=metric&appid=${api_key}`
      );
      if (!forecastResponse.ok) {
        throw new Error(`Error: ${forecastResponse.statusText}`);
      }
      const forecastData = await forecastResponse.json();
      setForecastData(forecastData);

      // Fetch air pollution data
      const airPollutionResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&appid=${api_key}`
      );
      if (!airPollutionResponse.ok) {
        throw new Error(`Error: ${airPollutionResponse.statusText}`);
      }
      const airPollutionData = await airPollutionResponse.json();
      setAirPollution(airPollutionData.list[0]);
    } catch (error) {
      console.error("Failed to fetch weather data:", error);
      setError(error.message);
    }
  };

  useEffect(() => {
    fetchWeatherByCoords();
  }, []);

  const getWeatherIcon = (iconCode) => {
    const iconUrl = `http://openweathermap.org/img/wn/${iconCode}.png`;

    const weatherDescriptions = {
      "01d": "Clear sky",
      "01n": "Clear sky",
      "02d": "Few clouds",
      "02n": "Few clouds",
      "03d": "Scattered clouds",
      "03n": "Scattered clouds",
      "04d": "Broken clouds",
      "04n": "Broken clouds",
      "09d": "Shower rain",
      "09n": "Shower rain",
      "10d": "Rain",
      "10n": "Rain",
      "11d": "Thunderstorm",
      "11n": "Thunderstorm",
      "13d": "Snow",
      "13n": "Snow",
      "50d": "Mist",
      "50n": "Mist",
    };

    let description = weatherDescriptions[iconCode] || "Weather conditions";

    description = description.replace(/\b\w/g, (char) => char.toUpperCase());

    return { icon: iconUrl, description };
  };

  return (
    <div className="App">
      <Header
        fetchWeatherByCoords={fetchWeatherByCoords}
        fetchWeatherByName={fetchWeatherByName}
      />
      {error && <div className="error">{error}</div>}
      <div className="App-container">
        <div className="column" style={{ gap: "4rem" }}>
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
        <div className="column">
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
