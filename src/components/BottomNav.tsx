import React from 'react';
import { 
    BottomNavigation, 
    BottomNavigationAction, 
    Paper 
} from '@mui/material';
import { 
    Home,
    Map,
    History,
    Person
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

export const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const getCurrentValue = () => {
        const path = location.pathname;
        if (path === '/') return 0;
        if (path === '/map') return 1;
        if (path === '/history') return 2;
        if (path === '/profile' || path.startsWith('/wallet') || path.startsWith('/coupons') || 
            path.startsWith('/frequent-parking') || path.startsWith('/help') || path.startsWith('/settings')) {
            return 3;
        }
        return 0;
    };

    return (
        <Paper 
            sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} 
            elevation={3}
        >
            <BottomNavigation
                showLabels
                value={getCurrentValue()}
                onChange={(_, newValue) => {
                    switch(newValue) {
                        case 0:
                            navigate('/');
                            break;
                        case 1:
                            navigate('/map');
                            break;
                        case 2:
                            navigate('/history');
                            break;
                        case 3:
                            navigate('/profile');
                            break;
                    }
                }}
            >
                <BottomNavigationAction label="首页" icon={<Home />} />
                <BottomNavigationAction label="地图" icon={<Map />} />
                <BottomNavigationAction label="记录" icon={<History />} />
                <BottomNavigationAction label="我的" icon={<Person />} />
            </BottomNavigation>
        </Paper>
    );
};
