import React, { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';
import './PointsHistory.css';

const PointsHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await api.get('/api/history/');
            if (response.data.success) {
                setHistory(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch points history', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">포인트 내역을 불러오는 중입니다...</div>;

    return (
        <div className="history-page">
            <h2>내 포인트 내역</h2>
            <div className="table-responsive">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>일시</th>
                            <th>구분</th>
                            <th>변동 포인트</th>
                            <th>내용</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.length > 0 ? (
                            history.map(item => (
                                <tr key={item.id}>
                                    <td>{item.createdAt || item.date}</td>
                                    <td>
                                        <span className={`badge ${item.type === 'EARN' || item.amount > 0 ? 'earn' : 'spend'}`}>
                                            {item.type || (item.amount > 0 ? '입금' : '출금')}
                                        </span>
                                    </td>
                                    <td className={item.amount > 0 ? 'profit-up' : 'profit-down'}>
                                        {item.amount > 0 ? '+' : ''}{item.amount?.toLocaleString()} P
                                    </td>
                                    <td>{item.description}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="empty-message">포인트 내역이 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PointsHistory;
