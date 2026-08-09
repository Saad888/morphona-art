import React, { useState } from 'react';
import { Button } from 'semantic-ui-react';
import { NavButton } from './navButton.js';
import { logout } from '../services/cognito.js';
import { publishData } from '../services/api.js';

export const Header = ({ onLogout }) => {
    const [publishing, setPublishing] = useState(false);

    const handleLogout = () => {
        logout(onLogout);
    };

    const handlePublishClick = async () => {
        setPublishing(true);
        try {
            await publishData();
            alert('Data published successfully!');
        } catch (error) {
            alert('Failed to publish data');
        }
        setPublishing(false);
    };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 20px',
                borderBottom: '1px solid #ddd',
                marginBottom: '20px',
            }}
        >
            <div style={{ display: 'flex', gap: '10px' }}>
                <NavButton color="blue" href="/">
                    Categories
                </NavButton>
                <NavButton color="blue" href="/about">
                    Edit About Me
                </NavButton>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Button color="green" onClick={handlePublishClick} disabled={publishing}>
                    Publish
                </Button>
                <Button color="red" onClick={handleLogout}>
                    Logout
                </Button>
            </div>
        </div>
    );
};
