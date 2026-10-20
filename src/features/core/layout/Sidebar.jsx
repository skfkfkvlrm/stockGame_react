import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Newspaper, Wallet, Store, LogOut, ShieldCheck, Trophy, Ticket, Zap, RotateCcw } from 'lucide-react';
import { isSupabaseMode, supabase } from '../../../lib/supabaseClient';
import useAuthStore from '../../auth/store/useAuthStore';
import useMarketStore from '../../admin/store/useMarketStore';
import './Sidebar.css';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const fetchMe = useAuthStore((state) => state.fetchMe);
    const rechargeDemoPoints = useAuthStore((state) => state.rechargeDemoPoints);
    const resetDemoAccount = useAuthStore((state) => state.resetDemoAccount);
    const updateUserProfile = useAuthStore((state) => state.updateUserProfile);

    const marketOpen = useMarketStore((state) => state.marketOpen);
    const openTime = useMarketStore((state) => state.openTime);
    const closeTime = useMarketStore((state) => state.closeTime);
    const statusCode = useMarketStore((state) => state.statusCode);
    const fetchMarketStatus = useMarketStore((state) => state.fetchMarketStatus);

    const [isRecharging, setIsRecharging] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [rechargeNotice, setRechargeNotice] = useState(null);
    const [isPointFlashing, setIsPointFlashing] = useState(false);
    const prevPointRef = useRef(user?.totalPoint);

    useEffect(() => {
        fetchMe();
        fetchMarketStatus();
    }, [location.pathname]);

    // Supabase Realtime User Profile Subscription (글로벌 포인트 및 프로필 실시간 동기화)
    useEffect(() => {
        if (!isSupabaseMode || !user?.id) return;

        const channel = supabase
            .channel(`sidebar_profile_${user.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
                (payload) => {
                    if (payload?.new) {
                        updateUserProfile(payload.new);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, updateUserProfile]);

    // 포인트 변동 시각 피드백 효과 (Pulse animation)
    useEffect(() => {
        if (prevPointRef.current !== undefined && prevPointRef.current !== user?.totalPoint) {
            setIsPointFlashing(true);
            const timer = setTimeout(() => setIsPointFlashing(false), 1200);
            prevPointRef.current = user?.totalPoint;
            return () => clearTimeout(timer);
        }
        prevPointRef.current = user?.totalPoint;
    }, [user?.totalPoint]);

    const getMarketStatusLabel = () => {
        if (statusCode === 'HOLIDAY') return '주말 정기 휴장';
        if (statusCode === 'CLOSED') return `장 마감 (${openTime} 개장)`;
        if (statusCode === 'MANUAL_PAUSE') return '점검 중 (휴장)';
        return `정규장 운영중 (${openTime}~${closeTime})`;
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleResetDemo = async () => {
        if (isResetting || isRecharging) return;
        setIsResetting(true);
        setRechargeNotice(null);
        try {
            const result = await resetDemoAccount();
            if (result.success) {
                setRechargeNotice({ type: 'success', text: '🔄 1,000,000 P 초기화 완료!' });
                setTimeout(() => {
                    setRechargeNotice(null);
                }, 3500);
            } else {
                setRechargeNotice({ type: 'error', text: result.message || '리셋 실패' });
            }
        } catch (err) {
            setRechargeNotice({ type: 'error', text: '리셋 중 오류 발생' });
        } finally {
            setIsResetting(false);
        }
    };

    const handleRechargeDemo = async () => {
        if (isRecharging || isResetting) return;
        setIsRecharging(true);
        setRechargeNotice(null);
        try {
            const result = await rechargeDemoPoints(1000000);
            if (result.success) {
                setRechargeNotice({ type: 'success', text: '⚡ +1,000,000 P 추가 충전 완료!' });
                setTimeout(() => {
                    setRechargeNotice(null);
                }, 3500);
            } else {
                setRechargeNotice({ type: 'error', text: result.message || '충전 실패' });
            }
        } catch (err) {
            setRechargeNotice({ type: 'error', text: '충전 중 오류 발생' });
        } finally {
            setIsRecharging(false);
        }
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    if (!user) return <aside className="right-sidebar glass-panel"><div className="loading-spinner"></div></aside>;

    const isAdmin = user && (user.role === 'ROLE_ADMIN' || user.role === 'ROLE_MANAGER' || user.studentId === 'admin' || user.username === 'admin');
    const isDemoUser = user && (user.studentId === 'demo' || user.username === 'demo' || user.studentId === 'recruiter');

    return (
        <aside className="right-sidebar glass-panel">
            <div className="sidebar-header">
                <div className="brand-logo">📈 STKGAME</div>
            </div>

            <div className="user-profile">
                <div className="avatar">{user.name ? user.name.charAt(0) : 'U'}</div>
                <div className="user-details">
                    <h2 className="user-name">{user.name}</h2>
                    <p className="user-class">
                        {isAdmin ? '학급 최고 관리자' : `${user.grade || ''}학년 ${user.className ? (String(user.className).endsWith('반') ? user.className : user.className + '반') : ''} ${user.classNumber || ''}번`}
                    </p>
                </div>
            </div>

            <div className="point-card glass-panel">
                <div className="point-card-header">
                    <p className="point-label">보유 포인트</p>
                    {isDemoUser && <span className="demo-badge-pill">체험 모드</span>}
                </div>
                <h3 className={`point-amount ${isPointFlashing ? 'point-flash' : ''}`}>{user.totalPoint ? user.totalPoint.toLocaleString() : 0} <span className="currency">P</span></h3>
                {isDemoUser && (
                    <div className="demo-recharge-box">
                        <button
                            type="button"
                            className="btn-reset-demo"
                            onClick={handleResetDemo}
                            disabled={isResetting || isRecharging}
                            title="보유 주식/미체결 호가를 소거하고 100만 P로 완전 복구합니다"
                        >
                            <RotateCcw size={14} className={isResetting ? 'spin-icon' : ''} />
                            <span>{isResetting ? '초기화 중...' : '100만 P 초기화'}</span>
                        </button>
                        <button
                            type="button"
                            className="btn-recharge-demo"
                            onClick={handleRechargeDemo}
                            disabled={isResetting || isRecharging}
                            title="체험용 포인트를 100만 P 즉시 추가 충전합니다"
                        >
                            <Zap size={14} className={isRecharging ? 'spin-icon' : ''} />
                            <span>{isRecharging ? '충전 중...' : '+100만 P 추가 충전'}</span>
                        </button>
                        {rechargeNotice && (
                            <div className={`recharge-notice ${rechargeNotice.type}`}>
                                {rechargeNotice.text}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className={`market-status ${marketOpen ? 'open' : 'closed'}`}>
                <span className="status-dot"></span>
                <p>{getMarketStatusLabel()}</p>
            </div>

            <nav className="sidebar-menu">
                <button className={`menu-item ${isActive('/')}`} onClick={() => navigate('/')}>
                    <LayoutDashboard className="icon" size={20} /> 대시보드
                </button>
                <button className={`menu-item ${isActive('/stocks')}`} onClick={() => navigate('/stocks')}>
                    <TrendingUp className="icon" size={20} /> 주식 거래
                </button>
                <button className={`menu-item ${isActive('/ranking')}`} onClick={() => navigate('/ranking')}>
                    <Trophy className="icon" size={20} /> 실시간 랭킹
                </button>
                <button className={`menu-item ${isActive('/news')}`} onClick={() => navigate('/news')}>
                    <Newspaper className="icon" size={20} /> 시장 뉴스
                </button>
                <button className={`menu-item ${isActive('/points')}`} onClick={() => navigate('/points')}>
                    <Wallet className="icon" size={20} /> 포인트 변동 이력
                </button>
                <button className={`menu-item ${isActive('/coupons')}`} onClick={() => navigate('/coupons')}>
                    <Store className="icon" size={20} /> 쿠폰 상점
                </button>
                <button className={`menu-item ${isActive('/my-coupons')}`} onClick={() => navigate('/my-coupons')}>
                    <Ticket className="icon" size={20} /> 보유 쿠폰함
                </button>
                {isAdmin && (
                    <button className={`menu-item ${isActive('/admin')}`} onClick={() => navigate('/admin')}>
                        <ShieldCheck className="icon" size={20} /> 관리자 패널
                    </button>
                )}
            </nav>
            
            <div className="sidebar-footer">
                <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={18} /> 로그아웃
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
