import React, { useState, useEffect } from 'react';
import { 
    Box, 
    TextField, 
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    Button,
    Typography,
    Paper,
    Alert,
    Snackbar,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Booking } from '../services/api';
import dayjs from 'dayjs';

const generateTimeSlots = (startTime: dayjs.Dayjs) => {
    const slots: string[] = [];
    let currentSlot = startTime.add(1, 'hour').startOf('hour');
    const endOfDay = startTime.endOf('day');

    while (currentSlot.isBefore(endOfDay) || currentSlot.isSame(endOfDay)) {
        slots.push(currentSlot.format('HH:mm'));
        currentSlot = currentSlot.add(1, 'hour');
    }

    return slots;
};

export const BookingPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const now = dayjs();
    const [selectedEndTime, setSelectedEndTime] = useState<string | null>('');
    const [licensePlate, setLicensePlate] = useState('');
    const [bookingType, setBookingType] = useState<'充电' | '泊车'>('充电');
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'info'
    });

    const [queueInfo, setQueueInfo] = useState<{
        waitingCount: number;
        estimatedWaitTime: number;
        currentQueue: Array<{
            licensePlate: string;
            remainingTime: number;
            bookingType: '充电' | '泊车';
        }>;
    } | null>(null);

    // Fetch queue information
    useEffect(() => {
        const fetchQueueInfo = async () => {
            try {
                const queue = await api.getQueueInfo();
                setQueueInfo(queue);
            } catch (error) {
                console.error('Failed to fetch queue info:', error);
            }
        };

        fetchQueueInfo();
        const interval = setInterval(fetchQueueInfo, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, [bookingType]); // Refresh when booking type changes

    const refreshQueueInfo = async () => {
        try {
            const queue = await api.getQueueInfo();
            setQueueInfo(queue);
        } catch (error) {
            console.error('Failed to fetch queue info:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEndTime || !licensePlate) return;

        try {
            const bookingTime = now.format();
            const endTime = now.format(`YYYY-MM-DD[T]${selectedEndTime}:00`);

            // 自动匹配车位
            const availableSpot = await api.findAvailableSpot(
                bookingTime,
                endTime,
                bookingType === '充电'
            );

            if (!availableSpot) {
                // 如果没有可用车位，加入等候队列
                await api.joinQueue({
                    userId: 'user1',
                    licensePlate,
                    queueStartTime: now.format(),
                    queueNumber: 0,
                    estimatedWaitTime: 0,
                    bookingType
                });

                // Refresh queue info after joining
                await refreshQueueInfo();

                setSnackbar({
                    open: true,
                    message: '当前无可用车位，已加入等候队列',
                    severity: 'info'
                });
                return;
            }

            // 创建预约
            const booking: Omit<Booking, 'id'> = {
                userId: 'user1',
                spotId: availableSpot.id,
                licensePlate,
                status: bookingType === '充电' ? '准备充电' as const : '只是泊车' as const,
                bookingTime: now.format(),
                endTime
            };

            const bookingResponse = await api.createBooking(booking);

            // 更新停车位状态
            await api.updateParkingSpot(availableSpot.id, {
                status: booking.status,
                currentUser: 'user1',
                startTime: booking.bookingTime,
                estimatedEndTime: booking.endTime
            });

            // 如果是充电预约，加入等候队列
            if (bookingType === '充电') {
                await api.joinQueue({
                    userId: 'user1',
                    licensePlate,
                    queueNumber: 1,
                    estimatedWaitTime: 30,
                    queueStartTime: dayjs().format(),
                    bookingType
                });
            }

            setSnackbar({
                open: true,
                message: `预约成功！已为您安排${availableSpot.spotNumber}号车位`,
                severity: 'success'
            });

            // 延迟导航，让用户看到成功消息
            setTimeout(() => {
                navigate('/history');
            }, 1500);

        } catch (error) {
            console.error('Booking failed:', error);
            setSnackbar({
                open: true,
                message: '预约失败，请重试',
                severity: 'error'
            });
        }
    };

    return (
        <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    预约停车
                </Typography>
                <form onSubmit={handleSubmit}>
                    {/* 当前时间显示 */}
                    <Typography variant="subtitle1" gutterBottom>
                        当前时间：{now.format('YYYY-MM-DD HH:mm')}
                    </Typography>

                    {/* 结束时间选择 */}
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>选择结束时间</InputLabel>
                        <Select
                            value={selectedEndTime}
                            label="选择结束时间"
                            onChange={(e) => setSelectedEndTime(e.target.value)}
                        >
                            {generateTimeSlots(now).map((time) => (
                                <MenuItem key={time} value={time}>
                                    {time}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    {/* Queue Information */}
                    {queueInfo && (
                        <Box sx={{ mt: 3, mb: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                等候队列信息
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary">
                                当前{bookingType === '充电' ? '充电' : '停车'}等候人数：
                                {queueInfo.currentQueue.filter(q => q.bookingType === bookingType).length}人
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                                预计等候时间：{queueInfo.estimatedWaitTime}分钟
                            </Typography>

                            {queueInfo.currentQueue.length > 0 && (
                                <List dense sx={{ mt: 1 }}>
                                    {queueInfo.currentQueue
                                        .filter(q => q.bookingType === bookingType)
                                        .map((item, index) => (
                                            <ListItem key={item.licensePlate}>
                                                <ListItemText
                                                    primary={`车牌号：${item.licensePlate}`}
                                                    secondary={`剩余等候时间：${item.remainingTime}分钟`}
                                                />
                                            </ListItem>
                                        ))}
                                </List>
                            )}
                        </Box>
                    )}

                    {selectedEndTime && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {bookingType === '充电' ? '充电时长' : '停车时长'}：
                            {dayjs(`${now.format('YYYY-MM-DD')} ${selectedEndTime}`).diff(now, 'hour')}小时
                        </Typography>
                    )}

                    {/* 预约类型选择 */}
                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel>预约类型</InputLabel>
                        <Select
                            value={bookingType}
                            label="预约类型"
                            onChange={(e) => setBookingType(e.target.value as '充电' | '泊车')}
                        >
                            <MenuItem value="充电">充电</MenuItem>
                            <MenuItem value="泊车">泊车</MenuItem>
                        </Select>
                    </FormControl>

                    {/* 车牌号码输入 */}
                    <TextField
                        fullWidth
                        label="车牌号码"
                        value={licensePlate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLicensePlate(e.target.value)}
                        sx={{ mb: 3 }}
                    />

                    <Button 
                        type="submit"
                        variant="contained" 
                        fullWidth
                        disabled={!selectedEndTime || !licensePlate}
                        sx={{ mt: 2 }}
                    >
                        确认预约
                    </Button>
                </form>
            </Paper>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};
