import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './components/HomePage';
import { ParkingDetail } from './components/ParkingDetail';
import { BookingPage } from './components/BookingPage';
import { HistoryPage } from './components/HistoryPage';
import { ProfilePage } from './components/ProfilePage';
import { MapPage } from './components/MapPage';
import { SettingsPage } from './components/SettingsPage';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#2196F3',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ pb: 7 }}>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/parking/:id" element={<ParkingDetail />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/wallet" element={<ProfilePage />} />
            <Route path="/coupons" element={<ProfilePage />} />
            <Route path="/frequent-parking" element={<ProfilePage />} />
            <Route path="/help" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
          <BottomNav />
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
