import React, { useEffect, useState } from 'react';
import { 
    Box, 
    Paper, 
    Typography, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow,
    Chip,
    CircularProgress,
    Button
} from '@mui/material';
import { api, ParkingSpot, QueueItem, calculateActualWaitTime } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

// Add duration plugin to dayjs
dayjs.extend(duration);

const getStatusColor = (status: ParkingSpot['status']) => {
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

const calculateWaitTime = (spot: ParkingSpot): string => {
    if (spot.status === '未充电') {
        return '立即可用';
    }
    
    if (!spot.estimatedEndTime) {
        return '等待中';
    }

    const now = dayjs();
    const endTime = dayjs(spot.estimatedEndTime);
    
    if (endTime.isBefore(now)) {
        return '即将可用';
    }
    
    const waitMinutes = endTime.diff(now, 'minute');
    
    if (waitMinutes > 24 * 60) {
        return '等待时间过长';
    }
    
    if (waitMinutes > 60) {
        const hours = Math.floor(waitMinutes / 60);
        const minutes = waitMinutes % 60;
        return `${hours}小时${minutes}分钟`;
    }
    
    return `${waitMinutes}分钟`;
};

export const ParkingDetail: React.FC = () => {
    useParams<{ id: string }>();
    const navigate = useNavigate();
    const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
    const [waitingQueue, setWaitingQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [spotsResponse, queueResponse] = await Promise.all([
                api.getParkingSpots(),
                api.getWaitingQueue()
            ]);
            setParkingSpots(spotsResponse.data);
            setWaitingQueue(queueResponse.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('获取数据失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // 每30秒刷新一次数据
        const interval = setInterval(fetchData, 30000);
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

    // 计算停车场状态统计
    const stats = parkingSpots.reduce((acc, spot) => {
        if (spot.status === '充电中') acc.charging++;
        if (spot.status === '准备充电') acc.waiting++;
        if (spot.status === '只是泊车' || spot.status === '未充电') acc.available++;
        return acc;
    }, { charging: 0, waiting: 0, available: 0 });

    // 计算当前等待人数和实际等待时间
    const chargingWaitCount = waitingQueue.length;
    const waitingTimes = waitingQueue.map(item => ({
        licensePlate: item.licensePlate,
        waitTime: calculateActualWaitTime(item.queueStartTime)
    }));
    const longestWaitTime = waitingTimes.length > 0
        ? Math.max(...waitingTimes.map(item => item.waitTime))
        : 0;

    return (
        <Box sx={{ p: 2 }}>
            {/* 等候队列状态 */}
            <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: '#E3F2FD' }}>
                <Typography variant="h6" gutterBottom>
                    当前排队状态
                </Typography>
                <Box sx={{ mb: 1 }}>
                    <Typography variant="body1">
                        充电等待：{chargingWaitCount}人
                    </Typography>
                    {waitingTimes.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                等候时间：
                            </Typography>
                            {waitingTimes.map((item, index) => (
                                <Typography key={index} variant="body2" color="text.secondary">
                                    {item.licensePlate}: {item.waitTime}分钟
                                </Typography>
                            ))}
                            <Typography variant="body2" sx={{ mt: 1, color: 'primary.main' }}>
                                最长等候：{longestWaitTime}分钟
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* 停车场状态 */}
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    停车场状态
                </Typography>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1">
                        🚗 总车位：{parkingSpots.length} 可用：{stats.available}
                    </Typography>
                    <Typography variant="body1">
                        ⚡ 充电中：{stats.charging} 等待充电：{stats.waiting}
                    </Typography>
                </Box>
            </Paper>

            {/* 实时车位状态 */}
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    实时车位状态
                </Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>车位号</TableCell>
                                <TableCell>状态</TableCell>
                                <TableCell>预计等待</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {parkingSpots.map((spot) => (
                                <TableRow key={spot.id}>
                                    <TableCell>{spot.spotNumber}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={spot.status}
                                            color={getStatusColor(spot.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{calculateWaitTime(spot)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* 预约按钮 */}
            <Button 
                variant="contained" 
                fullWidth 
                onClick={() => navigate('/booking')}
                sx={{ mt: 2 }}
            >
                立即预约
            </Button>
        </Box>
    );
};
