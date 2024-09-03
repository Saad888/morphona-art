import React from 'react';
import { Button } from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';

export const NavButton = ({ color, href, children }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(href);
  }

  return (
    <Button color={color} onClick={handleClick} >{children}</Button>
  );
};

