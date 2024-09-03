import React, { useState } from 'react';
import { Button, Form, Message } from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';
import { login } from '../../services/cognito';

export const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = () => {
        setLoading(true);
        const onSuccess = (result) => {
            console.log('Login success:', result);
            setLoading(false);
            setError('');
            onLogin(); // Call the onLogin prop to handle successful login
        }
        const onFailure = (err) => {
                console.error('Login failed:', err);
                setLoading(false);
                setError(err.message || 'An error occurred during login');
        }
        login(username, password, onSuccess, onFailure)
    };

    return (
        <div style={{ maxWidth: 400, margin: '0 auto', paddingTop: '100px' }}>
            <h2>Login</h2>
            <Form error={!!error} loading={loading} onSubmit={handleLogin}>
                <Form.Input
                    fluid
                    icon="user"
                    iconPosition="left"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <Form.Input
                    fluid
                    icon="lock"
                    iconPosition="left"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button color="blue" fluid size="large" type="submit">
                    Login
                </Button>
                {error && (
                    <Message
                        error
                        header="Login Failed"
                        content={error}
                    />
                )}
            </Form>
        </div>
    );
};

