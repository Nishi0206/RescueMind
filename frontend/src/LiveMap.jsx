import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const locationCoordinates = {
  Chennai: [13.0827, 80.2707],
  Puducherry: [11.9416, 79.8083],
  Cuddalore: [11.748, 79.7714],
  Villupuram: [11.9401, 79.4861],
  Madurai: [9.9252, 78.1198],
  Coimbatore: [11.0168, 76.9558],
};

function getSeverityColor(severity) {
  if (severity === "Critical") return "#dc2626";
  if (severity === "High") return "#f97316";
  if (severity === "Medium") return "#eab308";

  return "#22c55e";
}

function LiveMap({ requests = [] }) {
  const incidents = requests
    .map((request) => {
      const coordinates =
        locationCoordinates[request.location];

      if (!coordinates) return null;

      return {
        ...request,
        coordinates,
      };
    })
    .filter(Boolean);

  return (
    <div className="live-map">

      <div className="map-header">

        <div>
          <h2>Live Incident Map</h2>

          <p>
            Real-time emergency locations
          </p>
        </div>

        <div className="map-live">
          <span></span>
          LIVE
        </div>

      </div>

      <MapContainer
        center={[12.4, 79.8]}
        zoom={7}
        scrollWheelZoom={true}
        className="map-container"
      >

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {incidents.map((incident) => (

          <CircleMarker
            key={incident.id}
            center={incident.coordinates}
            radius={
              incident.severity === "Critical"
                ? 13
                : incident.severity === "High"
                ? 10
                : 8
            }
            pathOptions={{
              color: getSeverityColor(
                incident.severity
              ),
              fillColor: getSeverityColor(
                incident.severity
              ),
              fillOpacity: 0.75,
              weight: 3,
            }}
          >

            <Popup>

              <div className="map-popup">

                <strong>
                  {incident.id}
                </strong>

                <h3>
                  {incident.emergency}
                </h3>

                <p>
                  📍 {incident.location}
                </p>

                <p>
                  👥 {incident.people} people affected
                </p>

                <span
                  className={`popup-priority ${incident.severity.toLowerCase()}`}
                >
                  {incident.severity} Priority
                </span>

                <p>
                  Status: {incident.status}
                </p>

              </div>

            </Popup>

          </CircleMarker>

        ))}

      </MapContainer>

      <div className="map-legend">

        <span>
          <i className="legend critical"></i>
          Critical
        </span>

        <span>
          <i className="legend high"></i>
          High
        </span>

        <span>
          <i className="legend medium"></i>
          Medium
        </span>

      </div>

    </div>
  );
}

export default LiveMap;