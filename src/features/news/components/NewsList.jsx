import React, { useState, useEffect } from 'react';
import { Newspaper, ChevronRight, Clock } from 'lucide-react';
import api from '../../../api/axios';
import './NewsList.css';

const NewsList = () => {
    const [newsData, setNewsData] = useState([]);
    const [selectedNews, setSelectedNews] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('ALL'); // 'ALL' | '1D' | '1W' | '1M' | 'CUSTOM'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const GAUGE_STEPS = [
        { label: '전체', minutes: 0 },
        { label: '10분', minutes: 10 },
        { label: '30분', minutes: 30 },
        { label: '1시간', minutes: 60 },
        { label: '3시간', minutes: 180 },
        { label: '6시간', minutes: 360 },
        { label: '12시간', minutes: 720 },
        { label: '24시간', minutes: 1440 },
    ];
    // 슬라이더 스텝 인덱스 (0: 전체, 1: 10분, 2: 30분, 3: 1시간, 4: 3시간, 5: 6시간, 6: 12시간, 7: 24시간)
    const [sliderStepIndex, setSliderStepIndex] = useState(0); // 기본값: 전체 (날짜 선택 시 제한 없이 모든 뉴스 노출)

    useEffect(() => {
        const fetchNews = async () => {
            try {
                // api.js의 인스턴스를 통해 요청합니다. (프록시 및 Mock 적용됨)
                const response = await api.get('/news');
                setNewsData(response.data.data || []);
            } catch (err) {
                console.error("News fetch error:", err);
                setError('뉴스를 불러오지 못했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();

        // 5초 간격으로 실시간 뉴스 자동 폴링 (새로운 뉴스가 생성되면 새로고침 없이 자동 갱신)
        const intervalId = setInterval(fetchNews, 5000);

        return () => clearInterval(intervalId);
    }, []);

    const formatNewsDate = (dateObj) => {
        if (!dateObj || isNaN(dateObj.getTime())) return '';
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));

        if (diffInMinutes >= 0 && diffInMinutes <= 30) {
            return diffInMinutes === 0 ? '방금 전' : `${diffInMinutes}분 전`;
        }

        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');

        return `${month}/${day} ${hours}:${minutes}`;
    };

    const parseTimeStringToDate = (timeStr) => {
        if (!timeStr) return null;
        const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (match) {
            const now = new Date();
            const hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const seconds = match[3] ? parseInt(match[3], 10) : 0;
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
        }
        return null;
    };

    const parseNewsItem = (item, index) => {
        if (!item) return null;

        let contentStr = typeof item === 'string' ? item : (item.content || item.title || '');
        let rawDate = null;
        let formattedDate = '';
        let tag = '실시간 뉴스';
        let title = contentStr;

        // 1. 태그 및 본문 내 시간 문자열 추출 ([20:07:06] [호재] 제목 or [호재] 제목)
        let timeString = '';
        const tagMatch = contentStr.match(/\[(.*?)\]/g);
        if (tagMatch && tagMatch.length > 0) {
            if (tagMatch[0].match(/\d{1,2}:\d{2}/)) {
                timeString = tagMatch[0].replace(/[\[\]]/g, '');
                if (tagMatch.length > 1) {
                    tag = tagMatch[1].replace(/[\[\]]/g, '');
                }
            } else {
                tag = tagMatch[0].replace(/[\[\]]/g, '');
            }
            title = contentStr.replace(/\[.*?\]/g, '').trim();
        }

        // 2. 정확한 실제 일시(rawDate) 산정
        if (typeof item === 'object' && item.createdDate) {
            let dateStr = String(item.createdDate);
            const baseD = new Date(dateStr);
            
            // 본문 안에 [20:07:06] 형태의 한국 로컬 시간이 적혀있다면 이를 해당 날짜의 시/분/초로 우선 적용
            if (timeString && !isNaN(baseD.getTime())) {
                const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
                if (timeMatch) {
                    const hours = parseInt(timeMatch[1], 10);
                    const minutes = parseInt(timeMatch[2], 10);
                    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
                    rawDate = new Date(baseD.getFullYear(), baseD.getMonth(), baseD.getDate(), hours, minutes, seconds);
                } else {
                    rawDate = baseD;
                }
            } else {
                rawDate = baseD;
            }
            formattedDate = formatNewsDate(rawDate);
        } else if (timeString) {
            rawDate = parseTimeStringToDate(timeString);
            formattedDate = rawDate ? formatNewsDate(rawDate) : (timeString || '과거 뉴스');
        }

        if (!formattedDate) {
            formattedDate = rawDate ? formatNewsDate(rawDate) : '최근 뉴스';
        }

        return {
            id: (typeof item === 'object' && (item.newsId || item.id)) ? (item.newsId || item.id) : index,
            tag: tag || '증시시황',
            date: formattedDate,
            rawDate: rawDate,
            title: title || contentStr || '주요 시장 뉴스'
        };
    };

    if (isLoading) return <div className="news-list-container"><div className="loading-spinner"></div></div>;
    if (error) return <div className="news-list-container"><div className="error-msg">{error}</div></div>;

    const parsedList = newsData
        .map((item, idx) => parseNewsItem(item, idx))
        .filter(item => item && item.date && item.date !== '오늘');

    const currentGaugeMinutes = GAUGE_STEPS[sliderStepIndex]?.minutes || 0;
    const currentGaugeLabel = GAUGE_STEPS[sliderStepIndex]?.label || '전체';

    // 기간 및 분/시간 단위 필터링 로직 (완전 보정본)
    const filteredList = parsedList.filter((news) => {
        if (!news.rawDate || isNaN(news.rawDate.getTime())) return true;
        const now = new Date();
        const newsTime = news.rawDate.getTime();

        if (timeRange === '1D') {
            const oneDayAgo = now.getTime() - (24 * 60 * 60 * 1000);
            return newsTime >= oneDayAgo;
        } else if (timeRange === '1W') {
            const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
            return newsTime >= oneWeekAgo;
        } else if (timeRange === '1M') {
            const oneMonthAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
            return newsTime >= oneMonthAgo;
        } else if (timeRange === 'CUSTOM') {
            // 1. 기준 종료 시점(baseEndTime) 결정
            let baseEndTime = now.getTime();

            if (endDate) {
                const end = new Date(`${endDate}T23:59:59.999`);
                // 오늘 날짜가 아니면 해당 과거일의 23:59:59를 기준 시점으로 잡음
                baseEndTime = end.getTime() > now.getTime() ? now.getTime() : end.getTime();
                if (newsTime > end.getTime()) return false;
            }

            // 2. 시작 날짜 필터
            if (startDate) {
                const start = new Date(`${startDate}T00:00:00.000`);
                if (newsTime < start.getTime()) return false;
            }

            // 3. 시간 게이지 슬라이더 필터 (currentGaugeMinutes > 0 일 때만 상대적 시간 필터 적용)
            if (currentGaugeMinutes > 0) {
                const threshold = baseEndTime - (currentGaugeMinutes * 60 * 1000);
                if (newsTime < threshold) return false;
            }

            return true;
        }
        return true; // 'ALL'
    });

    return (
        <div className="news-list-container">
            <header className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 className="page-title">시장 뉴스</h1>
                        <p className="page-subtitle">시장에 영향을 미치는 주요 뉴스를 실시간으로 확인하세요.</p>
                    </div>

                    {/* 기간 필터 컨트롤 */}
                    <div className="news-filter-controls">
                        <div className="news-filter-tabs">
                            {[
                                { key: 'ALL', label: '전체' },
                                { key: '1D', label: '24시간' },
                                { key: '1W', label: '1주일' },
                                { key: '1M', label: '1개월' },
                                { key: 'CUSTOM', label: '직접 설정' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className={`news-filter-btn ${timeRange === tab.key ? 'active' : ''}`}
                                    onClick={() => setTimeRange(tab.key)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {timeRange === 'CUSTOM' && (
                            <div className="news-custom-stacked-bars">
                                {/* 상단: 날짜 선택 바 */}
                                <div className="custom-bar-row">
                                    <span className="bar-label">📅 날짜 선택:</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bar-input"
                                    />
                                    <span className="bar-separator">~</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bar-input"
                                    />
                                    {(startDate || endDate) && (
                                        <button
                                            type="button"
                                            className="btn-text-reset"
                                            onClick={() => { setStartDate(''); setEndDate(''); }}
                                        >
                                            날짜 초기화
                                        </button>
                                    )}
                                </div>

                                {/* 하단: 드래그 게이지 슬라이더 바 (스텝 100% 정밀 연동) */}
                                <div className="custom-bar-row gauge-row">
                                    <div className="gauge-header">
                                        <span className="bar-label">⚡ 시간 게이지:</span>
                                        <span className="gauge-badge">최근 {currentGaugeLabel} 전까지</span>
                                    </div>

                                    <div className="gauge-slider-wrapper">
                                        <input
                                            type="range"
                                            min="0"
                                            max={GAUGE_STEPS.length - 1}
                                            step="1"
                                            value={sliderStepIndex}
                                            onChange={(e) => setSliderStepIndex(Number(e.target.value))}
                                            className="gauge-slider-input"
                                            style={{
                                                background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(sliderStepIndex / (GAUGE_STEPS.length - 1)) * 100}%, #e2e8f0 ${(sliderStepIndex / (GAUGE_STEPS.length - 1)) * 100}%, #e2e8f0 100%)`
                                            }}
                                        />
                                        <div className="gauge-marks">
                                            {GAUGE_STEPS.map((step, idx) => (
                                                <span
                                                    key={step.label}
                                                    onClick={() => setSliderStepIndex(idx)}
                                                    className={sliderStepIndex === idx ? 'active' : ''}
                                                >
                                                    {step.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="news-grid">
                {filteredList.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        선택하신 기간에 등록된 뉴스가 없습니다.
                    </div>
                ) : (
                    filteredList.map(news => (
                        <div key={news.id} className="news-card glass-panel">
                            <div className="news-card-header">
                                <span className="news-tag market">{news.tag}</span>
                                <div className="news-date">
                                    <Clock size={14} /> {news.date}
                                </div>
                            </div>
                            <h3 className="news-title">{news.title}</h3>
                            <div className="news-footer">
                                <button className="read-more-btn" onClick={() => setSelectedNews(news)}>
                                    자세히 보기 <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* News Detail Modal */}
            {selectedNews && (() => {
                const title = selectedNews.title || '';
                const keywords = ["삼성전자", "SK하이닉스", "NAVER", "카카오", "현대차", "LG에너지솔루션", "한화에어로스페이스", "셀트리온"];
                const matchedKey = keywords.find(k => title.includes(k)) || '주요 종목';

                return (
                    <div className="modal-overlay" onClick={() => setSelectedNews(null)} style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '560px',
                            width: '90%',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                                    {selectedNews.tag}
                                </span>
                                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                                    <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> {selectedNews.date}
                                </span>
                            </div>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '16px', color: '#1e293b', lineHeight: '1.4' }}>
                                {selectedNews.title}
                            </h2>
                            <div style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.6', marginBottom: '24px' }}>
                                <p style={{ marginBottom: '12px', fontWeight: '500', color: '#334155' }}>
                                    📌 <b>시장 속보 요약</b><br />
                                    '{selectedNews.title}' 관련 실시간 시장 데이터 분석 결과입니다. 현재 <span style={{ color: '#6366f1', fontWeight: 'bold' }}>{matchedKey}</span>을(를) 중심으로 투자자들의 거래 관심도와 매수/매도 수급이 집중되고 있습니다.
                                </p>
                                <p style={{ marginBottom: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                                    📊 <b>주가 및 투자 영향 분석</b><br />
                                    해당 호재/악재 이슈는 {matchedKey}의 단기 주가 변동성 및 관련 업종 섹터 전반에 영향을 미칠 수 있습니다. 실시간 호가창 및 체결 내역을 주시하여 투자 전략을 점검하시기 바랍니다.
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '16px' }}>
                                    ※ 본 뉴스는 실시간 증시 시세 및 모의투자 시장 분석 시스템에 의해 자동으로 정제되어 출력된 뉴스 피드입니다.
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <button
                                    onClick={() => setSelectedNews(null)}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#8b5cf6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default NewsList;
