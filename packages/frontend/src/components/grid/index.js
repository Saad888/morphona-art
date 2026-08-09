// @ts-nocheck
import React, { useState, useCallback, useMemo } from 'react';
import { useSpring, animated } from '@react-spring/web';
import styles from './MasonryGrid.module.scss';

const CLOUDFRONT_URL = 'https://df8iwee0cmtv2.cloudfront.net';

// Memoized grid item to prevent unnecessary re-renders
const AnimatedGridItem = React.memo(({ item, number, openModal }) => {
  const springProps = useSpring({
    from: { opacity: 0, transform: 'scale(0.8)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: { tension: 280, friction: 20 },
    delay: 100 * number,
  });

  const fullImageUrl = `${CLOUDFRONT_URL}/${item.i}`;

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
});

const MasonryGrid = ({ entries, activeSlug }) => {
  const [modalImage, setModalImage] = useState(null); // Track the current image for the modal
  const [isModalOpen, setIsModalOpen] = useState(false); // Track if the modal is open

  const data = useMemo(
    () => entries.filter((item) => item.c === activeSlug).sort((a, b) => b.o - a.o),
    [entries, activeSlug]
  );

  // Function to handle image click - memoized to avoid unnecessary re-renders
  const openModal = useCallback((image) => {
    setModalImage(image);
    setIsModalOpen(true);
  }, []);

  // Function to close the modal
  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {setModalImage(null)}, 700);
  };

  return (
    <div className={styles.gridWrapper}>
      <div className={styles.grid}>
        {data.map((item, index) => (
          <AnimatedGridItem key={item.i} item={item} number={index} openModal={openModal} />
        ))}
      </div>

      {/* Modal */}
      <div className={`${styles.modal} ${isModalOpen ? styles.showModal : styles.hideModal}`}>
        <div className={styles.modalContent}>
          <button className={styles.closeButton} onClick={closeModal}>
            &times;
          </button>
          <img src={modalImage} alt="Full size" className={styles.fullImage} />
        </div>
      </div>
    </div>
  );
};

export default MasonryGrid;
