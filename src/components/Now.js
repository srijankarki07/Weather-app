import "./Weather.css";
import dateIcon from "./Assets/date.png";
import locationIcon from "./Assets/location.png";
import timeIcon from "./Assets/time.png";

const Now = ({
  weatherDescription,
  temperature,
  location,
  time,
  date,
  wicon,
}) => {
  return (
    <>
      <div className="weather-description" style={{ width: "300px" }}>
        <h1 style={{ textAlign: "left", fontWeight: "lighter" }}>Now</h1>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div className="temperature">{temperature}</div>

          <img src={wicon} alt="Weather Icon" width="80px" height="80px" />
        </div>

        <div className="description">{weatherDescription}</div>
        <hr style={{ width: "100%" }} />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <img
            src={locationIcon}
            alt="Location Icon"
            width="20px"
            height="20px"
          />
          <div className="location">{location}</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <img src={dateIcon} alt="Date Icon" width="20px" height="20px" />
          <div className="location">{date}</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <img src={timeIcon} alt="Time Icon" width="20px" height="20px" />
          <div className="location">{time}</div>
        </div>
      </div>
    </>
  );
};

export default Now;
