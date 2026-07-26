import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Store, Search, RefreshCw, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../../api/axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('students'); // 'students' | 'stocks' | 'coupons'
    const [students, setStudents] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'students') {
                const res = await api.get('/admin/students');
                if (res.data && res.data.success) {
                    setStudents(res.data.data || []);
                }
            } else if (activeTab === 'stocks') {
                const res = await api.get('/admin/stocks');
                if (res.data && res.data.success) {
                    setStocks(res.data.data || []);
                }
            } else if (activeTab === 'coupons') {
                const res = await api.get('/admin/coupons');
                if (res.data && res.data.success) {
                    setCoupons(res.data.data || []);
                }
            }
        } catch (err) {
            console.error('Admin API fetch failed:', err);
            setError('관리자 데이터 조회 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const filteredStudents = students.filter(s =>
        (s.name && s.name.includes(searchQuery)) ||
        (s.studentId && s.studentId.includes(searchQuery)) ||
        (s.className && s.className.includes(searchQuery))
    );

    const totalPointsSum = students.reduce((acc, cur) => acc + (cur.totalPoint || 0), 0);
    const avgPoints = students.length > 0 ? Math.round(totalPointsSum / students.length) : 0;

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
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((s) => (
                                            <tr key={s.id || s.studentId}>
                                                <td>#{s.id}</td>
                                                <td className="font-mono">{s.studentId}</td>
                                                <td className="font-bold">{s.name}</td>
                                                <td>{s.grade}학년 {s.className} {s.classNumber}번</td>
                                                <td className="font-bold text-accent">{s.totalPoint ? s.totalPoint.toLocaleString() : 0} P</td>
                                                <td>{s.totalCoupon || 0} 개</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="empty-row">조회된 학생 데이터가 없습니다.</td>
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
                                                    <span className="badge badge-success">
                                                        <CheckCircle2 size={14} /> 발행 중
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="empty-row">등록된 주식 종목이 없습니다.</td>
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.length > 0 ? (
                                        coupons.map((c) => (
                                            <tr key={c.couponId}>
                                                <td>#{c.couponId}</td>
                                                <td className="font-bold">{c.name}</td>
                                                <td className="font-bold text-accent">{c.price ? c.price.toLocaleString() : 0} P</td>
                                                <td>
                                                    <span className="badge badge-info">판매 중</span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="empty-row">등록된 쿠폰 상품이 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
