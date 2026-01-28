import { useTheme } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

interface SpinningLogoProps {
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

export const SpinningLogo = ({ width = 40, height = 40, className, color }: SpinningLogoProps) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();
  const logoColor = color || colors.primary;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <AnimatedSvg
      width={width}
      height={height}
      viewBox="0 0 1000 1000"
      className={className}
      color={logoColor}
      style={{ transform: [{ rotate: spin }] }}>
      <Path
        d="M146.44,146.44c-195.25,195.25-195.25,511.87,0,707.12,195.25,195.25,511.87,195.25,707.12,0,195.25-195.25,195.25-511.87,0-707.12-195.25-195.25-511.87-195.25-707.12,0ZM234.83,234.83c115.06-115.06,286.36-138.13,425.73-72.17l-497.9,497.9c-65.96-139.37-42.89-310.67,72.17-425.73ZM234.83,765.17c120.76-120.76,334.93-102.2,481.31,40.06-146.4,103.57-350.36,90.89-481.31-40.06ZM578.67,578.67c-34.17,34.17-89.57,34.17-123.75,0s-34.17-89.57,0-123.75c34.17-34.17,89.57-34.17,123.75,0,34.17,34.17,34.17,89.57,0,123.75ZM805.23,716.14c-142.26-146.37-160.83-360.54-40.06-481.31,130.95,130.95,143.63,334.91,40.06,481.31Z"
        fill={logoColor}
      />
    </AnimatedSvg>
  );
};
