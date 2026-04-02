import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const MicIcon = ({ size = 20, color = "#1a2e0a" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
            fill={color}
        />
        <Path
            d="M19 10v2a7 7 0 0 1-14 0v-2"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M12 19v4M8 23h8"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export default MicIcon;
