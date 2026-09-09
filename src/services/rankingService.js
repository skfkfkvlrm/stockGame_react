import { supabase, isSupabaseMode } from '../lib/supabaseClient';
import api from '../api/axios';

/**
 * 전교생 실시간 랭킹 서비스 (Dual-Run: Supabase Cloud & Spring Boot 지원)
 */
export const rankingService = {
    /**
     * 학생 랭킹 리스트 조회
     * (총 자산 = 현금 포인트 + 보유 주식 평가액 기준)
     */
    async getRankings() {
        if (isSupabaseMode) {
            try {
                // 1. PostgreSQL get_student_rankings RPC 호출 (총자산 기준 정렬)
                const { data, error } = await supabase.rpc('get_student_rankings');
                if (!error && Array.isArray(data) && data.length > 0) {
                    return data.map((item) => ({
                        id: item.id,
                        rank: Number(item.rank),
                        studentId: item.student_id,
                        name: item.name,
                        grade: item.grade,
                        className: item.class_name,
                        classNumber: item.class_number,
                        totalPoint: Number(item.total_asset ?? item.total_point ?? 0),
                        cashPoint: Number(item.total_point ?? 0),
                        totalCoupon: Number(item.total_coupon ?? 0)
                    }));
                }

                if (error) {
                    console.warn('[rankingService] RPC get_student_rankings failed, falling back to profiles query:', error);
                }
            } catch (rpcErr) {
                console.warn('[rankingService] RPC call exception, falling back:', rpcErr);
            }

            // Fallback: profiles 직접 조회
            const { data: profiles, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'ROLE_STUDENT')
                .eq('status', 'ACTIVE')
                .order('total_point', { ascending: false });

            if (profileErr) {
                console.error('[rankingService] Fallback profiles query error:', profileErr);
                throw profileErr;
            }

            return (profiles || []).map((p, idx) => ({
                id: p.id,
                rank: idx + 1,
                studentId: p.student_id,
                name: p.name,
                grade: p.grade,
                className: p.class_name,
                classNumber: p.class_number,
                totalPoint: Number(p.total_point || 0),
                cashPoint: Number(p.total_point || 0),
                totalCoupon: Number(p.total_coupon || 0)
            }));
        }

        // Spring Boot Gateway API Fallback
        const res = await api.get('/members/ranking');
        if (res.data && res.data.success) {
            return res.data.data || [];
        } else if (Array.isArray(res.data)) {
            return res.data;
        }
        return [];
    },

    /**
     * 실시간 랭킹 변동 감지 (Supabase Realtime)
     */
    subscribeRankings(callback) {
        if (!isSupabaseMode) {
            return () => {};
        }

        const channel = supabase
            .channel('realtime_student_rankings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                callback();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stocks' }, () => {
                callback();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_holdings' }, () => {
                callback();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
};

export default rankingService;
