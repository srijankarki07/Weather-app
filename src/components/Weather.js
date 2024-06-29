import React from "react";
import "./Weather.css";
import wind_icon from "./Assets/wind.png";
import humidity_icon from "./Assets/humidity.png";
import visibility_icon from "./Assets/visibility.png";
import sunrise_icon from "./Assets/sunrise.png";
import sunset_icon from "./Assets/sunset.png";
import feels_like_icon from "./Assets/feels_like.png";
import air_icon from "./Assets/air.png";

function getAQIColor(aqi) {
  if (aqi <= 50) {
    return "white"; // Good
  } else if (aqi <= 100) {
    return "yellow"; // Moderate
  } else if (aqi <= 150) {
    return "orange"; // Unhealthy for Sensitive Groups
  } else if (aqi <= 200) {
    return "red"; // Unhealthy
  } else if (aqi <= 300) {
    return "purple"; // Very Unhealthy
  } else {
    return "maroon"; // Hazardous
  }
}

function getAQIText(aqi) {
  if (aqi <= 50) {
    return "Good";
  } else if (aqi <= 100) {
    return "Moderate";
  } else if (aqi <= 150) {
    return "Unhealthy for Sensitive Groups";
  } else if (aqi <= 200) {
    return "Unhealthy";
  } else if (aqi <= 300) {
    return "Very Unhealthy";
  } else {
    return "Hazardous";
  }
}

const WeatherInfoItem = ({ label, icon, value }) => (
  <div className="parameters">
    <p className="title" style={{ color: "#ffffff " }}>
      {label}
    </p>
    <div className="paraRow">
      <img src={icon} alt={`${label} Icon`} width="40px" height="40px" />
      <p>{value}</p>
    </div>
  </div>
);

const Weather = ({
  loading,
  wicon,
  weatherDescription,
  temperature,
  feelsLike,
  location,
  humidity,
  pressure,
  visibility,
  wind,
  sunrise,
  sunset,
  airPollution,
}) => {
  const weatherData = [
    { label: "Feels Like", icon: feels_like_icon, value: feelsLike },
    { label: "Humidity", icon: humidity_icon, value: humidity },
    { label: "Visibility", icon: visibility_icon, value: visibility },
    { label: "Wind", icon: wind_icon, value: wind },
  ];
  return (
    <>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <h1 className="title">Today's Highlights</h1>
          <div className="additional-info">
            <div className="aqi">
              <div className="air-pollution">
                <div className="titleRow">
                  <h2 style={{ textAlign: "left" }}>Air Quality Index</h2>
                  <div className="aqiIndex">
                    {airPollution.main?.aqi && (
                      <p
                        style={{
                          color: getAQIColor(airPollution.main.aqi),
                          fontSize: "24px",
                        }}
                      >
                        {getAQIText(airPollution.main.aqi)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="aqilevel">
                  <div className="image">
                    <img
                      src={air_icon}
                      alt="air Icon"
                      width="60px"
                      height="60px"
                      srcSet={`${air_icon} 1x, ${air_icon} 2x`}
                    />
                  </div>
                  <div className="aqiValues">
                    <div
                      className="labels"
                      style={{
                        display: "flex",
                        gap: "15%",
                      }}
                    >
                      <p>AQI</p>
                      <p>NO2</p>
                      <p>O3</p>
                      <p>SO2</p>
                      <p>PM2.5</p>
                    </div>
                    <div
                      className="values"
                      style={{
                        display: "flex",
                        gap: "17%",
                        marginLeft: "7px",
                      }}
                    >
                      <p>{airPollution.main?.aqi}</p>
                      <p>{airPollution.components?.no2}</p>
                      <p>{airPollution.components?.o3}</p>
                      <p>{airPollution.components?.so2}</p>
                      <p>{airPollution.components?.pm2_5}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="sunrise-sunset">
                <h2 style={{ textAlign: "left" }}>Sunrise and Sunset</h2>
                <div className="sunrise-sunset-info">
                  <div className="info">
                    <p>Sunrise</p>
                    <div className="sunrise-sunset-icon">
                      <img
                        src={sunrise_icon}
                        alt="Sunrise Icon"
                        width="60px"
                        height="60px"
                      />
                      <p
                        style={{
                          alignContent: "center",
                          marginLeft: "20px",
                        }}
                      >
                        {sunrise}
                      </p>
                    </div>
                  </div>
                  <div className="info">
                    <p>Sunset</p>
                    <div className="sunrise-sunset-icon">
                      <img
                        src={sunset_icon}
                        alt="Sunset Icon"
                        width="60px"
                        height="60px"
                      />
                      <p
                        style={{
                          alignContent: "center",
                          marginLeft: "20px",
                        }}
                      >
                        {sunset}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="weatherInfo">
              {weatherData.map((item, index) => (
                <WeatherInfoItem
                  key={index}
                  label={item.label}
                  icon={item.icon}
                  value={item.value}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Weather;
