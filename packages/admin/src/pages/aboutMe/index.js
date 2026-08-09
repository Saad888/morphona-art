import React, { useEffect, useState } from 'react';
import { Button, Loader, Message } from 'semantic-ui-react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { getAbout, updateAbout } from '../../services/api.js';

export const EditAboutMePage = () => {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        getAbout()
            .then(setContent)
            .catch(() => setErrorMessage('Failed to load About Me content.'))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            await updateAbout(content ?? '');
            alert('About Me content saved!');
        } catch (error) {
            setErrorMessage('Failed to save About Me content.');
        }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: '20px', position: 'relative' }}>
            {loading && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        zIndex: 1000,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Loader active size="large">Loading...</Loader>
                </div>
            )}
            <h2 style={{ textAlign: 'center' }}>Edit About Me</h2>
            <p style={{ textAlign: 'center' }}>Write the About Me content in Markdown. Save, then Publish (in the header) to make it live.</p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <Button color="green" onClick={handleSave} disabled={loading}>
                    Save
                </Button>
            </div>

            {errorMessage && (
                <Message negative>
                    <p>{errorMessage}</p>
                </Message>
            )}

            <div data-color-mode="light">
                <MDEditor value={content} onChange={setContent} height={500} />
            </div>
        </div>
    );
};
