import React, { useEffect, useState } from 'react';
import { 
    Box, 
    Paper, 
    Typography, 
    List, 
    ListItem, 
    ListItemText,
    Chip,
    CircularProgress
} from '@mui/material';
import { api, Booking } from '../services/api';
import dayjs from 'dayjs';

// Mock data
// const mockBookings: Booking[] = [
//     {
//         id: '1',
//         parkingLotId: '1',
//         date: '2025-04-09',
//         timeSlot: '10:00',
//         licensePlate: '粤B12345',
//         status: 'confirmed'
//     },
//     {
//         id: '2',
//         parkingLotId: '2',
//         date: '2025-04-08',
//         timeSlot: '14:00',
//         licensePlate: '粤B12345',
//         status: 'completed'
//     },
//     {
//         id: '3',
//         parkingLotId: '1',
//         date: '2025-04-07',
//         timeSlot: '09:00',
//         licensePlate: '粤B12345',
//         status: 'cancelled'
//     }
// ];

const getStatusColor = (status: Booking['status']) => {
    switch (status) {
        case '充电中':
            return 'success';
        case '准备充电':
            return 'warning';
        case '只是泊车':
            return 'info';
        case '未充电':
            return 'default';
        default:
            return 'default';
    }
};

const getStatusText = (status: Booking['status']) => {
    switch (status) {
        case '充电中':
            return '充电中';
        case '准备充电':
            return '等待充电';
        case '只是泊车':
            return '停车中';
        case '未充电':
            return '未使用';
        default:
            return '未知状态';
    }
};

export const HistoryPage: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBookings = async () => {
        try {
            // 在实际应用中，这里应该使用真实的用户ID
            const response = await api.getUserBookings('user1');
            setBookings(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch bookings:', err);
            setError('获取预约记录失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
        // 每30秒刷新一次数据
        const interval = setInterval(fetchBookings, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 2, color: 'error.main' }}>
                <Typography>{error}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    预约记录
                </Typography>
                {bookings.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        暂无预约记录
                    </Typography>
                ) : (
                    <List>
                        {bookings.map((booking) => (
                            <ListItem
                                key={booking.id}
                                sx={{
                                    border: '1px solid #eee',
                                    borderRadius: 1,
                                    mb: 1,
                                    flexDirection: 'column',
                                    alignItems: 'flex-start'
                                }}
                            >
                                <Box sx={{ 
                                    width: '100%', 
                                    display: 'flex', 
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 1
                                }}>
                                    <Typography variant="subtitle1">
                                        {dayjs(booking.bookingTime).format('YYYY年MM月DD日 HH:mm')}
                                    </Typography>
                                    <Chip
                                        label={getStatusText(booking.status)}
                                        color={getStatusColor(booking.status)}
                                        size="small"
                                    />
                                </Box>
                                <ListItemText
                                    primary={`车牌号：${booking.licensePlate}`}
                                    secondary={`预计结束时间：${dayjs(booking.endTime).format('HH:mm')}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>
        </Box>
    );
};
