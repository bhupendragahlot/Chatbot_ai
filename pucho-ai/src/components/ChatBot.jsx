

// fronend/src/components/ChatBot.jsx
import React, { useState, useEffect } from 'react';
import { Send, User, Bot, Sun, Moon, Calendar, Clock, MapPin } from 'lucide-react';

const BirthChartForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    latitude: '',
    longitude: ''
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleLocationChange = async (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, location: value }));
    
    if (value.length > 2) {
      try {
        const response = await fetch(
          `http://localhost:2025/api/places/autocomplete?input=${encodeURIComponent(value)}`
        );
        const data = await response.json();
        setSuggestions(data.predictions || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching places:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = async (placeId) => {
    try {
      const response = await fetch(
        `http://localhost:2025/api/places/geocode?placeId=${placeId}`
      );
      const data = await response.json();
      const location = data.results[0];
      
      setFormData(prev => ({
        ...prev,
        location: location.formatted_address,
        latitude: location.geometry.location.lat,
        longitude: location.geometry.location.lng
      }));
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error fetching coordinates:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
        Enter Birth Details
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            required
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="date"
                required
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <div className="relative">
              <Clock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="time"
                required
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              required
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={formData.location}
              onChange={handleLocationChange}
              placeholder="Enter birth place"
            />
          </div>
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.place_id}
                  className="p-3 hover:bg-purple-50 cursor-pointer transition-colors"
                  onClick={() => handleSuggestionSelect(suggestion.place_id)}
                >
                  {suggestion.description}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg transform transition-all duration-300 hover:scale-102"
        >
          Start Chat
        </button>
      </form>
    </div>
  );
};

const ChatBot = () => {
  const [showForm, setShowForm] = useState(true);
  const [birthData, setBirthData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      if (sessionId) {
        fetch(`http://localhost:2025/api/session/${sessionId}`, { method: 'DELETE' });
      }
    };
  }, [sessionId]);

  const sendMessage = async (messageText) => {
    // New function to send messages to the API
    try {
      const response = await fetch('http://localhost:2025/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          sessionId: sessionId,
          name: birthData?.name,
          date: birthData?.date,
          time: birthData?.time,
          latitude: birthData?.latitude,
          longitude: birthData?.longitude
        })
      });
    
      const data = await response.json();
      setMessages(prev => [...prev, {
        text: data.response,
        sender: 'bot',
        id: Date.now()
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        text: "Sorry, I encountered an error. Please try again.",
        sender: 'bot',
        id: Date.now()
      }]);
    }
  };

  const handleBirthDataSubmit = async (data) => {
    try {
      const session = Date.now().toString();
      const response = await fetch('http://localhost:2025/api/horoscope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          timezone: '5.5', // You might want to calculate this dynamically
          sessionId: session
        })
      });
      
      if (response.ok) {
        setSessionId(session);
        setBirthData(data);
        setShowForm(false);
        setMessages([{
          text: `🙏 Namaste! I'm Babaji Ai. How may I assist you today?`,
          sender: 'bot',
          id: Date.now()
        }]);
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }

    // Automatically send birth details message
    const autoMessage = `My name is ${data.name}, I was born on ${data.date} at ${data.time} in ${data.location}. Please analyze my birth chart.`;
    setMessages(prev => [...prev, {
      text: autoMessage,
      sender: 'user',
      id: Date.now()
    }]);

    // Wait a moment before sending the auto message to the API
    setTimeout(() => {
      sendMessage(autoMessage);
    }, 1000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      text: input,
      sender: 'user',
      id: Date.now()
    };
    
    setMessages([...messages, newMessage]);
    setInput('');
    await sendMessage(input);
  };

  if (showForm) {
    return (
      <div className={`min-h-screen py-12 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 to-pink-50'}`}>
        <BirthChartForm onSubmit={handleBirthDataSubmit} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 to-pink-50'} transition-colors duration-500`}>
      <div className="max-w-4xl w-full mx-auto p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 ${isDark ? 'drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]' : ''}`}>
                Babaji AI
              </h1>
              {birthData && (
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Birth Chart Analysis for {birthData.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? <Sun className="w-6 h-6 text-gray-300" /> : <Moon className="w-6 h-6 text-gray-600" />}
          </button>
        </div>

        <div className="flex-1 overflow-auto space-y-6 mb-4 scroll-smooth">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`flex items-start space-x-3 max-w-[80%] animate-slideIn transform transition-all duration-300 hover:scale-102 ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-l-2xl rounded-br-2xl' 
                    : `${isDark ? 'bg-gray-800 text-white' : 'bg-white'} border rounded-r-2xl rounded-bl-2xl`
                } p-6 shadow-lg hover:shadow-xl`}
              >
                {message.sender === 'bot' && (
                  <Bot className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                )}
                <p className="text-base leading-relaxed">{message.text}</p>
                {message.sender === 'user' && (
                  <User className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your birth chart..."
            className={`w-full p-6 rounded-full border-2 focus:outline-none focus:ring-4 transition-all duration-300 ${
              isDark 
                ? 'bg-gray-800 text-white border-gray-700 focus:ring-purple-900' 
                : 'bg-white border-purple-100 focus:ring-purple-100'
            }`}
          />
          <button 
            type="submit"
            className="absolute right-2 top-2 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:shadow-lg transform transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;