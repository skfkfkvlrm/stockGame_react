import React, { useState, useEffect } from 'react';
import { Newspaper, ChevronRight, Clock } from 'lucide-react';
import api from '../../../api/axios';
import './NewsList.css';

const NewsList = () => {
    const [newsData, setNewsData] = useState([]);
    const [selectedNews, setSelectedNews] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

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
    }, []);

    const parseNewsItem = (item, index) => {
        if (!item) return null;
        if (typeof item === 'string') {
            let tag = '실시간 뉴스';
            let title = item;
            let date = '오늘';

            const tagMatch = item.match(/\[(.*?)\]/g);
            if (tagMatch && tagMatch.length > 0) {
                if (tagMatch[0].match(/\d{2}:\d{2}/)) {
                    date = tagMatch[0].replace(/[\[\]]/g, '');
                    if (tagMatch.length > 1) {
                        tag = tagMatch[1].replace(/[\[\]]/g, '');
                    }
                } else {
                    tag = tagMatch[0].replace(/[\[\]]/g, '');
                }
                title = item.replace(/\[.*?\]/g, '').trim();
            }

            return {
                id: index,
                tag: tag || '증시시황',
                date: date,
                title: title || item,
                summary: '실시간 시장 동향 및 주가 시세 변동 뉴스입니다.'
            };
        } else if (typeof item === 'object') {
            return {
                id: item.newsId || item.id || index,
                tag: item.tag || '실시간 뉴스',
                date: item.createdDate ? new Date(item.createdDate).toLocaleTimeString('ko-KR') : (item.date || '오늘'),
                title: item.title || item.content || '주요 시장 뉴스',
                summary: item.summary || item.content || '실시간 시장 동향 정보입니다.'
            };
        }
        return null;
    };

    if (isLoading) return <div className="news-list-container"><div className="loading-spinner"></div></div>;
    if (error) return <div className="news-list-container"><div className="error-msg">{error}</div></div>;

    const parsedList = newsData.map((item, idx) => parseNewsItem(item, idx)).filter(Boolean);

    return (
        <div className="news-list-container">
            <header className="page-header">
                <h1 className="page-title">시장 뉴스</h1>
                <p className="page-subtitle">시장에 영향을 미치는 주요 뉴스를 실시간으로 확인하세요.</p>
            </header>

            <div className="news-grid">
                {parsedList.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                        현재 등록된 실시간 뉴스가 없습니다.
                    </div>
                ) : (
                    parsedList.map(news => (
                        <div key={news.id} className="news-card glass-panel">
                            <div className="news-card-header">
                                <span className="news-tag market">{news.tag}</span>
                                <div className="news-date">
                                    <Clock size={14} /> {news.date}
                                </div>
                            </div>
                            <h3 className="news-title">{news.title}</h3>
                            <p className="news-summary">{news.summary}</p>
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
            {selectedNews && (
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
                            <p style={{ marginBottom: '12px' }}>{selectedNews.title} 관련 상세 속보입니다.</p>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>본 뉴스는 실시간 증시 시세 및 종목 정보 데이터를 바탕으로 뉴스 크롤러에 의해 수집되었습니다.</p>
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
            )}
        </div>
    );
};

export default NewsList;
