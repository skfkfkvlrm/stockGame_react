import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, TrendingUp, Store, Search, RefreshCw, ShieldCheck, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import api from '../../../api/axios';
import useMarketStore from '../store/useMarketStore';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.tab || 'students'); // 'students' | 'stocks' | 'coupons'
    const [students, setStudents] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab);
        }
    }, [location.state]);

    const marketOpen = useMarketStore((state) => state.marketOpen);
    const fetchMarketStatus = useMarketStore((state) => state.fetchMarketStatus);
    const toggleMarketStatus = useMarketStore((state) => state.toggleMarketStatus);

    useEffect(() => {
        fetchMarketStatus();
    }, []);

    const handleToggleMarket = async () => {
        try {
            const isOpen = await toggleMarketStatus();
            alert(`주식 시장이 [${isOpen ? '개장' : '휴장'}] 상태로 변경되었습니다.`);
        } catch (err) {
            alert('시장 상태 변경 실패');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [studentsRes, stocksRes, couponsRes] = await Promise.all([
                api.get('/admin/students').catch(() => ({ data: { data: [] } })),
                api.get('/admin/stocks').catch(() => ({ data: { data: [] } })),
                api.get('/admin/coupons').catch(() => ({ data: { data: [] } }))
            ]);

            setStudents(studentsRes.data?.data || []);
            setStocks(stocksRes.data?.data || []);
            setCoupons(couponsRes.data?.data || []);
        } catch (err) {
            console.error('Admin API fetch failed:', err);
            setError('관리자 데이터 조회 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredStudents = students.filter(s =>
        (s.name && s.name.includes(searchQuery)) ||
        (s.studentId && s.studentId.includes(searchQuery)) ||
        (s.className && s.className.includes(searchQuery))
    );

    const totalPointsSum = students.reduce((acc, cur) => acc + (cur.totalPoint || 0), 0);
    const avgPoints = students.length > 0 ? Math.round(totalPointsSum / students.length) : 0;

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [pointModalStudent, setPointModalStudent] = useState(null);
    const [pointType, setPointType] = useState('add'); // 'add' | 'subtract'
    const [pointAmount, setPointAmount] = useState('');
    const [pointReason, setPointReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studentDetailData, setStudentDetailData] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [stockModal, setStockModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', stock: st }
    const [stockForm, setStockForm] = useState({ name: '', content: '', publicationPrice: '', publicationBalance: '' });

    const [couponModal, setCouponModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', coupon: c }
    const [couponForm, setCouponForm] = useState({ name: '', price: '', status: 'ON_SALE' });

    const handleOpenCouponModal = (coupon = null) => {
        if (coupon) {
            setCouponModal({ mode: 'edit', coupon });
            setCouponForm({
                name: coupon.name || '',
                price: coupon.price || '',
                status: coupon.status || 'ON_SALE'
            });
        } else {
            setCouponModal({ mode: 'create' });
            setCouponForm({ name: '', price: '', status: 'ON_SALE' });
        }
    };

    const handleSaveCoupon = async (e) => {
        e.preventDefault();
        if (!couponForm.name || !couponForm.price) {
            alert('모든 필드를 입력해 주세요.');
            return;
        }

        if (Number(couponForm.price) <= 0) {
            alert('쿠폰 판매 가격은 1P 이상이어야 합니다.');
            return;
        }

        try {
            if (couponModal.mode === 'create') {
                await api.post('/admin/coupons', {
                    name: couponForm.name,
                    price: Number(couponForm.price),
                    status: couponForm.status
                });
                alert('신규 쿠폰 상품이 성공적으로 등록되었습니다!');
            } else {
                const targetId = couponModal.coupon.couponId || couponModal.coupon.id;
                await api.put(`/admin/coupons/${targetId}`, {
                    name: couponForm.name,
                    price: Number(couponForm.price),
                    status: couponForm.status
                });
                alert('쿠폰 상품 정보가 성공적으로 수정되었습니다!');
            }
            setCouponModal(null);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || '쿠폰 정보 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteCoupon = async (coupon) => {
        const targetId = coupon.couponId || coupon.id;
        if (!window.confirm(`정말로 '${coupon.name}' 쿠폰 상품을 삭제하시겠습니까?`)) {
            return;
        }

        try {
            await api.delete(`/admin/coupons/${targetId}`);
            alert(`'${coupon.name}' 쿠폰 상품이 삭제되었습니다.`);
            fetchData();
        } catch (err) {
            alert('쿠폰 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleOpenStockModal = (stock = null) => {
        if (stock) {
            setStockModal({ mode: 'edit', stock });
            setStockForm({
                name: stock.name || '',
                content: stock.content || '',
                publicationPrice: stock.publicationPrice || '',
                publicationBalance: stock.publicationBalance || '',
                status: stock.status || 'LISTED'
            });
        } else {
            setStockModal({ mode: 'create' });
            setStockForm({ name: '', content: '', publicationPrice: '', publicationBalance: '', status: 'LISTED' });
        }
    };

    const handleSaveStock = async (e) => {
        e.preventDefault();
        if (!stockForm.name || !stockForm.publicationPrice || !stockForm.publicationBalance) {
            alert('모든 필드를 입력해 주세요.');
            return;
        }

        try {
            if (stockModal.mode === 'create') {
                await api.post('/admin/stocks', {
                    name: stockForm.name,
                    content: stockForm.content,
                    publicationPrice: Number(stockForm.publicationPrice),
                    publicationBalance: Number(stockForm.publicationBalance),
                    status: stockForm.status
                });
                alert('신규 주식 종목이 성공적으로 상장되었습니다!');
            } else {
                const targetId = stockModal.stock.stockId || stockModal.stock.id;
                await api.put(`/admin/stocks/${targetId}`, {
                    name: stockForm.name,
                    content: stockForm.content,
                    publicationPrice: Number(stockForm.publicationPrice),
                    publicationBalance: Number(stockForm.publicationBalance),
                    status: stockForm.status
                });
                alert('주식 종목 정보가 성공적으로 수정되었습니다!');
            }
            setStockModal(null);
            fetchData();
        } catch (err) {
            alert('주식 정보 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteStock = async (stock) => {
        if (!window.confirm(`정말로 '${stock.name}' 주식 종목을 상장폐지(삭제)하시겠습니까?`)) {
            return;
        }

        try {
            await api.delete(`/admin/stocks/${stock.stockId}`);
            alert(`'${stock.name}' 종목이 상장폐지(삭제)되었습니다.`);
            fetchData();
        } catch (err) {
            alert('주식 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleOpenPointModal = (student) => {
        setPointModalStudent(student);
        setPointType('add');
        setPointAmount('');
        setPointReason('');
    };

    const handleAdjustPoint = async (e) => {
        e.preventDefault();
        if (!pointAmount || isNaN(pointAmount) || Number(pointAmount) <= 0) {
            alert('올바른 포인트 금액을 입력해 주세요.');
            return;
        }

        const finalAmount = pointType === 'add' ? Number(pointAmount) : -Number(pointAmount);
        setIsSubmitting(true);

        try {
            await api.post(`/admin/students/${pointModalStudent.studentId}/point`, {
                amount: finalAmount,
                reason: pointReason
            });
            alert(`${pointModalStudent.name} 학생에게 포인트 ${pointType === 'add' ? '지급' : '차감'}이 완료되었습니다.`);
            setPointModalStudent(null);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || '포인트 반영에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenDetailModal = async (student) => {
        setSelectedStudent(student);
        setDetailLoading(true);
        try {
            const res = await api.get(`/admin/students/${student.studentId}/detail`);
            setStudentDetailData(res.data?.data?.dashboard || null);
        } catch (err) {
            console.error('Failed to fetch student detail:', err);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="admin-container">
            {/* Header Title */}
            <div className="admin-header glass-panel">
                <div className="admin-title-box">
                    <ShieldCheck className="admin-icon" size={28} />
                    <div>
                        <h1>교사 / 관리자 전용 대시보드</h1>
                        <p className="admin-subtitle">학생 포인트, 종목 발행 잔량 및 쿠폰 상품 관리를 수행합니다.</p>
                    </div>
                </div>
                <button className="refresh-btn" onClick={fetchData} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> 새로고침
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="admin-tabs">
                <button
                    className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => setActiveTab('students')}
                >
                    <Users size={18} /> 학생 관리 ({students.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'stocks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('stocks')}
                >
                    <TrendingUp size={18} /> 주식 종목 관리 ({stocks.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
                    onClick={() => setActiveTab('coupons')}
                >
                    <Store size={18} /> 쿠폰 상품 관리 ({coupons.length})
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="admin-error-banner glass-panel">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Tab 1: Students Management */}
            {activeTab === 'students' && (
                <div className="tab-content">
                    <div className="metrics-grid">
                        <div className="metric-card glass-panel">
                            <span className="metric-label">총 등록 학생 수</span>
                            <h2 className="metric-value">{students.length} <span className="unit">명</span></h2>
                        </div>
                        <div className="metric-card glass-panel">
                            <span className="metric-label">학생 총 보유 포인트 Sum</span>
                            <h2 className="metric-value">{totalPointsSum.toLocaleString()} <span className="unit">P</span></h2>
                        </div>
                        <div className="metric-card glass-panel">
                            <span className="metric-label">학생 평균 보유 포인트</span>
                            <h2 className="metric-value">{avgPoints.toLocaleString()} <span className="unit">P</span></h2>
                        </div>
                    </div>

                    <div className="table-header-bar glass-panel">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="이름, 학번, 반 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <span className="table-count">검색 결과: {filteredStudents.length} 명</span>
                    </div>

                    <div className="table-container glass-panel">
                        {loading ? (
                            <div className="loading-box"><div className="loading-spinner"></div></div>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>학번</th>
                                        <th>이름</th>
                                        <th>학년 / 반 / 번호</th>
                                        <th>총 보유 포인트</th>
                                        <th>보유 쿠폰 수</th>
                                        <th>관리 액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((s) => (
                                            <tr key={s.id || s.studentId}>
                                                <td>#{s.id}</td>
                                                <td className="font-mono">{s.studentId}</td>
                                                <td className="font-bold">{s.name}</td>
                                                <td>{s.grade}학년 {s.className && s.className.includes('반') ? s.className : `${s.className || ''}반`} {s.classNumber}번</td>
                                                <td className="font-bold text-accent">{s.totalPoint ? s.totalPoint.toLocaleString() : 0} P</td>
                                                <td>{s.totalCoupon || 0} 개</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            style={{ padding: '6px 12px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                            onClick={() => handleOpenPointModal(s)}
                                                        >
                                                            포인트 관리
                                                        </button>
                                                        <button 
                                                            style={{ padding: '6px 12px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                            onClick={() => handleOpenDetailModal(s)}
                                                        >
                                                            상세보기
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="empty-row">조회된 학생 데이터가 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 2: Stocks Management */}
            {activeTab === 'stocks' && (
                <div className="tab-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '16px 24px', background: '#ffffff', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b' }}>시장 상태:</span>
                            <span className={`badge ${marketOpen ? 'badge-success' : 'badge-danger'}`} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                {marketOpen ? '🟢 실시간 개장 중' : '🔴 장 휴장 중'}
                            </span>
                            <button 
                                onClick={handleToggleMarket}
                                style={{ padding: '6px 14px', background: marketOpen ? '#ef4444' : '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                            >
                                {marketOpen ? '🔒 장 휴장하기' : '🔓 시장 개장하기'}
                            </button>
                        </div>
                        <button 
                            onClick={() => handleOpenStockModal(null)}
                            style={{ padding: '10px 18px', background: '#0284c7', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            ➕ 신규 종목 상장
                        </button>
                    </div>

                    <div className="table-container glass-panel">
                        {loading ? (
                            <div className="loading-box"><div className="loading-spinner"></div></div>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>종목 ID</th>
                                        <th>종목명</th>
                                        <th>업종 / 설명</th>
                                        <th>최초 발행 가격</th>
                                        <th>현재 발행 잔량</th>
                                        <th>상태</th>
                                        <th>관리 액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stocks.length > 0 ? (
                                        stocks.map((st) => (
                                            <tr key={st.stockId}>
                                                <td>#{st.stockId}</td>
                                                <td className="font-bold">{st.name}</td>
                                                <td>{st.content}</td>
                                                <td className="font-bold">{st.publicationPrice ? st.publicationPrice.toLocaleString() : 0} 원</td>
                                                <td className="font-bold text-highlight">{st.publicationBalance ? st.publicationBalance.toLocaleString() : 0} 주</td>
                                                <td>
                                                    {st.status === 'SUSPENDED' ? (
                                                        <span className="badge badge-warning" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#f59e0b', color: '#ffffff' }}>
                                                            🟡 거래 정지
                                                        </span>
                                                    ) : st.status === 'DELISTED' ? (
                                                        <span className="badge badge-danger" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#ef4444', color: '#ffffff' }}>
                                                            🔴 상장 폐지
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-success" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#10b981', color: '#ffffff' }}>
                                                            🟢 정상 거래 중
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            style={{ padding: '6px 12px', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                            onClick={() => handleOpenStockModal(st)}
                                                        >
                                                            ✏️ 수정
                                                        </button>
                                                        <button 
                                                            style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                            onClick={() => handleDeleteStock(st)}
                                                        >
                                                            🗑️ 삭제
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="empty-row">등록된 주식 종목이 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 3: Coupons Management */}
            {activeTab === 'coupons' && (
                <div className="tab-content">
                    <div className="table-header-bar glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>🎫 등록된 쿠폰 상품 목록</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>학생 상점에서 구매 가능한 쿠폰 상품을 관리합니다.</p>
                        </div>
                        <button 
                            className="refresh-btn" 
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none' }}
                            onClick={() => handleOpenCouponModal()}
                        >
                            <Plus size={16} /> 신규 쿠폰 등록
                        </button>
                    </div>

                    <div className="table-container glass-panel">
                        {loading ? (
                            <div className="loading-box"><div className="loading-spinner"></div></div>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>쿠폰 ID</th>
                                        <th>쿠폰 상품명</th>
                                        <th>판매 가격</th>
                                        <th>발행 상태</th>
                                        <th>관리 액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.length > 0 ? (
                                        coupons.map((c) => (
                                            <tr key={c.couponId || c.id}>
                                                <td>#{c.couponId || c.id}</td>
                                                <td className="font-bold">{c.name}</td>
                                                <td className="font-bold text-accent">{c.price ? c.price.toLocaleString() : 0} P</td>
                                                <td>
                                                    {c.status === 'PAUSED' ? (
                                                        <span className="badge badge-warning" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#f59e0b', color: '#ffffff' }}>
                                                            🟡 판매 일시중지
                                                        </span>
                                                    ) : c.status === 'SOLD_OUT' ? (
                                                        <span className="badge badge-danger" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#ef4444', color: '#ffffff' }}>
                                                            🔴 품절 / 마감
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-info" style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', background: '#10b981', color: '#ffffff' }}>
                                                            🟢 정상 판매 중
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            style={{ padding: '6px 12px', background: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                            onClick={() => handleOpenCouponModal(c)}
                                                        >
                                                            ✏️ 수정
                                                        </button>
                                                        <button 
                                                            style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                                                            onClick={() => handleDeleteCoupon(c)}
                                                        >
                                                            🗑️ 삭제
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="empty-row">등록된 쿠폰 상품이 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* 1. Point Management Modal */}
            {pointModalStudent && (
                <div className="modal-overlay" onClick={() => setPointModalStudent(null)} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{
                        background: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
                    }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
                            💰 {pointModalStudent.name} 학생 포인트 관리
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
                            학번: {pointModalStudent.studentId} | 현재 포인트: <strong>{pointModalStudent.totalPoint?.toLocaleString()} P</strong>
                        </p>

                        <form onSubmit={handleAdjustPoint}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>작업 구분</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button 
                                        type="button"
                                        onClick={() => setPointType('add')}
                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: pointType === 'add' ? '2px solid #8b5cf6' : '1px solid #cbd5e1', background: pointType === 'add' ? 'rgba(139, 92, 246, 0.1)' : '#f8fafc', color: pointType === 'add' ? '#8b5cf6' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        ➕ 포인트 지급 (+)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setPointType('subtract')}
                                        style={{ flex: 1, padding: '10px', borderRadius: '8px', border: pointType === 'subtract' ? '2px solid #ef4444' : '1px solid #cbd5e1', background: pointType === 'subtract' ? 'rgba(239, 68, 68, 0.1)' : '#f8fafc', color: pointType === 'subtract' ? '#ef4444' : '#64748b', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        ➖ 포인트 차감 (-)
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>조정 금액 (P)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    placeholder="예: 5000" 
                                    value={pointAmount}
                                    onChange={(e) => setPointAmount(e.target.value < 0 ? '' : e.target.value)}
                                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>지급/차감 사유</label>
                                <input 
                                    type="text" 
                                    placeholder="예: 퀴즈 1등 보상, 수업 태도 우수" 
                                    value={pointReason}
                                    onChange={(e) => setPointReason(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setPointModalStudent(null)}
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: pointType === 'add' ? '#8b5cf6' : '#ef4444', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    {isSubmitting ? '처리 중...' : '적용하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Student Detail Modal */}
            {selectedStudent && (
                <div className="modal-overlay" onClick={() => setSelectedStudent(null)} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{
                        background: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '560px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
                    }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>
                            📊 {selectedStudent.name} 학생 상세 포트폴리오
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
                            학번: {selectedStudent.studentId} | {selectedStudent.grade}학년 {selectedStudent.className}
                        </p>

                        {detailLoading ? (
                            <div className="loading-box"><div className="loading-spinner"></div></div>
                        ) : (
                            <div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>보유 포인트:</span>
                                        <strong style={{ color: '#0284c7', fontSize: '1.1rem' }}>{studentDetailData?.totalPoint?.toLocaleString() || 0} P</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>총 자산 평가액:</span>
                                        <strong style={{ color: '#1e293b', fontSize: '1.1rem' }}>{studentDetailData?.totalAsset?.toLocaleString() || 0} P</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>누적 투자 수익률:</span>
                                        <strong style={{ color: (studentDetailData?.totalProfit || 0) >= 0 ? '#ef4444' : '#3b82f6', fontSize: '1rem' }}>
                                            {(studentDetailData?.totalProfit || 0) >= 0 ? '+' : ''}{studentDetailData?.totalProfit?.toLocaleString() || 0} P
                                        </strong>
                                    </div>
                                </div>

                                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>보유 주식 목록</h3>
                                {studentDetailData?.myStocks && studentDetailData.myStocks.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '180px', overflowY: 'auto' }}>
                                        {studentDetailData.myStocks.map((stock, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{stock.stockName}</span>
                                                <span style={{ color: '#475569', fontSize: '0.9rem' }}>{stock.amount} 주 ({stock.currentPrice?.toLocaleString()} 원)</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>보유 중인 주식이 없습니다.</p>
                                )}

                                <div style={{ textAlign: 'right' }}>
                                    <button 
                                        onClick={() => setSelectedStudent(null)}
                                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        닫기
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 3. Stock Create / Edit Modal */}
            {stockModal && (
                <div className="modal-overlay" onClick={() => setStockModal(null)} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{
                        background: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
                    }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }}>
                            {stockModal.mode === 'create' ? '📈 신규 주식 종목 상장' : '✏️ 주식 종목 정보 수정'}
                        </h2>

                        <form onSubmit={handleSaveStock}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>종목명</label>
                                <input 
                                    type="text" 
                                    placeholder="예: 네이버, 카카오" 
                                    value={stockForm.name}
                                    onChange={(e) => setStockForm({ ...stockForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>업종 및 종목 설명</label>
                                <input 
                                    type="text" 
                                    placeholder="예: 대한민국 대표 포털 IT 기업" 
                                    value={stockForm.content}
                                    onChange={(e) => setStockForm({ ...stockForm, content: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>최초 발행 가격 (원)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    placeholder="예: 15000" 
                                    value={stockForm.publicationPrice}
                                    onChange={(e) => setStockForm({ ...stockForm, publicationPrice: e.target.value < 0 ? '' : e.target.value })}
                                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>현재/최초 발행 잔량 (주)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    placeholder="예: 1000" 
                                    value={stockForm.publicationBalance}
                                    onChange={(e) => setStockForm({ ...stockForm, publicationBalance: e.target.value < 0 ? '' : e.target.value })}
                                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>발행 / 거래 상태</label>
                                <select 
                                    value={stockForm.status}
                                    onChange={(e) => setStockForm({ ...stockForm, status: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', background: '#ffffff' }}
                                >
                                    <option value="LISTED">🟢 정상 거래 중</option>
                                    <option value="SUSPENDED">🟡 거래 정지</option>
                                    <option value="DELISTED">🔴 상장 폐지</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setStockModal(null)}
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    취소
                                </button>
                                <button 
                                    type="submit" 
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    {stockModal.mode === 'create' ? '상장하기' : '수정하기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. Coupon Create / Edit Modal */}
            {couponModal && (
                <div className="modal-overlay" onClick={() => setCouponModal(null)} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{
                        background: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '440px', width: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
                    }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '16px' }}>
                            {couponModal.mode === 'create' ? '🎫 신규 쿠폰 상품 등록' : '✏️ 쿠폰 상품 정보 수정'}
                        </h2>

                        <form onSubmit={handleSaveCoupon}>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>쿠폰 상품명</label>
                                <input 
                                    type="text" 
                                    placeholder="예: 청소당번 면제, 자리 뺏기" 
                                    value={couponForm.name}
                                    onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>판매 가격 (P)</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    placeholder="예: 3000" 
                                    value={couponForm.price}
                                    onChange={(e) => setCouponForm({ ...couponForm, price: e.target.value < 0 ? '' : e.target.value })}
                                    onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>발행 / 판매 상태</label>
                                <select 
                                    value={couponForm.status}
                                    onChange={(e) => setCouponForm({ ...couponForm, status: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', background: '#ffffff' }}
                                >
                                    <option value="ON_SALE">🟢 정상 판매 중</option>
                                    <option value="PAUSED">🟡 판매 일시중지</option>
                                    <option value="SOLD_OUT">🔴 품절 / 마감</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setCouponModal(null)}
                                    style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    취소
                                </button>
                                <button 
                                    type="submit" 
                                    style={{ padding: '10px 22px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    {couponModal.mode === 'create' ? '등록 완료' : '수정 완료'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
