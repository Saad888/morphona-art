import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import 'semantic-ui-css/semantic.min.css'
import { Container } from 'semantic-ui-react';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <Container>
        <div style={{ padding: '20px' }}> </div>
        <App />
    </Container>
);
