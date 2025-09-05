// Shared configuration that can be used by both frontend and backend
export const MAP_SERVICE: 'google' | 'openstreet' = process.env.MAP_SERVICE === 'openstreet' ? 'openstreet' : 'google';