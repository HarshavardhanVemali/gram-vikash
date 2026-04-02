import React from 'react';
import Svg, { Path } from 'react-native-svg';

const PaddyIcon = ({ size = 20, color = "#7ab648" }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M2 20c3-1 4-5 4-8s-1-6-1-10c0 0 3 2 4 6s-1 10-1 12h-6zM8 20c3-1 4-5 4-8s-1-6-1-10c0 0 3 2 4 6s-1 10-1 12h-6zM14 20c3-1 4-5 4-8s-1-6-1-10c0 0 3 2 4 6s-1 10-1 12h-6z"
            fill={color}
        />
        <Path
            d="M12 22v-2M18 22v-2M6 22v-2"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
        />
    </Svg>
);

export default PaddyIcon;
