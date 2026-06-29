import React, { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';
import './NewsList.css';

const NewsList = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNews();
    }, []);

    const fetchNews = async () => {
        try {
            const response = await api.get('/api/news');
            if (response.data.success) {
                setNews(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch news', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">뉴스 데이터를 불러오는 중입니다...</div>;

    return (
        <div className="news-page">
            <h2>시장 뉴스</h2>
            <div className="news-grid">
                {news.length > 0 ? (
                    news.map((item, index) => (
                        <div key={index} className="news-card">
                            <p className="news-content">{item}</p>
                        </div>
                    ))
                ) : (
                    <div className="empty-message">현재 등록된 뉴스가 없습니다.</div>
                )}
            </div>
        </div>
    );
};

export default NewsList;
