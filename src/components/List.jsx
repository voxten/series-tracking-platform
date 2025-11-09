import { SectionWrapper } from "../wrapper";
import React, { useState, useEffect } from "react";
import { firestore } from "../firebase";
import { addDoc, collection, doc, getDocs, deleteDoc, updateDoc, query, where } from "@firebase/firestore";
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

// Status badge component for better visual representation
const StatusBadge = ({ status, onChange }) => {
    const statusColors = {
        'Completed': 'bg-green-100 text-green-800 border-green-200',
        'Watching': 'bg-blue-100 text-blue-800 border-blue-200',
        'On Hold': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'Dropped': 'bg-red-100 text-red-800 border-red-200',
        'Plan to watch': 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
        <select
            value={status}
            onChange={onChange}
            className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[status]} cursor-pointer transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50`}
        >
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Watching">Watching</option>
            <option value="Dropped">Dropped</option>
            <option value="Plan to watch">Plan to watch</option>
        </select>
    );
};

const Modal = ({ isOpen, onClose, onSave }) => {
    const [formValues, setFormValues] = useState({
        title: '',
        seasons: '',
        total_episodes: '',
        watched_episodes: '',
        status: 'Plan to watch',
        person: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormValues(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave(formValues);
        setFormValues({
            title: '',
            seasons: '',
            total_episodes: '',
            watched_episodes: '',
            status: 'Plan to watch',
            person: ''
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Series</h2>

                <div className="space-y-3">
                    <input
                        type="text"
                        name="title"
                        placeholder="Title"
                        value={formValues.title}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                    <input
                        type="number"
                        name="seasons"
                        placeholder="Seasons"
                        value={formValues.seasons}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                    <input
                        type="number"
                        name="total_episodes"
                        placeholder="Total Episodes"
                        value={formValues.total_episodes}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                    <input
                        type="number"
                        name="watched_episodes"
                        placeholder="Watched Episodes"
                        value={formValues.watched_episodes}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                    <select
                        name="status"
                        value={formValues.status}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    >
                        <option value="Completed">Completed</option>
                        <option value="Watching">Watching</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Dropped">Dropped</option>
                        <option value="Plan to watch">Plan to watch</option>
                    </select>
                    <input
                        type="text"
                        name="person"
                        placeholder="Person"
                        value={formValues.person}
                        onChange={handleChange}
                        className="w-full border rounded-lg p-2"
                    />
                </div>

                <div className="mt-5 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                    >
                        Add Series
                    </button>
                </div>
            </div>
        </div>
    );
};


// Progress bar component
const ProgressBar = ({ percentage }) => {
    const getProgressColor = (percent) => {
        if (percent >= 90) return 'bg-green-500';
        if (percent >= 50) return 'bg-blue-500';
        if (percent >= 25) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex items-center space-x-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                    className={`h-2.5 rounded-full ${getProgressColor(percentage)} transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <span className="text-sm font-medium text-gray-700 min-w-[45px]">{percentage}%</span>
        </div>
    );
};

