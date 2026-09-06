import React from 'react';
import { AlertTriangle, Lock, Clock } from 'lucide-react';
import useMarketStore from '../../admin/store/useMarketStore';

const MarketCircuitBreakerBanner = () => {
    const marketOpen = useMarketStore((state) => state.marketOpen);
    const statusCode = useMarketStore((state) => state.statusCode);
    const openTime = useMarketStore((state) => state.openTime);
    const closeTime = useMarketStore((state) => state.closeTime);

    // 시장이 정규 개장 중이면 배너 미노출
    if (marketOpen && statusCode === 'OPEN') {
        return null;
    }

    // 1. 긴급 점검 (MANUAL_PAUSE)
    if (statusCode === 'MANUAL_PAUSE') {
        return (
            <div 
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))',
                    color: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                    fontWeight: '600',
                    fontSize: '0.92rem',
                    animation: 'pulse 2s infinite'
                }}
            >
                <AlertTriangle size={22} style={{ flexShrink: 0, animation: 'bounce 1s infinite' }} />
                <span>
                    <strong>🚨 [긴급 시장 점검 / 서킷 브레이커 발동]</strong> 교사 관리자에 의해 시장 거래가 일시 정지되었습니다. 모든 주식의 신규 주문 접수가 즉시 차단됩니다.
                </span>
            </div>
        );
    }

    // 2. 동시호가 (CALL_AUCTION)
    if (statusCode === 'CALL_AUCTION') {
        return (
            <div 
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    marginBottom: '20px',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95))',
                    color: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
                    fontWeight: '600',
                    fontSize: '0.92rem'
                }}
            >
                <Clock size={22} style={{ flexShrink: 0 }} />
                <span>
                    <strong>🟡 [단일가 동시호가 접수 중]</strong> 현재 장 마감 전 동시호가 접수 시간입니다. 접수된 주문은 15:30에 단일 가격으로 일괄 체결됩니다.
                </span>
            </div>
        );
    }

    // 3. 정규장 마감 또는 휴장 (!marketOpen 또는 CLOSED)
    return (
        <div 
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '12px 20px',
                marginBottom: '20px',
                background: 'linear-gradient(135deg, rgba(71, 85, 105, 0.95), rgba(51, 65, 85, 0.95))',
                color: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(51, 65, 85, 0.25)',
                fontWeight: '600',
                fontSize: '0.92rem'
            }}
        >
            <Lock size={20} style={{ flexShrink: 0 }} />
            <span>
                <strong>🔒 [정규장 마감]</strong> 현재 주식 시장이 휴장 중입니다. (정규 운영 시간: {openTime || '09:00'} ~ {closeTime || '15:30'}) 신규 주문은 접수되지 않습니다.
            </span>
        </div>
    );
};

export default MarketCircuitBreakerBanner;
