import React, { useEffect, useState } from 'react';
import api from '../../api/axiosConfig';
import './NewsList.css';

const NewsList = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

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

    const handleGenerateAiNews = async () => {
        setGenerating(true);
        try {
            const response = await api.post('/api/news/generate-ai');
            if (response.data.success) {
                alert(response.data.data || "AI 찌라시가 생성되었습니다!");
                fetchNews();
            } else {
                alert("생성 실패: " + response.data.error.message);
            }
        } catch (error) {
            console.error('Failed to generate AI news', error);
            alert("AI 뉴스 생성 중 서버 오류가 발생했습니다.");
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <div className="loading">뉴스 데이터를 불러오는 중입니다...</div>;

    return (
        <div className="news-page">
            <div className="news-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>시장 뉴스</h2>
                <button 
                    className="ai-generate-btn" 
                    onClick={handleGenerateAiNews}
                    disabled={generating}
                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent-primary, #4facfe)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    {generating ? '로컬 모델(gemma4) 구동 중...' : '✨ AI 찌라시 생성'}
                </button>
            </div>
            
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
