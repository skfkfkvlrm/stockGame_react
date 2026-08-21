import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, BarChart2 } from 'lucide-react';
import api from '../../../api/axios';
import './StockList.css';

const SECTOR_MAP = {
    '새콤달콤': '간식/매점', '포켓몬빵': '간식/매점', '바나나우유': '간식/매점',
    '자리선택권': '학교생활/쿠폰', '청소면제권': '학교생활/쿠폰', '급식우선권': '학교생활/쿠폰',
    'PC방이용권': '게임/여가', '닌텐도': '게임/여가', '로블록스': '게임/여가',
    'SM엔터': '엔터/미디어', '하이브': '엔터/미디어', '치지직/숲': '엔터/미디어',
    '지우개똥청소기': '문구/학용품', '샤프심연구소': '문구/학용품', '캐릭터필통': '문구/학용품',
    '축구공테크': '스포츠/취미', '배드민턴클럽': '스포츠/취미', '포켓몬카드': '스포츠/취미',
    'AI로봇선생님': '미래기술/IT', '드론배달소': '미래기술/IT', '스마트책상': '미래기술/IT'
};

const getSectorByName = (name) => {
    if (!name) return '기타';
    for (const [key, val] of Object.entries(SECTOR_MAP)) {
        if (name.includes(key)) return val;
    }
    return '기타';
};

