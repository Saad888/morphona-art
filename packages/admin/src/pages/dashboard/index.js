import React, { useState, useEffect } from 'react';
import { Button, Image, Loader, Input, Form, Segment } from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';
import { logout } from '../../services/cognito';
import { NavButton } from '../../common/navButton.js';
import { getImages, updateImage, deleteImage } from '../../services/api.js';

export const Dashboard = ({ onLogout }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(null); // Track which entry is in edit mode
    const [editedData, setEditedData] = useState({ name: '' });
    console.log(entries)

    const handleLogout = () => {
        logout(onLogout);
    };

    useEffect(() => {
        const getImageData = async () => {
            setLoading(true);
            const result = await getImages();
            setEntries(result.sort((a, b) => b.order - a.order)); // Sort entries by order DESC
            setLoading(false);
        };
        getImageData();
    }, []);

    const handleOrderChange = async (id, newOrder) => {
        setLoading(true);
        await updateImage(id, { order: newOrder });
        const result = await getImages();
        setEntries(result.sort((a, b) => b.order - a.order));
        setLoading(false);
    };

    const handleEditClick = (entry) => {
        setEditMode(entry.id);
        setEditedData({ name: entry.name });
    };

    const handleSaveClick = async (id) => {
        setLoading(true);
        await updateImage(id, { name: editedData.name });
        const result = await getImages();
        setEntries(result.sort((a, b) => b.order - a.order));
        setEditMode(null); // Exit edit mode
        setLoading(false);
    };

    const handleDeleteClick = async (id) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            setLoading(true);
            await deleteImage(id);
            const result = await getImages();
            setEntries(result.sort((a, b) => b.order - a.order));
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditMode(null);
        setEditedData({ name: ''});
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', paddingTop: '50px', position: 'relative' }}>
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
            <h2 style={{ textAlign: 'center' }}>Dashboard</h2>
            <p style={{ textAlign: 'center' }}>Welcome to your dashboard!</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <Button color="red" onClick={handleLogout}>
                    Logout
                </Button>
                <NavButton color="blue" href="/create">
                    Create
                </NavButton>
            </div>

            <div>
                {entries.map((entry, index) => (
                    <Segment
                        key={entry.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '20px',
                            marginBottom: '15px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                        }}
                    >
                        <div style={{ marginRight: '20px', fontWeight: 'bold' }}>{index + 1}</div>
                        <div style={{ marginRight: '10px' }}>
                            <Image
                                src={entry.thumbnailUrl}
                                size="small"
                                style={{ cursor: 'pointer', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                                onClick={() => window.open(entry.url, '_blank')}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            {editMode === entry.id ? (
                                <Form>
                                    <Input
                                        type="text"
                                        value={editedData.name}
                                        onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                                        style={{ marginBottom: '10px' }}
                                    />
                                </Form>
                            ) : (
                                <>
                                    <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>{entry.name}</p>
                                </>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '10px' }}>
                            <Button
                                icon="arrow up"
                                onClick={() => handleOrderChange(entry.id, entry.order + 1)}
                                disabled={loading || index === 0} // Disable if at the top
                                size="tiny"
                                style={{ marginBottom: '5px' }}
                            />
                            <Button
                                icon="arrow down"
                                onClick={() => handleOrderChange(entry.id, entry.order - 1)}
                                disabled={loading || index === entries.length - 1} // Disable if at the bottom
                                size="tiny"
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '10px', gap: '5px' }}>
                            {editMode === entry.id ? (
                                <>
                                    <Button
                                        color="green"
                                        onClick={() => handleSaveClick(entry.id)}
                                        disabled={!editedData.name || loading}
                                        size="tiny"
                                    >
                                        Save
                                    </Button>
                                    <Button color="grey" onClick={handleCancelEdit} size="tiny">
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button color="yellow" onClick={() => handleEditClick(entry)} size="tiny">
                                        Edit
                                    </Button>
                                    <Button color="red" onClick={() => handleDeleteClick(entry.id)} size="tiny">
                                        Delete
                                    </Button>
                                </>
                            )}
                        </div>
                    </Segment>
                ))}
            </div>
        </div>

    );
};
