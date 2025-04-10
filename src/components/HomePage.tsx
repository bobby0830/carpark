import React, { useState } from 'react';
import { 
    Box, 
    List, 
    ListItem, 
    ListItemText, 
    TextField, 
    Chip,
    Typography,
    Paper,
    Button
} from '@mui/material';
import { LocationOn } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ParkingLot } from '../types';

// Mock data
const mockParkingLots: ParkingLot[] = [
    {
        id: '1',
        name: '中央商务区停车场',
        distance: 500,
        availableSpots: 15,
        chargingSpots: 5,
        operatingHours: '24小时',
        queueLength: 3,
        estimatedWaitTime: 15
    },
    // Add more mock data as needed
];

export const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [parkingLots] = useState<ParkingLot[]>(mockParkingLots);

    const filteredParkingLots = parkingLots.filter(lot =>
        lot.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Box sx={{ pb: 7, maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ p: 2 }}>
                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={() => navigate('/booking')}
                    sx={{ mb: 3 }}
                >
                    立即预约
                </Button>
                <TextField
                    fullWidth
                    placeholder="搜索停车场"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ mb: 2 }}
                />
                <List>
                    {filteredParkingLots.map((lot) => (
                        <Paper 
                            key={lot.id} 
                            elevation={1} 
                            sx={{ mb: 2 }}
                            onClick={() => navigate(`/parking/${lot.id}`)}
                        >
                            <ListItem>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="subtitle1">{lot.name}</Typography>
                                            <Chip 
                                                label={lot.availableSpots > 0 ? "可用" : "已满"} 
                                                color={lot.availableSpots > 0 ? "success" : "error"}
                                                size="small"
                                            />
                                        </Box>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                            <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                                            <Typography variant="body2" color="text.secondary">
                                                {lot.distance}米
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </ListItem>
                        </Paper>
                    ))}
                </List>
            </Box>
        </Box>
    );
};
