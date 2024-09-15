// @ts-nocheck
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSpring, animated } from '@react-spring/web';
import styles from './MasonryGrid.module.scss'; 

const MasonryGrid = () => {
  const [data, setData] = useState([]);

  // Fetch the data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('https://df8iwee0cmtv2.cloudfront.net/data.json');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching the data', error);
      }
    };
    fetchData();
  }, []);

  // Animation for each grid item
  const AnimatedGridItem = ({ item, number }) => {
    const springProps = useSpring({
      from: { opacity: 0, transform: 'scale(0.8)' },
      to: { opacity: 1, transform: 'scale(1)' },
      config: { tension: 280, friction: 20 },
      delay: 100 * number,
    });

    // Function to handle image click
    const handleClick = () => {
      console.log(`Image clicked: ${item.n}`);
    };

    return (
      <animated.div
        style={springProps}
        className={styles.gridItem}
        onClick={handleClick} // Added click event
      >
        <div className={styles.imageContainer}>
          <img
            src={`https://df8iwee0cmtv2.cloudfront.net/${item.i}-thumbnail`}
            alt={item.n}
            className={styles.image}
          />
        </div>
      </animated.div>
    );
  };

  return (
    <div className={styles.grid}>
      {data.map((item, index) => (
        <AnimatedGridItem key={item.i} item={item} number={index} />
      ))}
    </div>
  );
};

export default MasonryGrid;
