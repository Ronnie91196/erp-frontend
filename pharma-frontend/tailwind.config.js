/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          dark: '#1E262B',        // Soft Graphite Charcoal (Calming, non-harsh sidebar)
          darker: '#161D21',      // Subdued container dark
          primary: '#2E7D68',     // Soothing Herbal Sage / Eucalyptus (Eye-friendly green)
          primaryHover: '#246554',// Gentle deep sage on hover
          accent: '#488585',      // Soft Muted Dusty Teal (No glaring bright cyan)
          surface: '#F4F6F5',     // Soothing Warm Matte Paper (Kills monitor glare completely)
          card: '#FFFFFF',        // Clean white for cards
          text: '#2D3748',        // Softer Slate (Zero black contrast)
          muted: '#718096',       // Soft muted gray
        },
      },
    },
  },
  plugins: [],
};
