import React, { useEffect } from 'react';
import { Button } from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';
import { logout } from '../../services/cognito';
import { NavButton } from '../../common/navButton.js';
import { getImages } from '../../services/api.js';

export const Dashboard = ({ onLogout }) => {
    const handleLogout = () => {
      logout(onLogout)
    };

    useEffect(() => {
        const getImageData = async() => {
            const result = await getImages()
            console.log(result)
        }
        getImageData()
    }, [])

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: '100px' }}>
            <h2>Dashboard</h2>
            <p>Welcome to your dashboard!</p>
            <Button color="red" onClick={handleLogout}>
                Logout
            </Button>
            <NavButton color="blue" href="/create" >Create</NavButton>
        </div>
    );
};

