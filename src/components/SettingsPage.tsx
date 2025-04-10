import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Switch,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    Button,
    Snackbar,
    Alert
} from '@mui/material';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
    const [devMode, setDevMode] = useState(false);
    const [debugDialog, setDebugDialog] = useState(false);
    const [systemState, setSystemState] = useState<any>(null);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info' | 'warning';
    }>({ open: false, message: '', severity: 'info' });

    const fetchSystemState = async () => {
        try {
            const [parkingSpots, bookings, waitingQueue] = await Promise.all([
                api.getParkingSpots(),
                api.getAllBookings(),
                api.getWaitingQueue()
            ]);

            setSystemState({
                parkingSpots: parkingSpots.data,
                bookings: bookings.data,
                waitingQueue: waitingQueue.data,
                lastUpdated: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to fetch system state:', error);
        }
    };

    useEffect(() => {
        if (devMode) {
            fetchSystemState();
            // Refresh every 5 seconds in dev mode
            const interval = setInterval(fetchSystemState, 5000);
            return () => clearInterval(interval);
        }
    }, [devMode]);

    const handleDevModeToggle = () => {
        setDevMode(!devMode);
        if (!devMode) {
            setDebugDialog(true);
        }
    };

    return (
        <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert 
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    设置
                </Typography>
                <List>
                    <ListItem>
                        <ListItemText 
                            primary="开发者模式"
                            secondary="显示系统详细状态和调试信息"
                        />
                        <ListItemSecondaryAction>
                            <Switch
                                edge="end"
                                checked={devMode}
                                onChange={handleDevModeToggle}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                    {devMode && (
                        <ListItem>
                            <ListItemText
                                primary="清除所有记录"
                                secondary="重置所有预约和停车位状态"
                            />
                            <ListItemSecondaryAction>
                                <Button 
                                    variant="contained" 
                                    color="error"
                                    onClick={async () => {
                                        try {
                                            await api.clearHistory();
                                            await fetchSystemState();
                                            setSnackbar({
                                                open: true,
                                                message: '所有记录已清除',
                                                severity: 'success'
                                            });
                                        } catch (error) {
                                            console.error('Failed to clear history:', error);
                                            setSnackbar({
                                                open: true,
                                                message: '清除失败，请重试',
                                                severity: 'error'
                                            });
                                        }
                                    }}
                                >
                                    清除
                                </Button>
                            </ListItemSecondaryAction>
                        </ListItem>
                    )}
                    <Divider />
                </List>
            </Paper>

            {devMode && systemState && (
                <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        系统状态
                        <Typography variant="caption" sx={{ ml: 2 }}>
                            最后更新: {new Date(systemState.lastUpdated).toLocaleString()}
                        </Typography>
                    </Typography>
                    
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                        停车位状态:
                    </Typography>
                    {systemState.parkingSpots.map((spot: any) => (
                        <Box key={spot.id} sx={{ mb: 1 }}>
                            <Typography variant="body2">
                                {spot.spotNumber} - 状态: {spot.status}
                                {spot.currentUser && ` | 用户: ${spot.currentUser}`}
                                {spot.startTime && ` | 开始: ${new Date(spot.startTime).toLocaleTimeString()}`}
                                {spot.estimatedEndTime && ` | 结束: ${new Date(spot.estimatedEndTime).toLocaleTimeString()}`}
                            </Typography>
                        </Box>
                    ))}

                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                        当前预约:
                    </Typography>
                    {systemState.bookings.map((booking: any) => (
                        <Box key={booking.id} sx={{ mb: 1 }}>
                            <Typography variant="body2">
                                ID: {booking.id} | 车位: {booking.spotId} | 
                                车牌: {booking.licensePlate} | 
                                时间: {new Date(booking.bookingTime).toLocaleString()}
                            </Typography>
                        </Box>
                    ))}

                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                        等候队列:
                    </Typography>
                    {systemState.waitingQueue.length === 0 ? (
                        <Typography variant="body2">当前无等候</Typography>
                    ) : (
                        systemState.waitingQueue.map((item: any) => (
                            <Box key={item.id} sx={{ mb: 1 }}>
                                <Typography variant="body2">
                                    车牌: {item.licensePlate} | 
                                    队列号: {item.queueNumber} | 
                                    预计等待: {item.estimatedWaitTime}分钟
                                </Typography>
                            </Box>
                        ))
                    )}
                </Paper>
            )}

            <Dialog open={debugDialog} onClose={() => setDebugDialog(false)}>
                <DialogTitle>开发者模式已启用</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        系统将每5秒自动刷新状态信息，包括：
                        - 所有停车位实时状态
                        - 当前预约记录
                        - 等候队列信息
                    </DialogContentText>
                    <Button 
                        onClick={() => setDebugDialog(false)}
                        fullWidth 
                        variant="contained" 
                        sx={{ mt: 2 }}
                    >
                        确定
                    </Button>
                </DialogContent>
            </Dialog>
        </Box>
    );
};