const StockList = () => {
    const navigate = useNavigate();
    const [stocks, setStocks] = useState([]);
    const [marketIndices, setMarketIndices] = useState([]);
    const [selectedIndexModal, setSelectedIndexModal] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const ALL_SECTORS = ['간식/매점', '학교생활/쿠폰', '게임/여가', '엔터/미디어', '문구/학용품', '스포츠/취미', '미래기술/IT'];
    const [selectedSectors, setSelectedSectors] = useState(['전체']);
    const [sortOption, setSortOption] = useState('NONE'); // 'ASC', 'DESC', 'VOLUME', 'NONE'

    const handleSectorClick = (sector) => {
        if (sector === '전체') {
            setSelectedSectors(['전체']);
            return;
        }

        let newSelected;
        if (selectedSectors.includes('전체')) {
            // '전체'가 선택되어 있던 경우 특정 분야 클릭 시 해당 분야만 새로 선택
            newSelected = [sector];
        } else if (selectedSectors.includes(sector)) {
            // 이미 선택되어 있던 분야 클릭 시 해제
            newSelected = selectedSectors.filter(s => s !== sector);
        } else {
            // 선택되지 않았던 분야 추가 선택
            newSelected = [...selectedSectors, sector];
        }

        // 선택된 개수가 0개이거나 7개 전 분야가 선택되었으면 자동으로 '전체'로 수렴
        if (newSelected.length === 0 || ALL_SECTORS.every(sec => newSelected.includes(sec))) {
            setSelectedSectors(['전체']);
        } else {
            setSelectedSectors(newSelected);
        }
    };

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

    const filteredAndSortedStocks = useMemo(() => {
        let result = stocks.map(stock => {
            const name = stock.stockName || stock.name || '';
            const sector = stock.sector || getSectorByName(name);
            return { ...stock, sector };
        });

        // 1. 분야 중복 필터링 ('전체'가 포함되지 않은 경우 선택된 분야 배열 포함 여부 확인)
        if (!selectedSectors.includes('전체')) {
            result = result.filter(s => selectedSectors.includes(s.sector));
        }

        // 2. 정렬 조건 적용 (오름차순, 내림차순, 거래량)
        result.sort((a, b) => {
            const priceA = a.nowPrice ?? a.price ?? 0;
            const priceB = b.nowPrice ?? b.price ?? 0;
            const volA = a.tradeVolume ?? a.volume ?? 0;
            const volB = b.tradeVolume ?? b.volume ?? 0;

            if (sortOption === 'ASC') {
                return priceA - priceB;
            } else if (sortOption === 'DESC') {
                return priceB - priceA;
            } else if (sortOption === 'VOLUME') {
                return volB - volA;
            }
            return (a.stockId || a.id || 0) - (b.stockId || b.id || 0);
        });

        return result;
    }, [stocks, selectedSectors, sortOption]);

    if (isLoading) return <div className="stock-list-container"><div className="loading-spinner">로딩 중...</div></div>;
    if (error) return <div className="stock-list-container"><div className="error-msg">{error}</div></div>;

    const defaultIndices = [
        { 
            name: 'KOSPI', 
            value: 2750.24, 
            change: 12.45, 
            changeRate: 0.45, 
            prevClose: 2737.79,
            openPrice: 2740.10,
            highPrice: 2765.30,
            lowPrice: 2735.20,
            high52w: 2890.50,
            low52w: 2273.97,
            volume: 458290000,
            tradingValue: 9820300000000,
            chartHistory: [2720.5, 2735.2, 2741.0, 2738.4, 2745.8, 2737.79, 2750.24]
        },
        { 
            name: 'KOSDAQ', 
            value: 845.12, 
            change: -3.20, 
            changeRate: -0.38, 
            prevClose: 848.32,
            openPrice: 847.20,
            highPrice: 851.50,
            lowPrice: 842.10,
            high52w: 920.10,
            low52w: 735.40,
            volume: 892400000,
            tradingValue: 7450200000000,
            chartHistory: [855.2, 852.0, 849.5, 847.2, 849.8, 848.32, 845.12]
        }
    ];
    const displayIndices = marketIndices.length > 0 ? marketIndices : defaultIndices;

    return (
        <div className="stock-list-container">
            <header className="page-header">
                <h1 className="page-title">주식 시장</h1>
                <p className="page-subtitle">실시간 종목 시세를 확인하고 매매를 진행하세요.</p>
            </header>

            {/* 코스피 / 코스닥 2분할 종합 시장 지수 대시보드 */}
            <div className="market-overview-split">
                {displayIndices.map((idxItem, i) => {
                    const isUp = (idxItem.change ?? 0) >= 0;
                    const colorClass = isUp ? 'profit-up' : 'profit-down';
                    const sign = isUp ? '+' : '';
                    const curVal = idxItem.value ?? 0;
                    const high = idxItem.highPrice ?? (curVal * 1.01);
                    const low = idxItem.lowPrice ?? (curVal * 0.99);
                    const progress = high > low ? Math.min(100, Math.max(0, ((curVal - low) / (high - low)) * 100)) : 50;

                    return (
                        <div key={idxItem.name || i} className="glass-panel index-detail-card">
                            <div className="index-card-header">
                                <div className="index-title-group">
                                    <span className="index-flag">{idxItem.name === 'KOSPI' ? '🏛️' : '🚀'}</span>
                                    <div>
                                        <h3>{idxItem.name} 종합 지수</h3>
                                        <span className="index-sub-label">{idxItem.name === 'KOSPI' ? '유가증권시장' : '코스닥시장'}</span>
                                    </div>
                                </div>
                                <div className={`index-badge ${colorClass}`}>
                                    {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    <span>{sign}{(idxItem.changeRate ?? 0).toFixed(2)}%</span>
                                </div>
                            </div>

                            <div className="index-main-price-row">
                                <span className={`index-big-value ${colorClass}`}>
                                    {curVal.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className={`index-diff-value ${colorClass}`}>
                                    {sign}{(idxItem.change ?? 0).toFixed(2)}
                                </span>
                            </div>

                            {/* 당일 고가/저가 레인지 바 */}
                            <div className="index-range-container">
                                <div className="range-labels">
                                    <span>저 {low.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                    <span>고 {high.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                </div>
                                <div className="range-bar-track">
                                    <div className="range-bar-fill" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>

                            <div className="index-ohlc-sub-table">
                                <div className="sub-table-row">
                                    <span className="sub-lbl">시가</span>
                                    <span className="sub-val">{(idxItem.openPrice ?? (curVal * 0.998)).toLocaleString('ko-KR', { minimumFractionDigits: 1 })}</span>
                                    <span className="sub-lbl">전일종가</span>
                                    <span className="sub-val">{(idxItem.prevClose ?? curVal).toLocaleString('ko-KR', { minimumFractionDigits: 1 })}</span>
                                </div>
                                <div className="sub-table-row">
                                    <span className="sub-lbl">52주고가</span>
                                    <span className="sub-val">{(idxItem.high52w ?? (curVal * 1.15)).toLocaleString('ko-KR', { minimumFractionDigits: 1 })}</span>
                                    <span className="sub-lbl">52주저가</span>
                                    <span className="sub-val">{(idxItem.low52w ?? (curVal * 0.85)).toLocaleString('ko-KR', { minimumFractionDigits: 1 })}</span>
                                </div>
                                <div className="sub-table-row">
                                    <span className="sub-lbl">거래량</span>
                                    <span className="sub-val">{idxItem.volume ? `${(idxItem.volume / 10000).toFixed(0)}만주` : '4,580만주'}</span>
                                    <span className="sub-lbl">거래대금</span>
                                    <span className="sub-val">{idxItem.tradingValue ? `${(idxItem.tradingValue / 1000000000000).toFixed(1)}조` : '8.5조'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="stock-filter-wrapper glass-panel">
                <div className="filter-group">
                    <label className="filter-label">분야 선택</label>
                    <div className="sector-buttons">
                        {['전체', '간식/매점', '학교생활/쿠폰', '게임/여가', '엔터/미디어', '문구/학용품', '스포츠/취미', '미래기술/IT'].map((sector) => (
                            <button
                                key={sector}
                                className={`sector-btn ${selectedSectors.includes(sector) ? 'active' : ''}`}
                                onClick={() => handleSectorClick(sector)}
                            >
                                {sector}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="filter-group sort-group">
                    <label className="filter-label">정렬 조건</label>
                    <div className="sort-buttons">
                        <button
                            className={`sort-btn ${sortOption === 'ASC' ? 'active' : ''}`}
                            onClick={() => setSortOption('ASC')}
                        >
                            <ArrowUp size={16} /> 가격 낮은순 (오름차순)
                        </button>
                        <button
                            className={`sort-btn ${sortOption === 'DESC' ? 'active' : ''}`}
                            onClick={() => setSortOption('DESC')}
                        >
                            <ArrowDown size={16} /> 가격 높은순 (내림차순)
                        </button>
                        <button
                            className={`sort-btn ${sortOption === 'VOLUME' ? 'active' : ''}`}
                            onClick={() => setSortOption('VOLUME')}
                        >
                            <BarChart2 size={16} /> 거래량 (유저간 체결)순
                        </button>
                    </div>
                </div>
            </div>

            <div className="stock-table-wrapper glass-panel">
                <table className="stock-table">
                    <thead>
                        <tr>
                            <th>종목명 (코드)</th>
                            <th>분야</th>
                            <th>현재가</th>
                            <th>전일대비</th>
                            <th>등락률</th>
                            <th>발행 잔량</th>
                            <th>거래량 (체결)</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedStocks.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    해당 조건에 일치하는 주식 종목이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredAndSortedStocks.map(stock => {
                                const name = stock.stockName || stock.name || '종목';
                                const code = stock.stockId ? String(stock.stockId).padStart(6, '0') : (stock.code || '000000');
                                const price = stock.nowPrice ?? stock.price ?? 0;
                                const prevPrice = stock.prevPrice ?? price;
                                const change = price - prevPrice;
                                const changeRate = prevPrice > 0 ? ((change / prevPrice) * 100) : 0;
                                const pubAmount = stock.pubAmount ?? 0;
                                const tradeVolume = stock.tradeVolume ?? stock.volume ?? 0;
                                const stockId = stock.stockId || stock.id;
                                const sector = stock.sector || '기타';

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
                                        <td>
                                            <span className="sector-badge">{sector}</span>
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
                                        <td>{pubAmount.toLocaleString()}주</td>
                                        <td style={{ fontWeight: '700', color: tradeVolume > 0 ? '#3b82f6' : 'var(--text-muted)' }}>
                                            {tradeVolume.toLocaleString()}주
                                        </td>
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
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StockList;
