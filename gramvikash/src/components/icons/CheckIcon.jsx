import React from 'react';
import Svg, { Path } from 'react-native-svg';

const CheckIcon = ({ size = 20, color = "#fff" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="m20 6-11 11-5-5"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export default CheckIcon;