const ListCard = ({ id, title, seasons, total_episodes, watched_episodes, status, person, handleDelete, refreshCards, isEditing, setIsEditing, handleSaveClick }) => {
    const [editedValues, setEditedValues] = useState({
        title, seasons, total_episodes, watched_episodes, status, person
    });

    useEffect(() => {
        setEditedValues({ title, seasons, total_episodes, watched_episodes, status, person });
    }, [title, seasons, total_episodes, watched_episodes, status, person]);

    useEffect(() => {
        const { total_episodes, watched_episodes } = editedValues;
        const percentage = total_episodes ? ((watched_episodes / total_episodes) * 100).toFixed(2) : 0;
        setEditedValues((prev) => ({ ...prev, percentage }));
    }, [editedValues.total_episodes, editedValues.watched_episodes]);

    const handleFieldChangeLocal = (e) => {
        const { name, value } = e.target;
        setEditedValues({
            ...editedValues,
            [name]: value
        });
    };

    const handleStatusChangeLocal = async (e) => {
        const { value } = e.target;
        setEditedValues({
            ...editedValues,
            status: value
        });

        try {
            const cardDocRef = doc(firestore, 'series', id);
            await updateDoc(cardDocRef, { status: value });
            console.log('Status updated successfully!');
        } catch (error) {
            console.error('Error updating status: ', error);
        }
    };

    const handleIncrementWatchedEpisodes = async () => {
        const newWatchedEpisodes = Math.min(parseInt(editedValues.watched_episodes, 10) + 1, parseInt(editedValues.total_episodes, 10));
        setEditedValues({
            ...editedValues,
            watched_episodes: newWatchedEpisodes
        });

        try {
            const cardDocRef = doc(firestore, 'series', id);
            await updateDoc(cardDocRef, { watched_episodes: newWatchedEpisodes });
            console.log('Watched episodes updated successfully!');
        } catch (error) {
            console.error('Error updating watched episodes: ', error);
        }
    };

    const handleEditClick = () => {
        setIsEditing(id);
    };

    const handleSaveClickLocal = async () => {
        await handleSaveClick(id, editedValues);
        setIsEditing(null);
    };

    const handleDeleteClick = async () => {
        await handleDelete(id);
        refreshCards();
    };

    const handleCancelClick = () => {
        setIsEditing(null);
        setEditedValues({ title, seasons, total_episodes, watched_episodes, status, person });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden mb-4">
            <div className="p-6">
                {isEditing === id ? (
                    // Edit Mode
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-center">
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                name="title"
                                value={editedValues.title}
                                onChange={handleFieldChangeLocal}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="Series title"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Seasons</label>
                            <input
                                type="text"
                                name="seasons"
                                value={editedValues.seasons}
                                onChange={handleFieldChangeLocal}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="Seasons"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Episodes</label>
                            <input
                                type="number"
                                name="total_episodes"
                                value={editedValues.total_episodes}
                                onChange={handleFieldChangeLocal}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Watched</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    name="watched_episodes"
                                    value={editedValues.watched_episodes}
                                    onChange={handleFieldChangeLocal}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                                <button
                                    onClick={handleIncrementWatchedEpisodes}
                                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-2 rounded-lg shadow hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Progress</label>
                            <ProgressBar percentage={parseFloat(editedValues.percentage)} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <StatusBadge status={editedValues.status} onChange={handleStatusChangeLocal} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Person</label>
                            <input
                                type="text"
                                name="person"
                                value={editedValues.person}
                                onChange={handleFieldChangeLocal}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="Person"
                            />
                        </div>
                    </div>
                ) : (
                    // View Mode
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 items-center">
                        <div className="lg:col-span-2">
                            <h3 className="font-semibold text-gray-900 text-lg truncate" title={title}>{title}</h3>
                            {person && (
                                <p className="text-sm text-gray-500 mt-1">With: {person}</p>
                            )}
                        </div>

                        <div className="text-center">
                            <span className="text-2xl font-bold text-purple-600">{seasons}</span>
                            <p className="text-xs text-gray-500 mt-1">SEASONS</p>
                        </div>

                        <div className="text-center">
                            <span className="text-2xl font-bold text-blue-600">{total_episodes}</span>
                            <p className="text-xs text-gray-500 mt-1">TOTAL EPS</p>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                                <span className="text-2xl font-bold text-green-600">{editedValues.watched_episodes}</span>
                                <button
                                    onClick={handleIncrementWatchedEpisodes}
                                    className="bg-gradient-to-r from-green-500 to-green-600 text-white p-2 rounded-lg shadow hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">WATCHED</p>
                        </div>

                        <div>
                            <ProgressBar percentage={parseFloat(editedValues.percentage)} />
                        </div>

                        <div className="flex justify-center">
                            <StatusBadge status={editedValues.status} onChange={handleStatusChangeLocal} />
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-100">
                    {isEditing === id ? (
                        <>
                            <button
                                onClick={handleSaveClickLocal}
                                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg shadow hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Save</span>
                            </button>
                            <button
                                onClick={handleCancelClick}
                                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-lg shadow hover:from-gray-600 hover:to-gray-700 transition-all transform hover:scale-105 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Cancel</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleEditClick}
                                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit</span>
                            </button>
                            <button
                                onClick={handleDeleteClick}
                                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg shadow hover:from-red-600 hover:to-red-700 transition-all transform hover:scale-105 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Delete</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
const List = () => {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [newCard, setNewCard] = useState(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [sortOrder, setSortOrder] = useState('asc');
    const [searchTerm, setSearchTerm] = useState("");

    const fetchCards = async () => {
        setLoading(true);

        try {
            let q;
            if (statusFilter) {
                q = query(collection(firestore, 'series'), where('status', '==', statusFilter));
            } else {
                q = query(collection(firestore, 'series'));
            }

            const querySnapshot = await getDocs(q);

            let cardsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Apply search filter
            if (searchTerm) {
                cardsData = cardsData.filter(card =>
                    card.title.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Apply sorting
            if (sortOrder === 'asc') {
                cardsData = cardsData.sort((a, b) => a.title.localeCompare(b.title));
            } else if (sortOrder === 'desc') {
                cardsData = cardsData.sort((a, b) => b.title.localeCompare(a.title));
            }

            setCards(cardsData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching cards: ', error);
            setLoading(false);
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAddClick = () => {
        setIsModalOpen(true);
    };

    const handleSaveSeries = async (newSeries) => {
        try {
            const docRef = await addDoc(collection(firestore, 'series'), newSeries);
            console.log('New series added! With id: ' + docRef.id);
            refreshCards(); // reload your list
        } catch (error) {
            console.error('Error adding new series: ', error);
        }
    };


    const handleSaveClick = async (id, values) => {
        try {
            if (id) {
                // Update existing document
                const cardDocRef = doc(firestore, 'series', id);
                await updateDoc(cardDocRef, values);
                console.log('Document updated with ID:', id);
            } else {
                // Add new document and capture its ID
                const docRef = await addDoc(collection(firestore, 'series'), values);
                console.log('Document added with ID:', docRef.id);

                setNewCard(null);
                setIsEditing(null);
            }

            fetchCards(); // Refresh cards after save
        } catch (error) {
            console.error('Error saving document:', error);
        }
    };


    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(firestore, 'series', id));
            console.log('Document deleted with ID: ', id);
            fetchCards();
        } catch (error) {
            console.error('Error deleting document: ', error);
        }
    };

    const handleStatusFilterChange = (e) => {
        setStatusFilter(e.target.value);
    };

    const handleImportCSV = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: async (results) => {
                const seriesData = results.data;
                try {
                    for (const series of seriesData) {
                        await addDoc(collection(firestore, 'series'), series);
                    }
                    console.log('Data imported successfully!');
                    fetchCards();
                } catch (error) {
                    console.error('Error importing data: ', error);
                }
            },
            error: (error) => {
                console.error('Error parsing CSV file: ', error);
            }
        });
    };

    const handleExportCSV = async () => {
        try {
            const querySnapshot = await getDocs(collection(firestore, 'series'));
            const data = querySnapshot.docs.map(doc => doc.data());

            const csv = Papa.unparse(data);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, 'series_data.csv');
            console.log('Data exported successfully!');
        } catch (error) {
            console.error('Error exporting data: ', error);
        }
    };

    const handleSort = () => {
        const newSortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        setSortOrder(newSortOrder);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    useEffect(() => {
        fetchCards();
    }, [statusFilter, sortOrder, searchTerm]);

    return (
        <div className="">

            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                {/* Search Bar - Full Width */}
                <div className="mb-6">
                    <div className="relative max-w-2xl">
                        <input
                            type="text"
                            placeholder="Search series by title..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                        <svg className="w-6 h-6 text-gray-400 absolute left-4 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Action Buttons and Filters */}
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                    {/* Left Section - Add Button and Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        {/* Add New Series Button */}
                        <button
                            onClick={handleAddClick}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 flex items-center space-x-2 whitespace-nowrap"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add New Series</span>
                        </button>

                        <Modal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSave={handleSaveSeries}
                        />


                        {/* Filter and Sort Controls */}
                        <div className="flex flex-wrap gap-3">
                            {/* Status Filter */}
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={handleStatusFilterChange}
                                    className="pl-3 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
                                >
                                    <option value="">All Status</option>
                                    <option value="Completed">Completed</option>
                                    <option value="On Hold">On Hold</option>
                                    <option value="Watching">Watching</option>
                                    <option value="Dropped">Dropped</option>
                                    <option value="Plan to watch">Plan to watch</option>
                                </select>
                                <svg className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {/* Sort Button */}
                            <button
                                onClick={handleSort}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center space-x-2 whitespace-nowrap"
                            >
                                <span>Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                                <svg className={`w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Right Section - Import/Export Buttons */}
                    <div className="flex gap-3 w-full lg:w-auto justify-start lg:justify-end">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleImportCSV}
                            className="hidden"
                            id="upload-csv"
                        />
                        <label
                            htmlFor="upload-csv"
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 cursor-pointer flex items-center space-x-2 whitespace-nowrap"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            <span>Import CSV</span>
                        </label>
                        <button
                            onClick={handleExportCSV}
                            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transition-all transform hover:scale-105 flex items-center space-x-2 whitespace-nowrap"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
                {/* Controls */}

                {/* Loading State */}
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                    </div>
                ) : (
                    /* Series List */
                    <div>
                        {cards.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No series found</h3>
                                <p className="text-gray-500 mb-4">Get started by adding your first series!</p>
                                <button
                                    onClick={handleAddClick}
                                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all"
                                >
                                    Add Your First Series
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="mb-4 text-sm text-gray-600">
                                    Showing {cards.length} series
                                </div>
                                {cards.map(card => (
                                    <ListCard
                                        key={card.id}
                                        id={card.id}
                                        title={card.title}
                                        seasons={card.seasons}
                                        total_episodes={card.total_episodes}
                                        watched_episodes={card.watched_episodes}
                                        status={card.status}
                                        person={card.person}
                                        handleDelete={handleDelete}
                                        refreshCards={fetchCards}
                                        isEditing={isEditing}
                                        setIsEditing={setIsEditing}
                                        handleSaveClick={handleSaveClick}
                                    />
                                ))}
                                {newCard && (
                                    <ListCard
                                        id={null}
                                        title={newCard.title}
                                        seasons={newCard.seasons}
                                        total_episodes={newCard.total_episodes}
                                        watched_episodes={newCard.watched_episodes}
                                        status={newCard.status}
                                        person={newCard.person}
                                        handleDelete={handleDelete}
                                        refreshCards={fetchCards}
                                        isEditing={isEditing}
                                        setIsEditing={setIsEditing}
                                        handleSaveClick={handleSaveClick}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SectionWrapper(List, "list");