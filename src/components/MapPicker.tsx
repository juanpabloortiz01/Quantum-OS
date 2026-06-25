"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in leaflet under Next.js/Webpack
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

function LocationMarker({ lat, lng, onChange }: MapPickerProps) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return lat !== 0 && lng !== 0 ? (
    <Marker position={[lat, lng]} />
  ) : null;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  // Center defaults to Ecuador if not set
  const center: [number, number] = lat === 0 && lng === 0 ? [-1.8312, -78.1834] : [lat, lng];
  const zoom = lat === 0 && lng === 0 ? 6 : 15;

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden border border-[#E2E8F0] shadow-inner relative z-0">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker lat={lat} lng={lng} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
