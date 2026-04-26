import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Calendar, Clock, Check, X, ChevronDown, ChevronUp, FileText, RefreshCw, Loader, ArrowRightLeft, Pencil, Save, Plus, Trash2 } from 'lucide-react';

const API_URL = '/api/itinerary';

const Wanderer = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawContent, setRawContent] = useState('');
  const [items, setItems] = useState([]);
  const [tripInfo, setTripInfo] = useState({ title: '', dates: '' });
  const [showRawContent, setShowRawContent] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collapsedDays, setCollapsedDays] = useState({});
  const [customCategories, setCustomCategories] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    title: '',
    category: 'other',
    arrivalTime: '',
    description: '',
    day: ''
  });

  // Default category configuration
  const defaultCategories = {
    culture: { label: 'Culture', icon: '🏛️', color: 'bg-purple-100 text-purple-700' },
    dining: { label: 'Dining', icon: '🍴', color: 'bg-orange-100 text-orange-700' },
    adventure: { label: 'Adventure', icon: '🏔️', color: 'bg-green-100 text-green-700' },
    nature: { label: 'Nature', icon: '🌿', color: 'bg-emerald-100 text-emerald-700' },
    shopping: { label: 'Shopping', icon: '🛍️', color: 'bg-pink-100 text-pink-700' },
    nightlife: { label: 'Nightlife', icon: '🍸', color: 'bg-indigo-100 text-indigo-700' },
    accommodation: { label: 'Accommodation', icon: '🏨', color: 'bg-blue-100 text-blue-700' },
    transportation: { label: 'Transportation', icon: '🚗', color: 'bg-teal-100 text-teal-700' },
    leisure: { label: 'Leisure', icon: '☕', color: 'bg-amber-100 text-amber-700' },
    other: { label: 'Other', icon: '📍', color: 'bg-gray-100 text-gray-700' }
  };

  // Merge default and custom categories
  const categories = { ...defaultCategories, ...customCategories };

  // Toggle day section collapse/expand
  const toggleDayCollapse = (day) => {
    setCollapsedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  // Add a new custom category
  const addCustomCategory = (key, label) => {
    const colors = [
      'bg-rose-100 text-rose-700',
      'bg-cyan-100 text-cyan-700',
      'bg-violet-100 text-violet-700',
      'bg-lime-100 text-lime-700',
      'bg-fuchsia-100 text-fuchsia-700',
      'bg-sky-100 text-sky-700'
    ];
    const randomColor = colors[Object.keys(customCategories).length % colors.length];
    setCustomCategories(prev => ({
      ...prev,
      [key]: { label, icon: '🏷️', color: randomColor }
    }));
  };

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        setTripInfo(data.tripInfo || { title: '', dates: '' });
        setRawContent(data.rawContent || '');
        setCustomCategories(data.customCategories || {});
        setCollapsedDays(data.collapsedDays || {});
        setLastSynced(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch from API, using localStorage:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('wanderer-data');
      if (saved) {
        const data = JSON.parse(saved);
        setItems(data.items || []);
        setTripInfo(data.tripInfo || { title: '', dates: '' });
        setRawContent(data.rawContent || '');
        setCustomCategories(data.customCategories || {});
        setCollapsedDays(data.collapsedDays || {});
      }
    }
    setIsLoading(false);
  }, []);

  // Save data to API
  const saveData = useCallback(async (newItems, newTripInfo, newRawContent, newCustomCategories, newCollapsedDays) => {
    // Always save to localStorage as backup
    localStorage.setItem('wanderer-data', JSON.stringify({
      items: newItems,
      tripInfo: newTripInfo,
      rawContent: newRawContent,
      customCategories: newCustomCategories,
      collapsedDays: newCollapsedDays
    }));

    setIsSyncing(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: newItems,
          tripInfo: newTripInfo,
          rawContent: newRawContent,
          customCategories: newCustomCategories,
          collapsedDays: newCollapsedDays
        }),
      });
      if (response.ok) {
        setLastSynced(new Date());
      }
    } catch (error) {
      console.error('Failed to save to API:', error);
    }
    setIsSyncing(false);
  }, []);

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save data when it changes (debounced)
  useEffect(() => {
    if (isLoading) return; // Don't save while loading
    if (items.length > 0 || tripInfo.title) {
      const timer = setTimeout(() => {
        saveData(items, tripInfo, rawContent, customCategories, collapsedDays);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [items, tripInfo, rawContent, customCategories, collapsedDays, isLoading, saveData]);

  // Manual refresh
  const handleRefresh = async () => {
    setIsSyncing(true);
    await fetchData();
    setIsSyncing(false);
  };

  const handleFileUpload = (event) => {
    console.log('File upload triggered');
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name);
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      console.log('File content loaded, length:', content.length);
      setRawContent(content);
      parseDocument(content);
    };
    reader.onerror = (e) => {
      console.error('File read error:', e);
    };
    reader.readAsText(file);
  };

  const parseDocument = (content) => {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    const parsedItems = [];
    let tripTitle = '';
    let tripDates = '';

    // Current item being parsed
    let currentItem = null;
    let currentDay = '';

    const saveCurrentItem = () => {
      if (currentItem && currentItem.title) {
        parsedItems.push({
          ...currentItem,
          day: currentDay,
          id: `item-${Date.now()}-${parsedItems.length}`,
          status: 'pending'
        });
      }
      currentItem = null;
    };

    const normalizeCategory = (cat) => {
      const lower = cat.toLowerCase().trim();
      if (lower.includes('cultur')) return 'culture';
      if (lower.includes('dining') || lower.includes('food') || lower.includes('restaurant') || lower.includes('drink')) return 'dining';
      if (lower.includes('nature')) return 'nature';
      if (lower.includes('adventure') || lower.includes('outdoor')) return 'adventure';
      if (lower.includes('shop')) return 'shopping';
      if (lower.includes('night') || lower.includes('bar') || lower.includes('club')) return 'nightlife';
      if (lower.includes('hotel') || lower.includes('accommodation') || lower.includes('stay')) return 'accommodation';
      if (lower.includes('transport') || lower.includes('flight') || lower.includes('travel')) return 'transportation';
      if (lower.includes('leisure') || lower.includes('relax')) return 'leisure';
      return 'other';
    };

    lines.forEach((line, index) => {
      // Check for day markers (e.g., "Day : Day 1 - Apr 22" or "Day 1 - Apr 22")
      const dayMatch = line.match(/^Day\s*:\s*(.+)/i) || line.match(/^(Day\s*\d+.*)/i);

      // Check for labeled fields (case insensitive)
      // Supports bullets: *, •, -, or none. Flexible spacing around colons.
      const titleMatch = line.match(/^(?:[*•\-]\s*)?Title\s*:\s*(.+)/i);
      const categoryMatch = line.match(/^(?:[*•\-]\s*)?Category\s*:\s*(.+)/i);
      const arrivalTimeMatch = line.match(/^(?:[*•\-]\s*)?Arrival\s*Time\s*:\s*(.+)/i);
      const descriptionMatch = line.match(/^(?:[*•\-]\s*)?Description\s*:\s*(.+)/i);

      if (dayMatch) {
        // Save previous item if exists
        saveCurrentItem();
        // Set current day
        currentDay = dayMatch[1].trim();
      } else if (titleMatch) {
        // Save previous item if exists
        saveCurrentItem();
        // Start new item
        currentItem = {
          title: titleMatch[1].trim(),
          category: 'other',
          arrivalTime: '',
          description: ''
        };
      } else if (categoryMatch && currentItem) {
        currentItem.category = normalizeCategory(categoryMatch[1]);
      } else if (arrivalTimeMatch && currentItem) {
        currentItem.arrivalTime = arrivalTimeMatch[1].trim();
      } else if (descriptionMatch && currentItem) {
        currentItem.description = descriptionMatch[1].trim();
      } else if (!currentItem && !currentDay) {
        // Try to detect trip title/dates from non-labeled lines at the start
        if (index < 5 && !tripTitle && line.length > 3 && line.length < 100) {
          const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\w+\s+\d{1,2},?\s+\d{4})|(\d{4}-\d{2}-\d{2})/gi;
          if (datePattern.test(line)) {
            tripDates = line;
          } else if (!line.includes(':')) {
            tripTitle = line;
          }
        }
      }
    });

    // Save last item
    saveCurrentItem();

    console.log('Parsed items:', parsedItems.length);
    console.log('Trip info:', tripTitle, tripDates);

    setTripInfo({ title: tripTitle, dates: tripDates });
    setItems(parsedItems);
  };

  const updateItemStatus = (itemId, status) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status } : item
    ));
  };

  const moveItemToDay = (itemId, newDay) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, day: newDay } : item
    ));
  };

  // Update item details (for editing)
  const updateItemDetails = (itemId, updates) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  // Delete an item
  const deleteItem = (itemId) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Add a new item
  const addNewItem = () => {
    if (!newCardForm.title.trim()) return;

    const newItem = {
      id: `item-${Date.now()}-${items.length}`,
      title: newCardForm.title.trim(),
      category: newCardForm.category,
      arrivalTime: newCardForm.arrivalTime.trim(),
      description: newCardForm.description.trim(),
      day: newCardForm.day || uniqueDays[0] || 'Day 1',
      status: 'pending'
    };

    setItems(prev => [...prev, newItem]);
    setNewCardForm({
      title: '',
      category: 'other',
      arrivalTime: '',
      description: '',
      day: ''
    });
    setShowAddModal(false);
  };

  // Get unique days for the move dropdown
  const uniqueDays = [...new Set(items.map(item => item.day).filter(Boolean))];

  const clearAll = () => {
    setUploadedFile(null);
    setRawContent('');
    setItems([]);
    setTripInfo({ title: '', dates: '' });
    setCustomCategories({});
    setCollapsedDays({});
    localStorage.removeItem('wanderer-data');
  };

  const filteredItems = items.filter(item => {
    if (categoryFilter === 'all') return true;
    return item.category === categoryFilter;
  });

  // Get categories that are actually used in items
  const usedCategories = [...new Set(items.map(item => item.category))];

  // Count items per category
  const categoryCounts = usedCategories.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat).length;
    return acc;
  }, {});

  // Item Card Component
  const ItemCard = ({ item }) => {
    const [showMoveMenu, setShowMoveMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');
    const [editForm, setEditForm] = useState({
      title: item.title,
      category: item.category,
      arrivalTime: item.arrivalTime || '',
      description: item.description || ''
    });

    const category = categories[item.category] || categories.other;
    const statusStyles = {
      pending: 'bg-slate-50 border-slate-200',
      approved: 'bg-green-50 border-green-200'
    };

    // Days available to move to (excluding current day)
    const availableDays = uniqueDays.filter(day => day !== item.day);

    const handleSaveEdit = () => {
      updateItemDetails(item.id, editForm);
      setIsEditing(false);
    };

    const handleCancelEdit = () => {
      setEditForm({
        title: item.title,
        category: item.category,
        arrivalTime: item.arrivalTime || '',
        description: item.description || ''
      });
      setIsEditing(false);
      setShowCategoryDropdown(false);
      setNewTagInput('');
    };

    const handleAddNewTag = () => {
      if (newTagInput.trim()) {
        const key = newTagInput.toLowerCase().trim().replace(/\s+/g, '_');
        addCustomCategory(key, newTagInput.trim());
        setEditForm(prev => ({ ...prev, category: key }));
        setNewTagInput('');
        setShowCategoryDropdown(false);
      }
    };

    // Edit mode view
    if (isEditing) {
      return (
        <div className={`rounded-xl border-2 p-5 transition-all ${statusStyles[item.status] || statusStyles.pending}`}>
          {/* Edit Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Edit Activity</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Activity title"
            />
          </div>

          {/* Category Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Category / Tag</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left flex items-center justify-between bg-white hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <span>{(categories[editForm.category] || categories.other).icon}</span>
                  {(categories[editForm.category] || categories.other).label}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-64 overflow-y-auto">
                  <div className="p-2">
                    {Object.entries(categories).map(([key, cat]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setEditForm(prev => ({ ...prev, category: key }));
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors ${
                          editForm.category === key ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                    {/* Add new tag */}
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <div className="flex gap-2 px-1">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="New tag name..."
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddNewTag()}
                        />
                        <button
                          onClick={handleAddNewTag}
                          disabled={!newTagInput.trim()}
                          className="px-2 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Time Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Arrival Time</label>
            <input
              type="text"
              value={editForm.arrivalTime}
              onChange={(e) => setEditForm(prev => ({ ...prev, arrivalTime: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. 8:30 PM"
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              rows={3}
              placeholder="Activity description"
            />
          </div>
        </div>
      );
    }

    // Normal view
    return (
      <div className={`rounded-xl border-2 p-5 transition-all ${statusStyles[item.status] || statusStyles.pending}`}>
        {/* Header: Title + Buttons */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-xl font-bold text-gray-900 flex-1">{item.title}</h3>
          {item.status === 'pending' && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateItemStatus(item.id, 'approved')}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Reject
              </button>
            </div>
          )}
          {item.status === 'approved' && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => deleteItem(item.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium">
                <Check className="w-4 h-4" />
                Approved
              </span>
            </div>
          )}
        </div>

        {/* Category Badge + Move Button */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
            <span>{category.icon}</span>
            {category.label}
          </span>

          {/* Move to different day */}
          {availableDays.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Move
              </button>

              {showMoveMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[200px]">
                  <div className="p-2">
                    <p className="text-xs text-gray-500 px-2 py-1 font-medium">Move to:</p>
                    {availableDays.map(day => (
                      <button
                        key={day}
                        onClick={() => {
                          moveItemToDay(item.id, day);
                          setShowMoveMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Arrival Time */}
        {item.arrivalTime && (
          <div className="flex items-center gap-2 mb-4 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{item.arrivalTime}</span>
          </div>
        )}

        {/* Description */}
        {item.description && (
          <p className="text-gray-700 leading-relaxed">{item.description}</p>
        )}

        {/* Undo button for approved items */}
        {item.status === 'approved' && (
          <button
            onClick={() => updateItemStatus(item.id, 'pending')}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Undo
          </button>
        )}
      </div>
    );
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  // Upload screen
  if (items.length === 0 && !tripInfo.title) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-8">
        <div className="max-w-xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Wanderer</h1>
            <p className="text-gray-600">Upload your travel document to organize your itinerary</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer">
              <input
                type="file"
                accept=".txt,.md,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {uploadedFile ? uploadedFile.name : 'Drop your travel document here'}
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Supports .txt, .md, .csv files
                </p>
              </label>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Document format:</p>
              <pre className="text-xs text-gray-600 font-mono bg-white p-3 rounded border">
{`Day : Day 1 - Apr 22

Title: Activity Name
* Category: Dining
* Arrival Time: 8:30 PM
* Description: Your description

Day : Day 2 - Apr 23

Title: Next Activity
* Category: Culture
* Arrival Time: 10:00 AM
* Description: Another description`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main view with cards
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {tripInfo.title || 'My Trip'}
              </h1>
              {tripInfo.dates && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Calendar className="w-4 h-4" />
                  {tripInfo.dates}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Sync status */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {isSyncing ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <button
                    onClick={handleRefresh}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh to see partner's changes"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                {lastSynced && (
                  <span className="hidden sm:inline text-xs">
                    Synced {lastSynced.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <button
                onClick={clearAll}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                New Upload
              </button>
            </div>
          </div>

          {/* Tag filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({items.length})
            </button>
            {usedCategories.map(catKey => {
              const cat = categories[catKey] || categories.other;
              const isActive = categoryFilter === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setCategoryFilter(catKey)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'ring-2 ring-offset-1 ring-gray-800 ' + cat.color
                      : cat.color + ' hover:opacity-80'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label} ({categoryCounts[catKey]})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {categoryFilter === 'all' ? '' : (categories[categoryFilter]?.label || '')} items
          </div>
        ) : (
          // Group items by day
          (() => {
            const groupedByDay = filteredItems.reduce((acc, item) => {
              const day = item.day || 'Unassigned';
              if (!acc[day]) acc[day] = [];
              acc[day].push(item);
              return acc;
            }, {});

            return Object.entries(groupedByDay).map(([day, dayItems]) => {
              const isCompleted = dayItems.every(item => item.status === 'approved');
              return (
              <div key={day} className={`mb-8 transition-opacity ${isCompleted ? 'opacity-50' : ''}`}>
                {/* Day Header with Accordion Toggle */}
                <button
                  onClick={() => toggleDayCollapse(day)}
                  className={`w-full sticky top-[140px] z-[5] text-white px-5 py-3 rounded-lg mb-4 shadow-md flex items-center justify-between transition-all ${
                    isCompleted
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  <h2 className="text-lg font-bold">{day}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-80">
                      {dayItems.length} {dayItems.length === 1 ? 'activity' : 'activities'}
                    </span>
                    {collapsedDays[day] ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronUp className="w-5 h-5" />
                    )}
                  </div>
                </button>
                {/* Day Items - Collapsible */}
                {!collapsedDays[day] && (
                  <div className="space-y-4">
                    {dayItems.map(item => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            );});
          })()
        )}

        {/* Raw content toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
          <button
            onClick={() => setShowRawContent(!showRawContent)}
            className="w-full px-5 py-4 flex items-center justify-between bg-gray-100 text-gray-700"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <span className="font-semibold">Original Document</span>
            </div>
            {showRawContent ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showRawContent && (
            <div className="p-4">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg max-h-64 overflow-auto">
                {rawContent}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-20"
        title="Add new activity"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add New Card Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add New Activity</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newCardForm.title}
                  onChange={(e) => setNewCardForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Activity name"
                />
              </div>

              {/* Day */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                <select
                  value={newCardForm.day}
                  onChange={(e) => setNewCardForm(prev => ({ ...prev, day: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">Select a day...</option>
                  {uniqueDays.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                  <option value="__new__">+ Add new day</option>
                </select>
                {newCardForm.day === '__new__' && (
                  <input
                    type="text"
                    onChange={(e) => setNewCardForm(prev => ({ ...prev, day: e.target.value }))}
                    className="w-full mt-2 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g., Day 3 - Apr 24"
                  />
                )}
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newCardForm.category}
                  onChange={(e) => setNewCardForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  {Object.entries(categories).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Arrival Time */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Time</label>
                <input
                  type="text"
                  value={newCardForm.arrivalTime}
                  onChange={(e) => setNewCardForm(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g., 8:30 PM"
                />
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCardForm.description}
                  onChange={(e) => setNewCardForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="Activity description"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addNewItem}
                  disabled={!newCardForm.title.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Add Activity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wanderer;
