import React from 'react';
import { Button } from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';
import { logout } from '../../services/cognito';

export const Dashboard = ({ onLogout }) => {
    const handleLogout = () => {
      logout(onLogout)
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: '100px' }}>
            <h2>Dashboard</h2>
            <p>Welcome to your dashboard!</p>
            <Button color="red" onClick={handleLogout}>
                Logout
            </Button>
        </div>
    );
};

