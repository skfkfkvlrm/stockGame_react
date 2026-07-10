import MockAdapter from 'axios-mock-adapter';
import api from './axios.js';
import axios from 'axios';

export const setupMock = () => {
    const mock = new MockAdapter(api, { delayResponse: 500 });

    // --- 1. Auth Endpoints ---
    mock.onGet('/auth/status').reply(200, { authenticated: true });
    mock.onGet('/members/me').reply(200, {
        data: {
            studentId: 'testuser',
            name: '테스트 유저',
            totalPoint: 1500000,
            unreadAlarms: 2
        }
    });
    mock.onPost('/members/login').reply(200, { message: "로그인 성공" });
    mock.onPost('/members/logout').reply(200, { message: "로그아웃 성공" });
    mock.onPost('/members/join').reply(200, { message: "회원가입 성공" });

    // --- 2. Dashboard & Assets ---
    mock.onGet('/asset/').reply(200, {
        data: {
            totalAsset: 2500000,
            availablePoint: 1500000,
            stockAsset: 1000000,
            returnRate: 12.5
        }
    });

    // --- 3. Stocks ---
    const stockList = [
        { id: 1, code: '005930', name: '삼성전자', price: 75000, change: 1000, changeRate: 1.35 },
        { id: 2, code: '000660', name: 'SK하이닉스', price: 150000, change: 2000, changeRate: 1.35 },
        { id: 3, code: '035420', name: 'NAVER', price: 195000, change: -1000, changeRate: -0.51 }
    ];
    
    mock.onGet('/stock').reply(200, { data: stockList });
    mock.onGet(/\/stock\/\d+/).reply(config => {
        const id = parseInt(config.url.split('/').pop(), 10);
        const stock = stockList.find(s => s.id === id) || stockList[0];
        return [200, { data: stock }];
    });
    
    mock.onPost('/orders/buy').reply(200, { data: "매수 주문이 체결되었습니다." });
    mock.onPost('/orders/sell').reply(200, { data: "매도 주문이 체결되었습니다." });

    // --- 4. Coupons & History ---
    mock.onGet('/coupons').reply(200, { data: [] });
    mock.onGet('/coupons/my').reply(200, { data: [] });
    mock.onGet('/history').reply(200, { data: [] });

    // --- 5. AI News (Ollama Integration) ---
    mock.onGet('/news').reply(async () => {
        try {
            const prompt = `You are a financial news AI. Generate 3 short Korean stock market news headlines and summaries in JSON format. 
Format MUST be:
[
  { "id": 1, "title": "...", "summary": "...", "date": "10분 전", "tag": "호재", "type": "up" }
]
Only output valid JSON array. Do not output anything else.`;

            // Call local Ollama API
            const ollamaRes = await axios.post('/api/ollama/generate', {
                model: 'qwen2.5:1.5b',
                prompt: prompt,
                stream: false,
                format: 'json'
            });

            if (ollamaRes.data && ollamaRes.data.response) {
                // Sanitize potential markdown code blocks from LLM output
                const cleanJsonStr = ollamaRes.data.response.replace(/```json|```/g, '').trim();
                const generatedNews = JSON.parse(cleanJsonStr);
                return [200, { data: generatedNews }];
            }
        } catch (error) {
            console.error("Ollama Mock Error:", error);
        }

        // Fallback static data if Ollama fails
        return [200, {
            data: [
                { id: 1, title: 'AI 반도체 붐 지속 (MockFallback)', summary: 'AI 반도체 수요가 폭증하며 관련 주가가 오르고 있습니다.', date: '10분 전', tag: '호재', type: 'up' },
                { id: 2, title: '글로벌 경제 위기 우려 (MockFallback)', summary: '연준의 발언으로 인해 글로벌 증시에 충격이 예상됩니다.', date: '1시간 전', tag: '악재', type: 'down' }
            ]
        }];
    });

    console.log('[Mock] API Mocking enabled with Ollama AI integration');
};
