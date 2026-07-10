import React, { useState, useEffect } from 'react';
import { Newspaper, ChevronRight, Clock } from 'lucide-react';
import api from '../../../api/axios';
import './NewsList.css';

const NewsList = () => {
    const [newsData, setNewsData] = useState([]);
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

    if (isLoading) return <div className="news-list-container"><div className="loading-spinner"></div></div>;
    if (error) return <div className="news-list-container"><div className="error-msg">{error}</div></div>;

    return (
        <div className="news-list-container">
            <header className="page-header">
                <h1 className="page-title">시장 뉴스</h1>
                <p className="page-subtitle">시장에 영향을 미치는 주요 뉴스를 실시간으로 확인하세요. (AI 생성됨)</p>
            </header>

            <div className="news-grid">
                {newsData.map(news => (
                    <div key={news.id} className={`news-card glass-panel ${news.type}`}>
                        <div className="news-card-header">
                            <span className={`news-tag ${news.type}`}>{news.tag}</span>
                            <div className="news-date">
                                <Clock size={14} /> {news.date}
                            </div>
                        </div>
                        <h3 className="news-title">{news.title}</h3>
                        <p className="news-summary">{news.summary}</p>
                        <div className="news-footer">
                            <button className="read-more-btn">
                                자세히 보기 <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NewsList;
