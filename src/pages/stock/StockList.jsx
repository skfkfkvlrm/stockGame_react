import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import './StockList.css';

const StockList = () => {
    const [stockList, setStockList] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStocks = async () => {
            try {
                const response = await api.get('/api/stock');
                if (response.data.success) {
                    setStockList(response.data.data);
                }
            } catch (error) {
                console.error("주식 목록 조회 실패", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStocks();
    }, []);

    if (loading) return <div className="stock-list-container">데이터를 불러오는 중입니다...</div>;

    return (
        <div className="stock-list-container">
            <header className="hd">
                <div className="hd-name">주식 목록</div>
            </header>

            <div className="panel">
                <table className="stock-table">
                    <thead>
                        <tr>
                            <th>주식명</th>
                            <th>현재가격</th>
                            <th>이전가격</th>
                            <th>(현재가격-이전가격)</th>
                            <th>등락률(%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stockList.length === 0 ? (
                            <tr>
                                <td colSpan="5">등록된 주식이 없습니다.</td>
                            </tr>
                        ) : (
                            stockList.map((stock, idx) => {
                                const priceChange = stock.nowPrice - stock.prevPrice;
                                const changeRate = stock.prevPrice === 0 ? "0.00" : ((priceChange / stock.prevPrice) * 100).toFixed(2);
                                
                                const isUp = priceChange > 0;
                                const isDown = priceChange < 0;
                                const colorClass = isUp ? 'up' : isDown ? 'down' : '';
                                const sign = isUp ? '+' : '';

                                return (
                                    <tr key={stock.stockId} className="stock-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/stocks/${stock.stockId}`)}>
                                        <td>{stock.stockName}</td>
                                        <td className="current-price">{stock.nowPrice.toLocaleString()}P</td>
                                        <td className="prev-price">{stock.prevPrice.toLocaleString()}P</td>
                                        <td className={`price-change ${colorClass}`}>
                                            {sign}{priceChange.toLocaleString()}P
                                        </td>
                                        <td className={`change-rate ${colorClass}`}>
                                            {sign}{changeRate}%
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockList;
