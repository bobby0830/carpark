import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
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
    {
        id: '2',
        name: '城市广场停车场',
        distance: 800,
        availableSpots: 25,
        chargingSpots: 8,
        operatingHours: '24小时',
        queueLength: 1,
        estimatedWaitTime: 5
    }
];

export const MapPage: React.FC = () => {
    return (
        <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    附近停车场地图
                </Typography>
                {/* 在实际应用中，这里会集成地图SDK，比如高德地图或百度地图 */}
                <Box
                    sx={{
                        width: '100%',
                        height: '400px',
                        bgcolor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 1,
                        mb: 2
                    }}
                >
                    <Typography color="text.secondary">
                        地图加载中...
                    </Typography>
                </Box>
                <Typography variant="subtitle2" gutterBottom>
                    附近停车场：
                </Typography>
                {mockParkingLots.map(lot => (
                    <Box key={lot.id} sx={{ mb: 1 }}>
                        <Typography variant="body2">
                            {lot.name} - {lot.distance}米
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            可用车位: {lot.availableSpots} | 充电桩: {lot.chargingSpots}个
                        </Typography>
                    </Box>
                ))}
            </Paper>
        </Box>
    );
};
