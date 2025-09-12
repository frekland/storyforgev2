// token-utils.js
import { jwtDecode } from "jwt-decode";
import pkceChallenge from "pkce-challenge";

// A unique key for storing tokens in localStorage
export const storageKey = "YOTO_STORYFORGE_TOKENS";

const clientId = import.meta.env.VITE_CLIENT_ID;
const tokenUrl = "https://login.yotoplay.com/oauth/token";

export const getStoredTokens = () => {
    const tokensRaw = localStorage.getItem(storageKey);
    return tokensRaw ? JSON.parse(tokensRaw) : null;
};

export const storeTokens = (accessToken, refreshToken) => {
    localStorage.setItem(storageKey, JSON.stringify({ accessToken, refreshToken }));
};

export const clearTokens = () => {
    localStorage.removeItem(storageKey);
};

export const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const decodedToken = jwtDecode(token);
        return Date.now() >= (decodedToken.exp ?? 0) * 1000;
    } catch (error) {
        return true;
    }
};

export const refreshTokens = async (refreshToken) => {
    const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: clientId,
            refresh_token: refreshToken,
            audience: "https://api.yotoplay.com",
        }).toString(),
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Refresh token request failed:", tokenResponse.status, errorText);
        throw new Error("Failed to refresh token");
    }
    
    const tokenData = await tokenResponse.json();
    return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
    };
};