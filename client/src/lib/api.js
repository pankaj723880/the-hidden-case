import axios from "axios";
import toast from "react-hot-toast";

let accessToken = null;

export function setApiAccessToken(token) {
  accessToken = token;
}

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL ?? "http://localhost:5001",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429 && !error.config?.suppressRateLimitToast) {
      const retryAfter = error.response.headers?.["retry-after"] || 60;
      toast.error(`Rate limit reached. Please wait ${retryAfter} seconds.`, {
        id: "rate-limit",
      });
    }
    return Promise.reject(error);
  },
);
