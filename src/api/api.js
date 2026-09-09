import axios from "axios";

const api = axios.create({
    baseURL: "https://voice-annoucement-backend.onrender.com/",
    // baseURL: "https://voice-annoucement-backend.vercel.app/",
    // baseURL: "http://localhost:3000",
});

export default api;