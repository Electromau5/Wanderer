import React, { useState, useEffect } from 'react';
import { Upload, Calendar, MapPin, Clock, Utensils, Bed, FileText, Plus, X, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

const Wanderer = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawContent, setRawContent] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  // Load saved data on mount
  useEffect(() => {
    const saved = localStorage.getItem('wanderer-data');
    if (saved) {
      const data = JSON.parse(saved);
      setParsedData(data.parsedData);
      setRawContent(data.rawContent || '');
    }
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (parsedData) {
      localStorage.setItem('wanderer-data', JSON.stringify({ parsedData, rawContent }));
    }
  }, [parsedData, rawContent]);

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

  const parseDocument = (content) => {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);

    // Initialize parsed structure
    const data = {
      title: '',
      dates: '',
      destination: '',
      accommodation: [],
      activities: [],
      dining: [],
      transportation: [],
      notes: []
    };

    // Simple parsing logic - looks for common patterns
    let currentSection = 'notes';

    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();

      // Try to detect destination/title from first few lines
      if (index < 3 && !data.title && line.length > 3 && line.length < 100) {
        if (!line.includes(':') || lowerLine.includes('trip') || lowerLine.includes('itinerary')) {
          data.title = line;
          return;
        }
      }

      // Detect dates
      const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\w+\s+\d{1,2},?\s+\d{4})|(\d{4}-\d{2}-\d{2})/gi;
      const dateMatch = line.match(datePattern);
      if (dateMatch && !data.dates) {
        data.dates = line;
        return;
      }

      // Detect section headers
      if (lowerLine.includes('hotel') || lowerLine.includes('stay') || lowerLine.includes('accommodation') || lowerLine.includes('airbnb') || lowerLine.includes('hostel')) {
        currentSection = 'accommodation';
        if (line.includes(':')) {
          const value = line.split(':').slice(1).join(':').trim();
          if (value) data.accommodation.push({ text: value, type: 'accommodation' });
        }
        return;
      }

      if (lowerLine.includes('restaurant') || lowerLine.includes('food') || lowerLine.includes('eat') || lowerLine.includes('dining') || lowerLine.includes('breakfast') || lowerLine.includes('lunch') || lowerLine.includes('dinner') || lowerLine.includes('cafe') || lowerLine.includes('coffee')) {
        currentSection = 'dining';
        if (line.includes(':')) {
          const value = line.split(':').slice(1).join(':').trim();
          if (value) data.dining.push({ text: value, type: 'dining' });
        } else if (!lowerLine.endsWith(':')) {
          data.dining.push({ text: line, type: 'dining' });
        }
        return;
      }

      if (lowerLine.includes('flight') || lowerLine.includes('train') || lowerLine.includes('bus') || lowerLine.includes('transport') || lowerLine.includes('taxi') || lowerLine.includes('uber') || lowerLine.includes('car rental')) {
        currentSection = 'transportation';
        data.transportation.push({ text: line, type: 'transport' });
        return;
      }

      if (lowerLine.includes('visit') || lowerLine.includes('see') || lowerLine.includes('activity') || lowerLine.includes('activities') || lowerLine.includes('museum') || lowerLine.includes('park') || lowerLine.includes('beach') || lowerLine.includes('tour') || lowerLine.includes('explore')) {
        currentSection = 'activities';
        if (!lowerLine.endsWith(':')) {
          data.activities.push({ text: line, type: 'activity' });
        }
        return;
      }

      // Detect day markers
      if (lowerLine.match(/^day\s*\d+/i) || lowerLine.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)) {
        data.activities.push({ text: line, type: 'day-marker' });
        currentSection = 'activities';
        return;
      }

      // Add to current section
      if (line.length > 2) {
        switch (currentSection) {
          case 'accommodation':
            data.accommodation.push({ text: line, type: 'accommodation' });
            break;
          case 'dining':
            data.dining.push({ text: line, type: 'dining' });
            break;
          case 'transportation':
            data.transportation.push({ text: line, type: 'transport' });
            break;
          case 'activities':
            data.activities.push({ text: line, type: 'activity' });
            break;
          default:
            data.notes.push({ text: line, type: 'note' });
        }
      }
    });

    // Extract destination from title if not found
    if (!data.destination && data.title) {
      data.destination = data.title;
    }

    setParsedData(data);
    setExpandedSections({
      activities: true,
      dining: true,
      accommodation: true,
      transportation: true,
      notes: true
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const removeItem = (section, index) => {
    setParsedData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  };

  const addItem = (section) => {
    const newItem = { text: '', type: section === 'dining' ? 'dining' : section === 'accommodation' ? 'accommodation' : section === 'transportation' ? 'transport' : section === 'activities' ? 'activity' : 'note', isEditing: true };
    setParsedData(prev => ({
      ...prev,
      [section]: [...prev[section], newItem]
    }));
  };

  const updateItem = (section, index, newText) => {
    setParsedData(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === index ? { ...item, text: newText, isEditing: false } : item
      )
    }));
  };

  const startEditing = (section, index) => {
    setParsedData(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === index ? { ...item, isEditing: true } : item
      )
    }));
  };

  const clearAll = () => {
    setUploadedFile(null);
    setRawContent('');
    setParsedData(null);
    localStorage.removeItem('wanderer-data');
  };

  const SectionCard = ({ title, icon: Icon, items, section, color }) => {
    const isExpanded = expandedSections[section];
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      gray: 'bg-gray-50 border-gray-200 text-gray-700'
    };
    const headerColors = {
      blue: 'bg-blue-600',
      orange: 'bg-orange-600',
      purple: 'bg-purple-600',
      green: 'bg-green-600',
      gray: 'bg-gray-600'
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection(section)}
          className={`w-full px-5 py-4 flex items-center justify-between ${headerColors[color]} text-white`}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" />
            <span className="font-semibold">{title}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">{items.length}</span>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {isExpanded && (
          <div className="p-4">
            {items.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No items yet</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li key={index} className={`flex items-start gap-2 p-3 rounded-lg border ${colorClasses[color]}`}>
                    <GripVertical className="w-4 h-4 mt-0.5 opacity-40 cursor-grab" />
                    {item.isEditing ? (
                      <input
                        type="text"
                        defaultValue={item.text}
                        autoFocus
                        onBlur={(e) => updateItem(section, index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateItem(section, index, e.target.value);
                          }
                        }}
                        className="flex-1 bg-white px-2 py-1 rounded border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span
                        className="flex-1 text-sm cursor-pointer"
                        onClick={() => startEditing(section, index)}
                      >
                        {item.text || <span className="italic text-gray-400">Click to edit</span>}
                      </span>
                    )}
                    <button
                      onClick={() => removeItem(section, index)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => addItem(section)}
              className="mt-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add item
            </button>
          </div>
        )}
      </div>
    );
  };

  // Upload screen
  if (!parsedData) {
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
                <li>Use clear section headers like "Hotels", "Restaurants", "Activities"</li>
                <li>List items on separate lines</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Parsed data view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {parsedData.title || 'My Trip'}
              </h1>
              {parsedData.dates && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Calendar className="w-4 h-4" />
                  {parsedData.dates}
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <SectionCard
          title="Activities"
          icon={MapPin}
          items={parsedData.activities}
          section="activities"
          color="blue"
        />

        <SectionCard
          title="Dining"
          icon={Utensils}
          items={parsedData.dining}
          section="dining"
          color="orange"
        />

        <SectionCard
          title="Accommodation"
          icon={Bed}
          items={parsedData.accommodation}
          section="accommodation"
          color="purple"
        />

        <SectionCard
          title="Transportation"
          icon={Clock}
          items={parsedData.transportation}
          section="transportation"
          color="green"
        />

        <SectionCard
          title="Notes"
          icon={FileText}
          items={parsedData.notes}
          section="notes"
          color="gray"
        />

        {/* Raw content preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('raw')}
            className="w-full px-5 py-4 flex items-center justify-between bg-gray-100 text-gray-700"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <span className="font-semibold">Original Document</span>
            </div>
            {expandedSections.raw ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {expandedSections.raw && (
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
