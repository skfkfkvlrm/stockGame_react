import React from 'react';
import { Newspaper, ChevronRight, Clock } from 'lucide-react';
import './NewsList.css';

const NewsList = () => {
    // MOCK DATA
    const newsData = [
        { id: 1, title: '삼성전자, 차세대 AI 반도체 양산 시작', summary: '새로운 고성능 AI 반도체의 본격적인 양산에 돌입하며 주가 상승이 기대됩니다.', date: '10분 전', tag: '호재', type: 'up' },
        { id: 2, title: '글로벌 경제 위기 우려, 금리 인상 가능성 대두', summary: '미국 연준의 매파적 발언으로 인해 글로벌 증시에 충격이 예상됩니다.', date: '1시간 전', tag: '악재', type: 'down' },
        { id: 3, title: 'SK하이닉스, 깜짝 실적 발표', summary: '시장 기대치를 상회하는 분기 실적을 발표했습니다.', date: '3시간 전', tag: '호재', type: 'up' },
        { id: 4, title: '현대차, 전기차 신모델 공개', summary: '혁신적인 디자인의 차세대 전기차 라인업을 새롭게 선보였습니다.', date: '5시간 전', tag: '호재', type: 'up' },
    ];

    return (
        <div className="news-list-container">
            <header className="page-header">
                <h1 className="page-title">시장 뉴스</h1>
                <p className="page-subtitle">시장에 영향을 미치는 주요 뉴스를 실시간으로 확인하세요.</p>
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
