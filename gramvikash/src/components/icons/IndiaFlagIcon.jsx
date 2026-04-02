import React from 'react';
import Svg, { Rect, Path, Circle, G } from 'react-native-svg';

const IndiaFlagIcon = ({ size = 18 }) => (
    <Svg width={size} height={size * 0.75} viewBox="0 0 900 600">
        <Rect width="900" height="600" fill="#f15b25" />
        <Rect width="900" height="400" y="200" fill="#fff" />
        <Rect width="900" height="200" y="400" fill="#006400" />
        <G transform="translate(450,300)">
            <Circle r="92.5" fill="#000080" />
            <Circle r="80" fill="#fff" />
            <Circle r="16" fill="#000080" />
            {Array.from({ length: 24 }, (_, i) => (
                <Path
                    key={i}
                    d="M0,0 L0,-85"
                    stroke="#000080"
                    strokeWidth="1.5"
                    transform={`rotate(${i * 15})`}
                />
            ))}
        </G>
    </Svg>
);

export default IndiaFlagIcon;
