import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Calendar, Clock, Check, X, ChevronDown, ChevronUp, FileText, RefreshCw, Loader } from 'lucide-react';

const API_URL = '/api/itinerary';

const Wanderer = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawContent, setRawContent] = useState('');
  const [items, setItems] = useState([]);
  const [tripInfo, setTripInfo] = useState({ title: '', dates: '' });
  const [showRawContent, setShowRawContent] = useState(false);
  const [filter, setFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Category configuration
  const categories = {
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

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
        setTripInfo(data.tripInfo || { title: '', dates: '' });
        setRawContent(data.rawContent || '');
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
      }
    }
    setIsLoading(false);
  }, []);

  // Save data to API
  const saveData = useCallback(async (newItems, newTripInfo, newRawContent) => {
    // Always save to localStorage as backup
    localStorage.setItem('wanderer-data', JSON.stringify({
      items: newItems,
      tripInfo: newTripInfo,
      rawContent: newRawContent
    }));

    setIsSyncing(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: newItems,
          tripInfo: newTripInfo,
          rawContent: newRawContent
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
        saveData(items, tripInfo, rawContent);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [items, tripInfo, rawContent, isLoading, saveData]);

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

  const clearAll = () => {
    setUploadedFile(null);
    setRawContent('');
    setItems([]);
    setTripInfo({ title: '', dates: '' });
    localStorage.removeItem('wanderer-data');
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const statusCounts = {
    all: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    approved: items.filter(i => i.status === 'approved').length,
    rejected: items.filter(i => i.status === 'rejected').length
  };

  // Item Card Component
  const ItemCard = ({ item }) => {
    const category = categories[item.category] || categories.other;
    const statusStyles = {
      pending: 'bg-slate-50 border-slate-200',
      approved: 'bg-green-50 border-green-200',
      rejected: 'bg-red-50 border-red-200 opacity-60'
    };

    return (
      <div className={`rounded-xl border-2 p-5 transition-all ${statusStyles[item.status]}`}>
        {/* Header: Title + Buttons */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-xl font-bold text-gray-900 flex-1">{item.title}</h3>
          {item.status === 'pending' && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => updateItemStatus(item.id, 'approved')}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={() => updateItemStatus(item.id, 'rejected')}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          )}
          {item.status === 'approved' && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium">
              <Check className="w-4 h-4" />
              Approved
            </span>
          )}
          {item.status === 'rejected' && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium">
              <X className="w-4 h-4" />
              Rejected
            </span>
          )}
        </div>

        {/* Category Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${category.color}`}>
            <span>{category.icon}</span>
            {category.label}
          </span>
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

        {/* Undo button for approved/rejected */}
        {item.status !== 'pending' && (
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

          {/* Filter tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label} ({statusCounts[key]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {filter === 'all' ? '' : filter} items
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

            return Object.entries(groupedByDay).map(([day, dayItems]) => (
              <div key={day} className="mb-8">
                {/* Day Header */}
                <div className="sticky top-[140px] z-[5] bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-lg mb-4 shadow-md">
                  <h2 className="text-lg font-bold">{day}</h2>
                </div>
                {/* Day Items */}
                <div className="space-y-4">
                  {dayItems.map(item => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ));
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
    </div>
  );
};

export default Wanderer;
