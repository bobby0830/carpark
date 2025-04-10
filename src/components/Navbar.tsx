import React from 'react';
import { AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const getPageTitle = (pathname: string) => {
        switch (pathname) {
            case '/':
                return '停车场列表';
            case '/profile':
                return '个人中心';
            case '/history':
                return '预约记录';
            case '/map':
                return '地图';
            case '/wallet':
                return '我的钱包';
            case '/coupons':
                return '优惠券';
            case '/frequent-parking':
                return '常用停车场';
            case '/help':
                return '帮助中心';
            case '/settings':
                return '设置';
            default:
                if (pathname.startsWith('/parking/')) {
                    return '停车场详情';
                }
                if (pathname.startsWith('/booking/')) {
                    return '预约停车';
                }
                return '停车管理';
        }
    };

    const showBackButton = location.pathname !== '/';

    return (
        <AppBar position="sticky">
            <Toolbar>
                {showBackButton && (
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={() => navigate(-1)}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBack />
                    </IconButton>
                )}
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    {getPageTitle(location.pathname)}
                </Typography>
            </Toolbar>
        </AppBar>
    );
};
