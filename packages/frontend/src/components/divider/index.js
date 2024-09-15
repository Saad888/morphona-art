// @ts-nocheck
import React from "react";
import { useSpring, animated } from "@react-spring/web";
import styles from "./divider.module.scss";

export const Divider = () => {
  const animation = useSpring({
    from: { width: "0%" },
    to: { width: "80%" },
    config: { tension: 100, friction: 70 }, // adjust for different animation feel
    delay: 200, // delay before animation starts
  });

  return (
    <animated.div style={animation} className={styles.divider}></animated.div>
  );
};
