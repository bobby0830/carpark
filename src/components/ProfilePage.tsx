import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemButton,
    Avatar,
    Divider,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField
} from '@mui/material';
import {
    DirectionsCar,
    History,
    AccountBalance,
    LocalOffer,
    LocalParking,
    Help,
    Settings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api, User } from '../services/api';

export const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
    const [newVehicle, setNewVehicle] = useState({ licensePlate: '', type: '' });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.getUser('user1');
                setUser(response.data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch user data:', err);
                setError('获取用户信息失败');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleAddVehicle = async () => {
        if (!user) return;
        try {
            await api.addVehicle(user.id, newVehicle);
            const response = await api.getUser(user.id);
            setUser(response.data);
            setVehicleDialogOpen(false);
            setNewVehicle({ licensePlate: '', type: '' });
        } catch (err) {
            console.error('Failed to add vehicle:', err);
        }
    };

    const menuItems = [
        { icon: <DirectionsCar />, text: '我的车辆', onClick: () => setVehicleDialogOpen(true) },
        { icon: <History />, text: '预约记录', onClick: () => navigate('/history') },
        { icon: <AccountBalance />, text: '我的钱包', onClick: () => navigate('/wallet') },
        { icon: <LocalOffer />, text: '优惠券', onClick: () => navigate('/coupons') },
        { icon: <LocalParking />, text: '常用停车场', onClick: () => navigate('/frequent-parking') },
        { icon: <Help />, text: '帮助中心', onClick: () => navigate('/help') },
        { icon: <Settings />, text: '设置', onClick: () => navigate('/settings') },
    ];

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !user) {
        return (
            <Box sx={{ p: 2, color: 'error.main' }}>
                <Typography>{error || '用户信息不可用'}</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 2 }}>
            {/* User Info Card */}
            <Paper 
                sx={{ 
                    p: 2, 
                    mb: 2, 
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    color: 'white'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar 
                        sx={{ 
                            width: 60, 
                            height: 60, 
                            bgcolor: 'white',
                            color: '#2196F3',
                            fontSize: '1.5rem'
                        }}
                    >
                        用户
                    </Avatar>
                    <Box sx={{ ml: 2 }}>
                        <Typography variant="h6">{user.name}</Typography>
                        <Typography variant="body2">{user.phone}</Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <Box>
                        <Typography variant="h6">{user.bookingCount}</Typography>
                        <Typography variant="body2">预约次数</Typography>
                    </Box>
                    <Box>
                        <Typography variant="h6">{user.coupons}</Typography>
                        <Typography variant="body2">优惠券</Typography>
                    </Box>
                    <Box>
                        <Typography variant="h6">¥{user.balance}</Typography>
                        <Typography variant="body2">账户余额</Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Menu List */}
            <Paper sx={{ mb: 2 }}>
                <List>
                    {menuItems.map((item, index) => (
                        <React.Fragment key={item.text}>
                            <ListItem disablePadding>
                                <ListItemButton onClick={item.onClick}>
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItemButton>
                            </ListItem>
                            {index < menuItems.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>

            {/* Add Vehicle Dialog */}
            <Dialog open={vehicleDialogOpen} onClose={() => setVehicleDialogOpen(false)}>
                <DialogTitle>添加车辆</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="车牌号"
                        fullWidth
                        value={newVehicle.licensePlate}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, licensePlate: e.target.value }))}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        label="车辆类型"
                        fullWidth
                        value={newVehicle.type}
                        onChange={(e) => setNewVehicle(prev => ({ ...prev, type: e.target.value }))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVehicleDialogOpen(false)}>取消</Button>
                    <Button onClick={handleAddVehicle} variant="contained">添加</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
