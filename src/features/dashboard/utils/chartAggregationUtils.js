/**
 * 대시보드 자산 추이 시계열 집계(Aggregation) 유틸리티 모듈
 * 
 * 1. aggregateHourlyToday: 당일(1D) 모드 - 매 1시간 정각(09:00, 10:00...) 스냅샷 집계
 * 2. aggregateDailyClosing: 1주/1개월/3개월/전체 모드 - 일별 최종 마감 금액(1일 1점) 집계
 */

/**
 * 트랜잭션 목록으로부터 특정 시점(targetTime) 이전의 유효 잔고를 산출합니다.
 */
function getBalanceBeforeOrAt(sortedHistoryAsc, targetTime, fallbackBalance) {
    if (!sortedHistoryAsc || sortedHistoryAsc.length === 0) {
        return fallbackBalance;
    }

    // targetTime 이하인 트랜잭션 중 가장 마지막(최신) 트랜잭션 탐색
    for (let i = sortedHistoryAsc.length - 1; i >= 0; i--) {
        const tx = sortedHistoryAsc[i];
        const txTime = new Date(tx.historyDate || tx.createdDate || tx.date).getTime();
        if (txTime <= targetTime) {
            const bal = tx.balanceAfter ?? tx.currentPoint;
            if (bal !== undefined && bal !== null) {
                return Math.max(0, Number(bal));
            }
        }
    }

    // targetTime 이전 트랜잭션이 없다면 첫 트랜잭션 직전 잔고 추정
    const firstTx = sortedHistoryAsc[0];
    const firstBal = firstTx.balanceAfter ?? firstTx.currentPoint;
    if (firstBal !== undefined && firstBal !== null) {
        const change = firstTx.pointChange ?? firstTx.amount ?? 0;
        return Math.max(0, Number(firstBal) - Number(change));
    }

    return fallbackBalance;
}

/**
 * 1. [당일 (1D)] 1시간 단위 정각 스냅샷 집계
 * - 09:00(또는 장 시작/00:00)부터 현재 시각까지 매 정각(HH:00) 시점의 잔고 매핑
 * - 마지막에 현재 시각(Now)의 실시간 잔고를 연결하여 직각 스텝 렌더링
 * 
 * @param {Array} historyData - 포인트 변동 트랜잭션 이력
 * @param {number} currentBalance - 현재 실시간 가용 자산
 * @param {Date} [baseNow=new Date()] - 기준 시각 (테스트용 주입 가능)
 * @returns {Array<{x: number, y: number}>} ApexCharts 시계열 데이터 포인트 배열
 */
export function aggregateHourlyToday(historyData, currentBalance, baseNow = new Date()) {
    const now = new Date(baseNow);
    const nowTime = now.getTime();
    const curBal = Math.max(0, Number(currentBalance || 0));

    // 유효한 날짜를 가진 이력만 오름차순 정렬
    const sortedHistory = (historyData || [])
        .filter(item => {
            const dateStr = item.historyDate || item.createdDate || item.date;
            if (!dateStr) return false;
            const t = new Date(dateStr).getTime();
            return !isNaN(t) && t > 0;
        })
        .sort((a, b) => {
            const tA = new Date(a.historyDate || a.createdDate || a.date).getTime();
            const tB = new Date(b.historyDate || b.createdDate || b.date).getTime();
            return tA - tB;
        });

    const startHour = now.getHours() >= 9 ? 9 : 0; // 09:00 이후면 09:00 시작, 그 이전이면 00:00 시작
    const currentHour = now.getHours();

    const points = [];
    let lastBalance = curBal;

    for (let h = startHour; h <= currentHour; h++) {
        const hourDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0, 0);
        const hourTime = hourDate.getTime();

        const balanceAtHour = getBalanceBeforeOrAt(sortedHistory, hourTime, curBal);
        points.push({ x: hourTime, y: balanceAtHour });
        lastBalance = balanceAtHour;
    }

    // 현재 시각이 정각과 차이가 난다면(분/초 존재 시) 현재 시점의 실시간 포인트 추가
    if (now.getMinutes() > 0 || now.getSeconds() > 0) {
        points.push({ x: nowTime, y: curBal });
    }

    // 최소 2개 포인트 보장
    if (points.length === 1) {
        const prevHour = points[0].x - (60 * 60 * 1000);
        points.unshift({ x: prevHour, y: points[0].y });
    }

    return points;
}

