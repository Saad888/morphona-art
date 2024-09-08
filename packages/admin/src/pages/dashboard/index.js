import React, { useState, useEffect } from 'react';
import { Button, Image, Loader, Input, Form } from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';
import { logout } from '../../services/cognito';
import { NavButton } from '../../common/navButton.js';
import { getImages, updateImage, deleteImage } from '../../services/api.js';

export const Dashboard = ({ onLogout }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(null); // Track which entry is in edit mode
    const [editedData, setEditedData] = useState({ name: '', dateCreated: '' });

    const handleLogout = () => {
      logout(onLogout);
    };

    useEffect(() => {
        const getImageData = async () => {
            setLoading(true);
            const result = await getImages();
            console.log(result)
            setEntries(result.entries.sort((a, b) => b.order - a.order)); // Sort entries by order DESC
            setLoading(false);
        };
        getImageData();
    }, []);

    const handleOrderChange = async (id, newOrder) => {
        setLoading(true);
        await updateImage(id, { order: newOrder });
        const result = await getImages();
        setEntries(result.entries.sort((a, b) => b.order - a.order));
        setLoading(false);
    };

    const handleEditClick = (entry) => {
        setEditMode(entry.id);
        setEditedData({ name: entry.name, dateCreated: entry.dateCreated });
    };

    const handleSaveClick = async (id) => {
        setLoading(true);
        await updateImage(id, { name: editedData.name, dateCreated: editedData.dateCreated });
        const result = await getImages();
        setEntries(result.entries.sort((a, b) => b.order - a.order));
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
        setEditedData({ name: '', dateCreated: '' });
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: '100px' }}>
            <h2>Dashboard</h2>
            <p>Welcome to your dashboard!</p>
            <Button color="red" onClick={handleLogout}>
                Logout
            </Button>
            <NavButton color="blue" href="/create">
                Create
            </NavButton>
            {loading && <Loader active>Loading...</Loader>}

            <div>
                {entries.map((entry) => (
                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ marginRight: '10px' }}>
                            <Image
                                src={entry.url}
                                size="small"
                                style={{ cursor: 'pointer' }}
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
                                    />
                                    <Input
                                        type="date"
                                        value={editedData.dateCreated}
                                        onChange={(e) => setEditedData({ ...editedData, dateCreated: e.target.value })}
                                        style={{ marginLeft: '10px' }}
                                    />
                                </Form>
                            ) : (
                                <>
                                    <p>{entry.name}</p>
                                    <p>{new Date(entry.dateCreated).toLocaleDateString()}</p>
                                </>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '10px' }}>
                            <Button
                                icon="arrow up"
                                onClick={() => handleOrderChange(entry.id, entry.order + 1)}
                                disabled={loading}
                            />
                            <Button
                                icon="arrow down"
                                onClick={() => handleOrderChange(entry.id, entry.order - 1)}
                                disabled={loading}
                            />
                        </div>
                        <div style={{ marginLeft: '10px' }}>
                            {editMode === entry.id ? (
                                <>
                                    <Button
                                        color="green"
                                        onClick={() => handleSaveClick(entry.id)}
                                        disabled={!editedData.name || !editedData.dateCreated || loading}
                                    >
                                        Save
                                    </Button>
                                    <Button color="grey" onClick={handleCancelEdit}>
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button color="yellow" onClick={() => handleEditClick(entry)}>
                                        Edit
                                    </Button>
                                    <Button color="red" onClick={() => handleDeleteClick(entry.id)}>
                                        Delete
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
