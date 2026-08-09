import React, { useState, useEffect } from 'react';
import { Button, Loader, Input, Form, Segment, Message } from 'semantic-ui-react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../services/cognito';
import { getCategories, createCategory, updateCategory, deleteCategory, publishData } from '../../services/api.js';

export const CategoryListPage = ({ onLogout }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(null); // Track which category is in edit mode
    const [editedData, setEditedData] = useState({ name: '' });
    const [newCategoryName, setNewCategoryName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(onLogout);
    };

    const loadCategories = async () => {
        setLoading(true);
        const result = await getCategories();
        setCategories(result.sort((a, b) => a.order - b.order)); // Sort categories by order ASC (order 1 = first)
        setLoading(false);
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName) return;
        setLoading(true);
        setErrorMessage('');
        try {
            await createCategory(newCategoryName);
            setNewCategoryName('');
            await loadCategories();
        } catch (error) {
            setErrorMessage(error.message);
        }
        setLoading(false);
    };

    const handleOrderChange = async (id, newOrder) => {
        setLoading(true);
        await updateCategory(id, { order: newOrder });
        await loadCategories();
        setLoading(false);
    };

    const handleEditClick = (category) => {
        setEditMode(category.id);
        setEditedData({ name: category.name });
    };

    const handleSaveClick = async (id) => {
        setLoading(true);
        setErrorMessage('');
        try {
            await updateCategory(id, { name: editedData.name });
            setEditMode(null);
            await loadCategories();
        } catch (error) {
            setErrorMessage(error.message);
        }
        setLoading(false);
    };

    const handleCancelEdit = () => {
        setEditMode(null);
        setEditedData({ name: '' });
    };

    const handleDeleteClick = async (category) => {
        if (!window.confirm(`Are you sure you want to delete "${category.name}"?`)) return;
        setLoading(true);
        setErrorMessage('');
        try {
            await deleteCategory(category.id);
            await loadCategories();
        } catch (error) {
            setErrorMessage(error.message);
        }
        setLoading(false);
    };

    const handleRowClick = (category) => {
        navigate(`/category/${category.slug}`, { state: { name: category.name } });
    };

    const handlePublishClick = async () => {
        setLoading(true);
        try {
            await publishData();
            alert('Data published successfully!');
        } catch (error) {
            alert('Failed to publish data');
        }
        setLoading(false);
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
            <h2 style={{ textAlign: 'center' }}>Categories</h2>
            <p style={{ textAlign: 'center' }}>Select a category to manage its entries.</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <Button color="red" onClick={handleLogout}>
                    Logout
                </Button>
                <Button color="green" onClick={handlePublishClick}>
                    Publish
                </Button>
            </div>

            {errorMessage && (
                <Message negative>
                    <p>{errorMessage}</p>
                </Message>
            )}

            <Form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <Input
                    type="text"
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    style={{ flex: 1 }}
                />
                <Button color="green" type="submit" disabled={!newCategoryName || loading}>
                    Add Category
                </Button>
            </Form>

            <div>
                {categories.map((category, index) => (
                    <Segment
                        key={category.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '20px',
                            marginBottom: '15px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            cursor: editMode === category.id ? 'default' : 'pointer',
                        }}
                        onClick={() => editMode !== category.id && handleRowClick(category)}
                    >
                        <div style={{ flex: 1 }}>
                            {editMode === category.id ? (
                                <Form onClick={(e) => e.stopPropagation()}>
                                    <Input
                                        type="text"
                                        value={editedData.name}
                                        onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                                        style={{ marginBottom: '10px' }}
                                    />
                                </Form>
                            ) : (
                                <>
                                    <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>{category.name}</p>
                                    <p style={{ fontSize: '13px', color: '#888', margin: '0' }}>/{category.slug}</p>
                                </>
                            )}
                        </div>
                        <div
                            style={{ display: 'flex', flexDirection: 'column', marginLeft: '10px' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button
                                icon="arrow up"
                                onClick={() => handleOrderChange(category.id, category.order - 1)}
                                disabled={loading || index === 0} // Disable if at the top
                                size="tiny"
                                style={{ marginBottom: '5px' }}
                            />
                            <Button
                                icon="arrow down"
                                onClick={() => handleOrderChange(category.id, category.order + 1)}
                                disabled={loading || index === categories.length - 1} // Disable if at the bottom
                                size="tiny"
                            />
                        </div>
                        <div
                            style={{ display: 'flex', flexDirection: 'column', marginLeft: '10px', gap: '5px' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {editMode === category.id ? (
                                <>
                                    <Button
                                        color="green"
                                        onClick={() => handleSaveClick(category.id)}
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
                                    <Button color="yellow" onClick={() => handleEditClick(category)} size="tiny">
                                        Edit
                                    </Button>
                                    <Button color="red" onClick={() => handleDeleteClick(category)} size="tiny">
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
