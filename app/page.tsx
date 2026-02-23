'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

// 한국 공휴일 (연도별)
function getKoreanHolidays(year: number): Set<string> {
  const h: string[] = [
    `${year}-01-01`,
    `${year}-03-01`,
    `${year}-05-05`,
    `${year}-06-06`,
    `${year}-08-15`,
    `${year}-10-03`,
    `${year}-10-09`,
    `${year}-12-25`,
  ];
  const lunar: Record<number, string[]> = {
    2024: ['2024-02-09','2024-02-10','2024-02-11','2024-05-15','2024-09-16','2024-09-17','2024-09-18'],
    2025: ['2025-01-28','2025-01-29','2025-01-30','2025-05-05','2025-10-05','2025-10-06','2025-10-07'],
    2026: ['2026-02-17','2026-02-18','2026-02-19','2026-05-24','2026-09-24','2026-09-25','2026-09-26'],
    2027: ['2027-02-06','2027-02-07','2027-02-08','2027-05-13','2027-09-14','2027-09-15','2027-09-16'],
  };
  if (lunar[year]) h.push(...lunar[year]);
  return new Set(h);
}

export default function PharmacyHub() {
  const [userName, setUserName] = useState('');
  const [totalLeave, setTotalLeave] = useState(0);
  const [usedLeave, setUsedLeave] = useState(0);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [myUsedDates, setMyUsedDates] = useState<Set<string>>(new Set());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [userPosition, setUserPosition] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: userData } = await supabase
        .from('pharmacy_users').select('*').eq('auth_id', user.id).maybeSingle();

      if (userData) {
        setUserName(userData.name);
        const { data: leaveData } = await supabase
          .from('user_leave_status').select('total_allowed_leave').eq('id', userData.id).maybeSingle();
        if (leaveData) setTotalLeave(leaveData.total_allowed_leave);

        setUserPosition(userData.position);

        const { data: scheduleData } = await supabase
          .from('pharmacy_schedules').select('*, pharmacy_users(name)').eq('status', 'approved');
        if (scheduleData) {
          setSchedules(scheduleData);
          const used = scheduleData.filter(s => s.user_id === userData.id && ['연차','반차'].includes(s.type)).length;
          setUsedLeave(used);

          // 연간 달력용: 내 연차 날짜 Set
          const usedDates = new Set<string>();
          scheduleData
            .filter(s => s.user_id === userData.id && ['연차','반차'].includes(s.type))
            .forEach(s => {
              let d = new Date(s.start_date);
              const end = new Date(s.end_date);
              while (d <= end) {
                usedDates.add(d.toISOString().split('T')[0]);
                d.setDate(d.getDate() + 1);
              }
            });
          setMyUsedDates(usedDates);
        }
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const toDateStr = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getSchedulesForDay = (dateStr: string) =>
    schedules.filter(s => s.start_date <= dateStr && s.end_date >= dateStr);

  const typeColor: any = { 연차: 'bg-red-400', 반차: 'bg-orange-300', 근무: 'bg-blue-400' };

  const remainLeave = totalLeave - usedLeave;
  const currentMonthNum = new Date().getMonth() + 1;
  const recommendedUsage = (totalLeave / 12) * currentMonthNum;
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

  const holidays = getKoreanHolidays(calYear);

  return (
    <div className="min-h-screen bg-gray-300">
      <div className="max-w-5xl mx-auto bg-gray-50 min-h-screen p-6">
      <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold text-blue-600">🏥 1번약국</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/board')} className="text-sm text-blue-500 hover:underline">📋 게시판</button>
          <button onClick={() => router.push('/contacts')} className="text-sm text-blue-500 hover:underline">📞 거래처</button>
          {userPosition !== '국장' && (
            <button onClick={() => router.push('/leave')} className="text-sm text-blue-500 hover:underline">📅 연차신청</button>
          )}
          {userPosition === '국장' && (
            <button onClick={() => router.push('/leave')} className="text-sm text-blue-500 hover:underline">✈️ 해외체류</button>
          )}
          {['조제실장', '전산실장', '부국장', '국장'].includes(userPosition) && (
            <button onClick={() => router.push('/admin')} className="text-sm text-green-600 hover:underline font-medium">✅ 연차승인</button>
          )}
          {['부국장', '국장'].includes(userPosition) && (
            <button onClick={() => router.push('/employees')} className="text-sm text-purple-600 hover:underline font-medium">👥 직원관리</button>
          )}
          <span className="text-gray-700 font-medium">{userName}님</span>
          <button onClick={handleLogout} className="text-sm text-gray-400 underline">로그아웃</button>
        </div>
      </header>

      <section className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6 rounded shadow-sm">
        <h2 className="font-bold text-yellow-800">📢 이번 주 약국 공지</h2>
        <p className="text-yellow-700 mt-1">타이레놀 500mg 장기 품절입니다. 대체 조제 시 환자분들께 꼭 설명 부탁드립니다!</p>
      </section>

      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">📅 스케줄 및 연차 달력</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); } else setCurrentMonth(m => m-1); }}
              className="p-2 hover:bg-gray-100 rounded">◀</button>
            <span className="font-bold">{currentYear}년 {monthNames[currentMonth]} ~ {
              (() => {
                const m2 = (currentMonth + 2) % 12;
                const y2 = currentMonth + 2 > 11 ? currentYear + 1 : currentYear;
                return `${y2 !== currentYear ? y2 + '년 ' : ''}${monthNames[m2]}`;
              })()
            }</span>
            <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); } else setCurrentMonth(m => m+1); }}
              className="p-2 hover:bg-gray-100 rounded">▶</button>
          </div>
        </div>

        <div className="flex gap-4 mb-4 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block"/>연차</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 inline-block"/>반차</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block"/>근무</span>
        </div>

        <div className="space-y-8">
          {[0, 1, 2].map(offset => {
            const mOffset = (currentMonth + offset) % 12;
            const yOffset = currentMonth + offset > 11 ? currentYear + 1 : currentYear;
            const dim = getDaysInMonth(yOffset, mOffset);
            const fd = getFirstDayOfMonth(yOffset, mOffset);
            const todayStr = toDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

            return (
              <div key={offset}>
                <h3 className="text-base font-bold text-gray-700 mb-2">{yOffset}년 {monthNames[mOffset]}</h3>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['일','월','화','수','목','금','토'].map((day, i) => (
                    <div key={day} className={`font-bold bg-gray-100 py-2 rounded text-sm
                      ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700'}`}>{day}</div>
                  ))}
                  {Array.from({ length: fd }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: dim }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = toDateStr(yOffset, mOffset, day);
                    const daySchedules = getSchedulesForDay(dateStr);
                    const dayOfWeek = (fd + i) % 7;
                    const isToday = dateStr === todayStr;

                    return (
                      <div key={day} className={`border rounded p-1.5 min-h-32 hover:bg-blue-50 cursor-pointer
                        ${isToday ? 'border-blue-400 bg-blue-50' : ''}`}>
                        <span className={`text-base font-medium
                          ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-800'}
                          ${isToday ? 'bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto' : ''}`}>
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {daySchedules.slice(0, 3).map(s => (
                            <div key={s.id} className={`text-sm text-white rounded px-1 truncate ${typeColor[s.type] || 'bg-gray-400'}`}>
                              {s.pharmacy_users?.name} {s.type}
                            </div>
                          ))}
                          {daySchedules.length > 3 && (
                            <div className="text-sm text-gray-400">+{daySchedules.length - 3}명</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 나의 연차 현황 */}
      <section className="bg-white p-6 rounded-lg shadow">
        {/* 요약 + 가이드 */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-lg font-bold mb-1">나의 연차 현황</h2>
            <p className="text-sm text-gray-500">
              총 {totalLeave}개 중 <strong>{usedLeave}개 사용</strong> (잔여: <span className="text-blue-600 font-bold text-lg">{remainLeave}</span>개)
            </p>
          </div>
          <div className="text-right bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-bold text-blue-800">💡 {currentMonthNum}월 기준 연차 사용 가이드</p>
            <p className="text-sm text-blue-600 mt-1">현재까지 <strong>{recommendedUsage.toFixed(1)}개</strong> 사용 권장</p>
            {usedLeave < recommendedUsage
              ? <p className="text-xs text-green-600 mt-1">이번 달엔 하루 쉬어가는 건 어떨까요?</p>
              : <p className="text-xs text-gray-500 mt-1">적절한 페이스로 사용 중이십니다.</p>
            }
          </div>
        </div>

        {/* 연간 달력 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">{calYear}년 연간 현황</span>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block rounded-sm bg-green-400" style={{width:12,height:12}}/>연차 사용
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block rounded-sm bg-red-300" style={{width:12,height:12}}/>공휴일
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalYear(y => y - 1)} className="px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded">◀</button>
              <button onClick={() => setCalYear(new Date().getFullYear())} className="px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 border border-gray-300 rounded">올해</button>
              <button onClick={() => setCalYear(y => y + 1)} className="px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 rounded">▶</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="border-collapse">
              <tbody>
                {Array.from({ length: 12 }, (_, mi) => {
                  const month = mi + 1;
                  const dim = new Date(calYear, month, 0).getDate();
                  return (
                    <tr key={month}>
                      <td style={{ width: 28, paddingRight: 6, fontSize: 11, color: '#9ca3af', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {month}월
                      </td>
                      {Array.from({ length: 31 }, (_, di) => {
                        const day = di + 1;
                        if (day > dim) {
                          return <td key={day} style={{ width: 14, padding: 1 }} />;
                        }
                        const mm = String(month).padStart(2, '0');
                        const dd = String(day).padStart(2, '0');
                        const dateStr = `${calYear}-${mm}-${dd}`;
                        const dow = new Date(dateStr).getDay();
                        const isHoliday = holidays.has(dateStr);
                        const isUsed = myUsedDates.has(dateStr);
                        const isWeekend = dow === 0 || dow === 6;

                        let bg = '#e5e7eb';
                        if (isUsed) bg = '#4ade80';
                        else if (isHoliday) bg = '#fca5a5';
                        else if (isWeekend) bg = '#f3f4f6';

                        return (
                          <td key={day} style={{ width: 14, padding: 1 }}>
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 2,
                                backgroundColor: bg,
                                cursor: isUsed ? 'pointer' : 'default',
                              }}
                              title={isUsed ? `${calYear}-${mm}-${dd} 연차 사용` : isHoliday ? '공휴일' : undefined}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
    </div>
  );
}