import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import api from '../../../api/axios';
import './StockList.css';

const StockList = () => {
    const navigate = useNavigate();
    const [stocks, setStocks] = useState([]);
    const [marketIndices, setMarketIndices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStocks = async () => {
            try {
                const [stocksRes, indicesRes] = await Promise.all([
                    api.get('/stock'),
                    api.get('/stock/market-index').catch(() => ({ data: { data: [] } }))
                ]);
                setStocks(stocksRes.data.data);
                if (indicesRes.data && Array.isArray(indicesRes.data.data)) {
                    setMarketIndices(indicesRes.data.data);
                }
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

    const defaultIndices = [
        { name: 'KOSPI', value: 2750.24, change: 12.45, changeRate: 0.45 },
        { name: 'KOSDAQ', value: 845.12, change: -3.20, changeRate: -0.38 }
    ];
    const displayIndices = marketIndices.length > 0 ? marketIndices : defaultIndices;

    return (
        <div className="stock-list-container">
            <header className="page-header">
                <h1 className="page-title">주식 시장</h1>
                <p className="page-subtitle">실시간 종목 시세를 확인하고 매매를 진행하세요.</p>
            </header>

            <div className="market-overview">
                {displayIndices.map((idxItem, i) => {
                    const isUp = idxItem.change >= 0;
                    const colorClass = isUp ? 'profit-up' : 'profit-down';
                    const sign = isUp ? '+' : '';

                    return (
                        <div key={idxItem.name || i} className="glass-panel overview-card">
                            <div className="overview-header">
                                <h3>{idxItem.name}</h3>
                                {isUp ? <TrendingUp size={20} className={colorClass} /> : <TrendingDown size={20} className={colorClass} />}
                            </div>
                            <div className={`index-value ${colorClass}`}>
                                {idxItem.value ? idxItem.value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                            </div>
                            <div className={`index-change ${colorClass}`}>
                                {sign}{idxItem.change ? idxItem.change.toFixed(2) : '0.00'} ({sign}{idxItem.changeRate ? idxItem.changeRate.toFixed(2) : '0.00'}%)
                            </div>
                        </div>
                    );
                })}
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
                            const name = stock.stockName || stock.name || '종목';
                            const code = stock.stockId ? String(stock.stockId).padStart(6, '0') : (stock.code || '000000');
                            const price = stock.nowPrice ?? stock.price ?? 0;
                            const prevPrice = stock.prevPrice ?? price;
                            const change = price - prevPrice;
                            const changeRate = prevPrice > 0 ? ((change / prevPrice) * 100) : 0;
                            const volume = stock.pubAmount ?? stock.volume ?? 0;
                            const stockId = stock.stockId || stock.id;

                            const isUp = change > 0;
                            const isDown = change < 0;
                            const colorClass = isUp ? 'profit-up' : isDown ? 'profit-down' : '';
                            const sign = isUp ? '+' : '';

                            return (
                                <tr key={stockId} onClick={() => navigate(`/stocks/${stockId}`)}>
                                    <td>
                                        <div className="stock-info">
                                            <div className="stock-icon-small">{name.charAt(0)}</div>
                                            <div className="stock-name-wrapper">
                                                <span className="stock-name">{name}</span>
                                                <span className="stock-code">{stock.content || `코드 ${code}`}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={colorClass}>{price.toLocaleString()} P</td>
                                    <td className={colorClass}>
                                        {sign}{change.toLocaleString()}
                                    </td>
                                    <td>
                                        <div className="flex-right">
                                            {isUp ? <TrendingUp size={14} /> : isDown ? <TrendingDown size={14} /> : ''}
                                            {sign}{changeRate.toFixed(2)}%
                                        </div>
                                    </td>
                                    <td>{volume.toLocaleString()}</td>
                                    <td>
                                        {stock.status === 'SUSPENDED' ? (
                                            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', background: '#f59e0b', color: '#ffffff' }}>
                                                🟡 거래 정지
                                            </span>
                                        ) : stock.status === 'DELISTED' ? (
                                            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', background: '#ef4444', color: '#ffffff' }}>
                                                🔴 상장 폐지
                                            </span>
                                        ) : (
                                            <button 
                                                className="trade-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/stocks/${stockId}`);
                                                }}
                                            >
                                                주식 거래
                                            </button>
                                        )}
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
