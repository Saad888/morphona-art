import React, { useState, useEffect, useCallback } from 'react';
import { Button, Image, Loader, Input, Form, Segment } from 'semantic-ui-react';
import 'semantic-ui-css/semantic.min.css';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { NavButton } from '../../common/navButton.js';
import { getImages, updateImage, deleteImage, getCategories } from '../../services/api.js';

export const Dashboard = () => {
    const { slug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [entries, setEntries] = useState([]);
    const [categoryName, setCategoryName] = useState(location.state?.name ?? slug);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(null); // Track which entry is in edit mode
    const [editedData, setEditedData] = useState({ name: '' });
    // Bumped on every reload so thumbnail <img> srcs change and bypass any stale
    // browser-cached copy - thumbnails are overwritten in place at the same S3 key
    // when re-cropped, so the URL alone doesn't change even though the file did.
    const [thumbnailCacheBust, setThumbnailCacheBust] = useState(Date.now());

    const loadEntries = useCallback(async () => {
        setLoading(true);
        const result = await getImages(slug);
        setEntries(result.sort((a, b) => b.order - a.order)); // Sort entries by order DESC
        setThumbnailCacheBust(Date.now());
        setLoading(false);
    }, [slug]);

    useEffect(() => {
        loadEntries();

        // Deep-links/refreshes arrive without location.state - resolve the display name
        if (!location.state?.name) {
            getCategories().then((categories) => {
                const match = categories.find((c) => c.slug === slug);
                if (match) setCategoryName(match.name);
            });
        }
    }, [slug, location.state?.name, loadEntries]);

    const handleOrderChange = async (id, newOrder) => {
        setLoading(true);
        await updateImage(id, { order: newOrder });
        await loadEntries();
    };

    const handleEditClick = (entry) => {
        setEditMode(entry.id);
        setEditedData({ name: entry.name });
    };

    const handleSaveClick = async (id) => {
        setLoading(true);
        await updateImage(id, { name: editedData.name });
        setEditMode(null); // Exit edit mode
        await loadEntries();
    };

    const handleDeleteClick = async (id) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            setLoading(true);
            await deleteImage(id);
            await loadEntries();
        }
    };

    const handleCancelEdit = () => {
        setEditMode(null);
        setEditedData({ name: '' });
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
            <h2 style={{ textAlign: 'center' }}>{categoryName}</h2>
            <p style={{ textAlign: 'center' }}>Manage entries in this category.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <NavButton color="grey" href="/">
                    Back to Categories
                </NavButton>
                <NavButton color="blue" href={`/category/${slug}/create`}>
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
                                src={`${entry.thumbnailUrl}?cb=${thumbnailCacheBust}`}
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
                                    <Button
                                        color="teal"
                                        onClick={() => navigate(`/category/${slug}/edit-thumbnail/${entry.id}`, { state: { entry } })}
                                        size="tiny"
                                    >
                                        Thumbnail
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
