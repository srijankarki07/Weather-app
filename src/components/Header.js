import React, { useRef } from "react";
import search_icon from "./Assets/search.png";
import "./Header.css";

const Header = ({ fetchWeatherByCoords, fetchWeatherByName }) => {
  const cityInputRef = useRef(null);

  const handleSearchClick = () => {
    const city = cityInputRef.current.value;
    if (city.trim()) {
      fetchWeatherByName(city);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleSearchClick();
    }
  };

  return (
    <div className="header">
      <div
        style={{
          fontSize: "25px",
          fontWeight: "bold",
          color: "#d3d7dd",
        }}
      >
        Mausam app
      </div>
      <div className="search">
        <input
          type="text"
          ref={cityInputRef}
          className="input"
          placeholder="Search"
          onKeyPress={handleKeyPress}
        />
        <div onClick={handleSearchClick}>
          <img src={search_icon} alt="Search" style={{ cursor: "pointer" }} />
        </div>
      </div>
      <div onClick={fetchWeatherByCoords} className="cur-location">
        Current location
      </div>
    </div>
  );
};

export default Header;
