// @ts-nocheck
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSpring, animated } from '@react-spring/web';
import styles from './MasonryGrid.module.scss';

const MasonryGrid = () => {
  const [data, setData] = useState([]);
  const [modalImage, setModalImage] = useState(null); // Track the current image for the modal
  const [isModalOpen, setIsModalOpen] = useState(false); // Track if the modal is open

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

  // Function to handle image click
  const openModal = (image) => {
    setModalImage(image);
    setIsModalOpen(true);
  };

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setModalImage(null);
  };

  // Animation for each grid item
  const AnimatedGridItem = ({ item, number }) => {
    const springProps = useSpring({
      from: { opacity: 0, transform: 'scale(0.8)' },
      to: { opacity: 1, transform: 'scale(1)' },
      config: { tension: 280, friction: 20 },
      delay: 100 * number,
    });

    const fullImageUrl = `https://df8iwee0cmtv2.cloudfront.net/${item.i}`;

    return (
      <animated.div
        style={springProps}
        className={styles.gridItem}
        onClick={() => openModal(fullImageUrl)} // Open modal with the full image
      >
        <div className={styles.imageContainer}>
          <img
            src={`${fullImageUrl}-thumbnail`}
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

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <button className={styles.closeButton} onClick={closeModal}>
              &times;
            </button>
            <img src={modalImage} alt="Full size" className={styles.fullImage} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MasonryGrid;
