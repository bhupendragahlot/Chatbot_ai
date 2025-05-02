//backend/server.js
import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Groq } from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI);

const horoscopeSchema = new mongoose.Schema({
  sessionId: String,
  data: Object,
  name: String,
  date: Date,
  time: String,
  latitude: Number,
  longitude: Number,
  createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 hour
});
const Horoscope = mongoose.model("Horoscope", horoscopeSchema);

// Groq client setup
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.get("/api/places/autocomplete", async (req, res) => {
  try {
    const { input } = req.query;
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
      {
        params: {
          input,
          key: API_KEY
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch places" });
  }
});

app.get("/api/places/geocode", async (req, res) => {
  try {
    const { placeId } = req.query;
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json`,
      {
        params: {
          place_id: placeId,
          key: API_KEY
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch coordinates" });
  }
});

// New endpoint for horoscope data
app.post("/api/horoscope", async (req, res) => {
  try {
    const {
      name,
      date,
      time,
      latitude,
      longitude,
      timezone,
      sessionId,
      language = "en"
    } = req.body;

    // Fetch horoscope data from Jyotisham API
    const url = `https://api.jyotishamastroapi.com/api/horoscope/planet-details?date=${date}&time=${time}&latitude=${latitude}&longitude=${longitude}&tz=${timezone}&lang=${language}`;

    const response = await axios.get(url, {
      headers: {
        key: process.env.JYOTI_SHAM_API_KEY,
        "Content-Type": "application/json"
      }
    });

    // Store in MongoDB with session ID
    const horoscope = new Horoscope({
      sessionId,
      data: response.data,
      name: name,
      date: new Date(date),
      time: time,
      latitude: latitude,
      longitude: longitude
    });
    await horoscope.save();
    // console.log("api horadcope:", horoscope );
    res.json({ success: true, sessionId });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch horoscope data" });
  }
});





/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////





// backend/server.js (updated chat endpoint)
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Get horoscope data from MongoDB
    const horoscope = await Horoscope.findOne({ sessionId });
    if (!horoscope) return res.status(404).json({ error: "Session not found" });

    // Calculate user's age
    const birthDate = new Date(horoscope.date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    // Determine age group
    let ageGroup = "";
    if (age <= 3) ageGroup = "0-3";
    else if (age <= 18) ageGroup = "3-18";
    else if (age <= 35) ageGroup = "18-35";
    else if (age <= 60) ageGroup = "35-60";
    else ageGroup = "60+";

    // Construct dynamic prompt
    const prompt = `
      You are "Babaji AI", a compassionate astrologer with expertise in Vedic and Western astrology. 
      User Profile:
      - Name: ${horoscope.name}
      - Age: ${age} (${ageGroup} group)
      - Birth Chart: ${JSON.stringify(horoscope.data)}
      
      Guidelines:
      1. ${getAgeSpecificGuidance(ageGroup)}
      2. ${handleMarriageQueries(message, age)}
      3. Focus on possibilities, not absolutes
      4. Maintain warm, empathetic tone in ${horoscope.data?.lang || "en"}
      
      Current Query: "${message}"
      
      Craft response under 50 words using these steps:
      a. Acknowledge query with empathy
      b. Relate to planetary positions
      c. Suggest possible paths
      d. Encourage proactive choices
      `;

    // Get response from Groq
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: prompt },
        { role: "system", content: "responce only hindi" },
        { role: "user", content: message }
      ],
      model: "llama3-70b-8192",
      temperature: 0.5,
      max_tokens: 500
    });

    res.json({ response: chatCompletion.choices[0].message.content });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Helper functions
function getAgeSpecificGuidance(ageGroup) {
  const guidance = {
    "0-3":
      "Focus on health and future potential. Use simple, hopeful language suitable for parents.",
    "3-18":
      "Emphasize education and growth opportunities. Encourage exploration of interests.",
    "18-35":
      "Discuss career, relationships, and personal development. Suggest balanced approaches.",
    "35-60":
      "Highlight experience and life balance. Focus on sustainable growth.",
    "60+": "Emphasize wisdom and legacy. Use respectful, reassuring tone."
  };
  return guidance[ageGroup] || "Provide general astrological insights.";
}

function handleMarriageQueries(message, age) {
  const marriageKeywords = ["marriage", "wedding", "spouse", "relationship"];
  if (!marriageKeywords.some((kw) => message.toLowerCase().includes(kw)))
    return "";

  return age < 18
    ? "Note legal age restrictions. Suggest focusing on personal growth first."
    : "Analyze 7th house and Venus position. Discuss compatible qualities rather than timing.";
}








/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Endpoint to clear data
app.delete("/api/session/:sessionId", async (req, res) => {
  try {
    await Horoscope.deleteOne({ sessionId: req.params.sessionId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear session data" });
  }
});

const PORT = process.env.PORT || 2025;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
