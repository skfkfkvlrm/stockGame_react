import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Search, RefreshCw, Crown } from 'lucide-react';
import api from '../../../api/axios';
import useAuthStore from '../../auth/store/useAuthStore';
import './RankingList.css';

const RankingList = () => {
    const [rankings, setRankings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);
    const currentUser = useAuthStore((state) => state.user);

    const fetchRankings = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/members/ranking');
            if (res.data && res.data.success) {
                setRankings(res.data.data || []);
            } else if (Array.isArray(res.data)) {
                setRankings(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch rankings:', err);
            setError('실시간 랭킹 데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRankings();
    }, []);

    const filteredRankings = rankings.filter(r =>
        (r.name && r.name.includes(searchQuery)) ||
        (r.studentId && r.studentId.includes(searchQuery))
    );

    const topThree = rankings.slice(0, 3);
    const podiumOrder = [
        topThree[1], // 2등 (좌측)
        topThree[0], // 1등 (중앙)
        topThree[2]  // 3등 (우측)
    ].filter(Boolean);

    return (
        <div className="ranking-container">
            {/* Header */}
            <div className="ranking-header glass-panel">
                <div className="title-group">
                    <Trophy className="header-icon" size={32} />
                    <div>
                        <h1>🏆 실시간 전교생 랭킹 리더보드</h1>
                        <p className="subtitle">학생들의 자산 및 총 포인트를 실시간으로 비교하고 순위를 확인하세요.</p>
                    </div>
                </div>
                <button className="refresh-btn" onClick={fetchRankings} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> 새로고침
                </button>
            </div>

            {/* Top 3 Podium Section */}
            {topThree.length > 0 && (
                <div className="podium-section">
                    {podiumOrder.map((item) => {
                        const isFirst = item.rank === 1;
                        const isSecond = item.rank === 2;
                        const isThird = item.rank === 3;
                        const cardTheme = isFirst ? 'gold' : isSecond ? 'silver' : 'bronze';

                        return (
                            <div key={item.studentId} className={`podium-card glass-panel ${cardTheme} ${isFirst ? 'first-place' : ''}`}>
                                {isFirst && <Crown className="crown-icon" size={28} />}
                                <div className="rank-badge">
                                    {isFirst && <Trophy size={28} className="badge-icon gold-icon" />}
                                    {isSecond && <Medal size={26} className="badge-icon silver-icon" />}
                                    {isThird && <Award size={26} className="badge-icon bronze-icon" />}
                                    <span className="rank-title">{item.rank}위</span>
                                </div>
                                <div className="podium-avatar">{item.name ? item.name.charAt(0) : 'U'}</div>
                                <h3 className="podium-name">{item.name}</h3>
                                <p className="podium-info">{item.grade}학년 {item.className}반 {item.classNumber}번</p>
                                <div className="podium-point">
                                    {item.totalPoint ? item.totalPoint.toLocaleString() : 0} <span className="unit">P</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Full Ranking Table Section */}
            <div className="ranking-table-section glass-panel">
                <div className="table-filter-bar">
                    <div className="search-input-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="학생 이름 또는 학번 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <span className="count-label">총 {filteredRankings.length} 명 참여 중</span>
                </div>

                {loading ? (
                    <div className="loading-box"><div className="loading-spinner"></div></div>
                ) : (
                    <div className="table-responsive">
                        <table className="leaderboard-table">
                            <thead>
                                <tr>
                                    <th>순위</th>
                                    <th>학생 정보</th>
                                    <th>학번</th>
                                    <th>학년 / 반 / 번호</th>
                                    <th>총 보유 포인트</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRankings.length > 0 ? (
                                    filteredRankings.map((user) => {
                                        const isMe = currentUser?.studentId === user.studentId;
                                        return (
                                            <tr key={user.studentId} className={isMe ? 'my-row' : ''}>
                                                <td className="rank-cell">
                                                    {user.rank === 1 && <span className="rank-tag gold-tag">🥇 1위</span>}
                                                    {user.rank === 2 && <span className="rank-tag silver-tag">🥈 2위</span>}
                                                    {user.rank === 3 && <span className="rank-tag bronze-tag">🥉 3위</span>}
                                                    {user.rank > 3 && <span className="rank-number-tag">{user.rank}위</span>}
                                                </td>
                                                <td>
                                                    <div className="user-name-box">
                                                        <div className="avatar-mini">{user.name ? user.name.charAt(0) : 'U'}</div>
                                                        <span className="user-name-text">{user.name}</span>
                                                        {isMe && <span className="me-badge">나</span>}
                                                    </div>
                                                </td>
                                                <td className="font-mono">{user.studentId}</td>
                                                <td>{user.grade}학년 {user.className}반 {user.classNumber}번</td>
                                                <td className="point-text">{user.totalPoint ? user.totalPoint.toLocaleString() : 0} P</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="empty-cell">검색된 랭킹 정보가 없습니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RankingList;
