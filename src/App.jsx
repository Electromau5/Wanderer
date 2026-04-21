import React, { useState, useEffect } from 'react';
import { Upload, Calendar, MapPin, Clock, Navigation, Check, X, ChevronDown, ChevronUp, FileText } from 'lucide-react';

const Wanderer = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawContent, setRawContent] = useState('');
  const [items, setItems] = useState([]);
  const [tripInfo, setTripInfo] = useState({ title: '', dates: '' });
  const [showRawContent, setShowRawContent] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

  // Category configuration
  const categories = {
    culture: { label: 'Culture', icon: '🏛️', color: 'bg-purple-100 text-purple-700' },
    dining: { label: 'Dining', icon: '🍴', color: 'bg-orange-100 text-orange-700' },
    adventure: { label: 'Adventure', icon: '🏔️', color: 'bg-green-100 text-green-700' },
    shopping: { label: 'Shopping', icon: '🛍️', color: 'bg-pink-100 text-pink-700' },
    nightlife: { label: 'Nightlife', icon: '🍸', color: 'bg-indigo-100 text-indigo-700' },
    accommodation: { label: 'Accommodation', icon: '🏨', color: 'bg-blue-100 text-blue-700' },
    transportation: { label: 'Transportation', icon: '🚗', color: 'bg-teal-100 text-teal-700' },
    other: { label: 'Other', icon: '📍', color: 'bg-gray-100 text-gray-700' }
  };

  // Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem('wanderer-data');
    if (saved) {
      const data = JSON.parse(saved);
      setItems(data.items || []);
      setTripInfo(data.tripInfo || { title: '', dates: '' });
      setRawContent(data.rawContent || '');
    }
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (items.length > 0 || tripInfo.title) {
      localStorage.setItem('wanderer-data', JSON.stringify({ items, tripInfo, rawContent }));
    }
  }, [items, tripInfo, rawContent]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setRawContent(content);
      parseDocument(content);
    };
    reader.readAsText(file);
  };

  const detectCategory = (text) => {
    const lowerText = text.toLowerCase();
    if (lowerText.match(/museum|temple|church|gallery|historic|monument|palace|fort|ruins|art/)) return 'culture';
    if (lowerText.match(/restaurant|cafe|coffee|breakfast|lunch|dinner|food|eat|bistro|bar\s/)) return 'dining';
    if (lowerText.match(/hike|trek|beach|surf|dive|climb|adventure|outdoor|nature|park|garden/)) return 'adventure';
    if (lowerText.match(/shop|market|mall|store|boutique|bazaar/)) return 'shopping';
    if (lowerText.match(/club|nightlife|pub|lounge|disco|party/)) return 'nightlife';
    if (lowerText.match(/hotel|hostel|airbnb|stay|accommodation|resort|lodge/)) return 'accommodation';
    if (lowerText.match(/flight|train|bus|taxi|uber|airport|station|transport|car\s*rental/)) return 'transportation';
    return 'other';
  };

  const parseDocument = (content) => {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    const parsedItems = [];
    let title = '';
    let dates = '';

    lines.forEach((line, index) => {
      // Try to detect title from first few lines
      if (index < 3 && !title && line.length > 3 && line.length < 100) {
        if (!line.includes(':') || line.toLowerCase().includes('trip') || line.toLowerCase().includes('itinerary')) {
          title = line;
          return;
        }
      }

      // Detect dates
      const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\w+\s+\d{1,2},?\s+\d{4})|(\d{4}-\d{2}-\d{2})/gi;
      const dateMatch = line.match(datePattern);
      if (dateMatch && !dates) {
        dates = line;
        return;
      }

      // Skip section headers
      if (line.endsWith(':') && line.length < 30) return;

      // Parse as an item if it's substantial
      if (line.length > 5) {
        const category = detectCategory(line);

        // Try to extract time if present
        const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(AM|PM|am|pm)?)|(\d{1,2}\s*(AM|PM|am|pm))/);
        const time = timeMatch ? timeMatch[0] : '';

        parsedItems.push({
          id: `item-${Date.now()}-${index}`,
          name: line.replace(timeMatch?.[0] || '', '').trim(),
          category,
          time: time || 'TBD',
          duration: '2 hours',
          distance: '1 km from accommodation',
          travelTime: '15 mins walk',
          description: '',
          status: 'pending' // 'pending', 'approved', 'rejected'
        });
      }
    });

    setTripInfo({ title, dates });
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
          <h3 className="text-lg font-bold text-gray-900 flex-1">{item.name}</h3>
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

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4 text-gray-600">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{item.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{item.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            <span>{item.distance}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{item.travelTime}</span>
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-gray-700">{item.description}</p>
        )}

        {/* Undo buttons for approved/rejected */}
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
              <p className="text-sm font-medium text-gray-700 mb-2">Tips for best results:</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>Include dates, places, restaurants, and activities</li>
                <li>List items on separate lines</li>
                <li>Add times like "9:00 AM" for better organization</li>
              </ul>
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
            <button
              onClick={clearAll}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              New Upload
            </button>
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
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No {filter === 'all' ? '' : filter} items
          </div>
        ) : (
          filteredItems.map(item => (
            <ItemCard key={item.id} item={item} />
          ))
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
