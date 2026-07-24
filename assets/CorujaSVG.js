// src/components/CorujaSVG.js
import React from "react";
import Svg, { Path, Circle, Ellipse } from "react-native-svg";

export const CorujaSVG = ({ size = 140 }) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
    >
      {/* --- SOMBRA / BASE --- */}
      <Ellipse cx="70" cy="125" rx="32" ry="10" fill="rgba(0,0,0,0.25)" />

      {/* --- CORPO --- */}
      <Path
        d="M35 70c0-25 15-45 35-45s35 20 35 45-15 55-35 55S35 95 35 70z"
        fill="#3E3A5E"
      />

      {/* PEITO CLARO */}
      <Path
        d="M52 70c0-18 10-32 18-32s18 14 18 32-10 38-18 38-18-20-18-38z"
        fill="#F2E9D8"
      />

      {/* --- ROSTO --- */}
      <Path
        d="M40 50c0-12 13-22 30-22s30 10 30 22-13 22-30 22S40 62 40 50z"
        fill="#4A456D"
      />

      {/* --- OLHOS --- */}
      <Circle cx="55" cy="52" r="11" fill="#FFF" />
      <Circle cx="85" cy="52" r="11" fill="#FFF" />

      {/* Pupilas */}
      <Circle cx="55" cy="52" r="6" fill="#222" />
      <Circle cx="85" cy="52" r="6" fill="#222" />

      {/* Reflexo */}
      <Circle cx="52" cy="49" r="2" fill="#FFF" />
      <Circle cx="82" cy="49" r="2" fill="#FFF" />

      {/* Sobrancelhas */}
      <Path
        d="M40 45c5-10 18-15 28-15s23 5 28 15"
        stroke="#2C293F"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Bico */}
      <Path
        d="M67 58c0 3 2 5 3 5s3-2 3-5-2-5-3-5-3 2-3 5z"
        fill="#E5A64A"
      />

      {/* Asas */}
      <Path d="M30 78c8 18 10 24 18 22s3-15-5-35" fill="#3E3A5E" />
      <Path d="M110 78c-8 18-10 24-18 22s-3-15 5-35" fill="#3E3A5E" />

      {/* Detalhes do peito */}
      <Path d="M62 82c2 4 4 4 6 0" stroke="#D6C8B3" strokeWidth="2" strokeLinecap="round" />
      <Path d="M58 92c3 4 6 4 9 0" stroke="#D6C8B3" strokeWidth="2" strokeLinecap="round" />
      <Path d="M66 102c2 3 4 3 6 0" stroke="#D6C8B3" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
};
