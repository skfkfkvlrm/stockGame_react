import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import api from '../../../api/axios';
import './StockList.css';

const StockList = () => {
    const navigate = useNavigate();
    const [stocks, setStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStocks = async () => {
            try {
                const response = await api.get('/stock');
                setStocks(response.data.data);
            } catch (err) {
                setError('주식 목록을 불러오는 데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchStocks();
    }, []);

    if (isLoading) return <div className="stock-list-container"><div className="loading-spinner">로딩 중...</div></div>;
    if (error) return <div className="stock-list-container"><div className="error-msg">{error}</div></div>;

    return (
        <div className="stock-list-container">
            <header className="page-header">
                <h1 className="page-title">주식 시장</h1>
                <p className="page-subtitle">실시간 종목 시세를 확인하고 매매를 진행하세요.</p>
            </header>

            <div className="market-overview">
                <div className="glass-panel overview-card">
                    <div className="overview-header">
                        <h3>KOSPI</h3>
                        <TrendingUp size={20} className="profit-up" />
                    </div>
                    <div className="index-value profit-up">2,750.24</div>
                    <div className="index-change profit-up">+12.45 (+0.45%)</div>
                </div>
                <div className="glass-panel overview-card">
                    <div className="overview-header">
                        <h3>KOSDAQ</h3>
                        <TrendingDown size={20} className="profit-down" />
                    </div>
                    <div className="index-value profit-down">845.12</div>
                    <div className="index-change profit-down">-3.20 (-0.38%)</div>
                </div>
            </div>

            <div className="stock-table-wrapper glass-panel">
                <table className="stock-table">
                    <thead>
                        <tr>
                            <th>종목명 (코드)</th>
                            <th>현재가</th>
                            <th>전일대비</th>
                            <th>등락률</th>
                            <th>거래량</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stocks.map(stock => {
                            const isUp = stock.change > 0;
                            const isDown = stock.change < 0;
                            const colorClass = isUp ? 'profit-up' : isDown ? 'profit-down' : '';
                            const sign = isUp ? '+' : '';

                            return (
                                <tr key={stock.id} onClick={() => navigate(`/stocks/${stock.id}`)}>
                                    <td>
                                        <div className="stock-info">
                                            <div className="stock-icon-small">{stock.name.charAt(0)}</div>
                                            <div className="stock-name-wrapper">
                                                <span className="stock-name">{stock.name}</span>
                                                <span className="stock-code">{stock.code}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={colorClass}>{stock.price.toLocaleString()}</td>
                                    <td className={colorClass}>
                                        {sign}{stock.change.toLocaleString()}
                                    </td>
                                    <td className={colorClass}>
                                        <div className="flex-right">
                                            {isUp ? <TrendingUp size={14} /> : isDown ? <TrendingDown size={14} /> : ''}
                                            {sign}{stock.changeRate.toFixed(2)}%
                                        </div>
                                    </td>
                                    <td>{stock.volume.toLocaleString()}</td>
                                    <td>
                                        <button 
                                            className="trade-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/stocks/${stock.id}`);
                                            }}
                                        >
                                            매매 <ArrowRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockList;