/**
 * 2. [1주 / 1개월 / 3개월 / 전체] 일별 최종 마감 금액 단일화 집계
 * - 지정된 기간 내의 각 날짜(YYYY-MM-DD)마다 '그날의 마지막 트랜잭션 잔고' 1개만 추출
 * - 거래가 없는 날은 직전일 마감 금액을 Forward-Fill로 승계
 * - 당일(오늘)은 현재 시점의 실시간 자산 금액 매핑
 * 
 * @param {Array} historyData - 포인트 변동 트랜잭션 이력
 * @param {number} daysCount - 조회 일수 (7: 1주, 30: 1개월, 90: 3개월, 0: 전체)
 * @param {number} currentBalance - 현재 실시간 가용 자산
 * @param {Date} [baseNow=new Date()] - 기준 시각 (테스트용 주입 가능)
 * @returns {Array<{x: number, y: number}>} ApexCharts 시계열 데이터 포인트 배열
 */
export function aggregateDailyClosing(historyData, daysCount, currentBalance, baseNow = new Date()) {
    const now = new Date(baseNow);
    const curBal = Math.max(0, Number(currentBalance || 0));

    // 유효한 이력만 오름차순 정렬
    const sortedHistory = (historyData || [])
        .filter(item => {
            const dateStr = item.historyDate || item.createdDate || item.date;
            if (!dateStr) return false;
            const t = new Date(dateStr).getTime();
            return !isNaN(t) && t > 0;
        })
        .sort((a, b) => {
            const tA = new Date(a.historyDate || a.createdDate || a.date).getTime();
            const tB = new Date(b.historyDate || b.createdDate || b.date).getTime();
            return tA - tB;
        });

    // 시작 날짜 결정
    let startDate;
    if (daysCount > 0) {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (daysCount - 1), 0, 0, 0, 0);
    } else {
        // 전체(ALL): 최초 트랜잭션 일자 기준 또는 최소 7일 전
        if (sortedHistory.length > 0) {
            const firstDateStr = sortedHistory[0].historyDate || sortedHistory[0].createdDate || sortedHistory[0].date;
            const firstDate = new Date(firstDateStr);
            startDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate(), 0, 0, 0, 0);
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
        }
    }

    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dailyPoints = [];
    let runningBalance = curBal;

    const iterDate = new Date(startDate);
    while (iterDate <= now) {
        const year = iterDate.getFullYear();
        const month = iterDate.getMonth();
        const day = iterDate.getDate();
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = (dateKey === todayDateStr);

        if (isToday) {
            // 오늘은 장 마감 전이므로 현재 시각의 실시간 잔고를 사용
            dailyPoints.push({ x: now.getTime(), y: curBal });
        } else {
            // 해당 날짜의 23:59:59.999 시점 잔고를 당일 최종 마감 금액으로 산출
            const dayEndTime = new Date(year, month, day, 23, 59, 59, 999).getTime();
            const dayBalance = getBalanceBeforeOrAt(sortedHistory, dayEndTime, runningBalance);
            
            // X축 좌표는 해당 일자의 12:00:00(정오) 또는 23:59:59로 안정적 앵커링
            const anchorTime = new Date(year, month, day, 12, 0, 0, 0).getTime();
            dailyPoints.push({ x: anchorTime, y: dayBalance });
            runningBalance = dayBalance;
        }

        // 다음 날짜로 1일 가산
        iterDate.setDate(iterDate.getDate() + 1);
    }

    // 최소 2개 포인트 보장
    if (dailyPoints.length === 1) {
        const prevDay = dailyPoints[0].x - (24 * 60 * 60 * 1000);
        dailyPoints.unshift({ x: prevDay, y: dailyPoints[0].y });
    }

    return dailyPoints;
}

/**
 * 기간 인덱스(timeframeIndex)에 따른 적응형 자산 집계 디스패처
 * 
 * @param {Array} historyData - 포인트 변동 이력
 * @param {number} timeframeIndex - 0: 당일, 1: 1주, 2: 1개월, 3: 3개월, 4: 전체
 * @param {number} currentBalance - 현재 실시간 자산
 * @returns {Array<{x: number, y: number}>} 직각 계단형 차트용 시계열 데이터
 */
export function computeAggregatedChartData(historyData, timeframeIndex, currentBalance) {
    if (timeframeIndex === 0) {
        return aggregateHourlyToday(historyData, currentBalance);
    }

    const daysMap = {
        1: 7,   // 1주일
        2: 30,  // 1개월
        3: 90,  // 3개월
        4: 0    // 전체
    };

    const daysCount = daysMap[timeframeIndex] ?? 0;
    return aggregateDailyClosing(historyData, daysCount, currentBalance);
}

export default {
    aggregateHourlyToday,
    aggregateDailyClosing,
    computeAggregatedChartData
};
