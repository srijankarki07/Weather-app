import React, { useRef } from "react";
import search_icon from "./Assets/search.png";

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
    <div
      style={{
        display: "flex",
        // flexDirection: "column",
        margin: "30px 0 ",
        height: "50px",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <div
        style={{
          fontSize: "25px",
          fontWeight: "bold",
          color: "#ebfffc",
        }}
      >
        Mausam app
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          color: "#727576",
          flexDirection: "row",
          padding: "10px 20px",
          borderRadius: "28px",
          background: "#FFFFFF",
          height: "30px",
          width: "25rem",
          // width: "80%",
        }}
      >
        <input
          type="text"
          ref={cityInputRef}
          style={{
            border: "1px solid #fff",
            fontSize: "15px",
            outline: "none",
            padding: "0 10px",
            width: "100%",
          }}
          placeholder="Search"
          onKeyPress={handleKeyPress}
        />
        <div onClick={handleSearchClick}>
          <img src={search_icon} alt="Search" style={{ cursor: "pointer" }} />
        </div>
      </div>
      <div
        onClick={fetchWeatherByCoords}
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: "#ebfffc",
          background: "#229954",
          borderRadius: "20px",
          padding: "10px 18px",
          cursor: "pointer",
        }}
      >
        Current location
      </div>
    </div>
  );
};

export default Header;
