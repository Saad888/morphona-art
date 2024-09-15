// @ts-nocheck
import React from "react";
import { useSpring, animated } from "@react-spring/web";
import styles from './logo.module.scss';

export const Logo = () => {
  // Define a more complex animation with rotation, scale, and fade-in
  const logoAnimation = useSpring({
    from: {
      opacity: 0,           // Start invisible
      transform: "scale(0.9)", // Small and unrotated
    },
    to: {
      opacity: 1,           // Fade to fully visible
      transform: "scale(1.0)", // Grow larger with a full rotation
    },
    config: { mass: 10, tension: 300, friction: 200 }, // Adjusts speed and bounce
    delay: 200,             // Delay before animation starts
    reset: true,            // Ensures the animation starts from the beginning when component mounts
  });

  return (
    <div className={styles.container}>
      {/* Animated logo using react-spring */}
      <animated.img
        src={"/Logo.png"}
        className={styles.logoImage}
        alt="Logo"
        style={logoAnimation} // Apply the complex animation
      />
    </div>
  );
};
