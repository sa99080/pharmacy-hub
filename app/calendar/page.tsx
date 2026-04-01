'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function getKoreanHolidayNames(year: number): Record<string, string> {
  const h: Record<string, string> = {
    [`${year}-01-01`]: '신정',
    [`${year}-03-01`]: '삼일절',
    [`${year}-05-05`]: '어린이날',
    [`${year}-06-06`]: '현충일',
    [`${year}-08-15`]: '광복절',
    [`${year}-10-03`]: '개천절',
    [`${year}-10-09`]: '한글날',
    [`${year}-12-25`]: '크리스마스',
  };
  const lunar: Record<number, Record<string, string>> = {
    2024: {
      '2024-02-09': '설날 연휴', '2024-02-10': '설날', '2024-02-11': '설날 연휴',
      '2024-05-15': '부처님오신날', '2024-09-16': '추석 연휴', '2024-09-17': '추석', '2024-09-18': '추석 연휴',
    },
    2025: {
      '2025-01-28': '설날 연휴', '2025-01-29': '설날', '2025-01-30': '설날 연휴',
      '2025-05-05': '부처님오신날', '2025-10-05': '추석 연휴', '2025-10-06': '추석', '2025-10-07': '추석 연휴',
    },
    2026: {
      '2026-02-17': '설날 연휴', '2026-02-18': '설날', '2026-02-19': '설날 연휴',
      '2026-05-24': '부처님오신날', '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
    },
    2027: {
      '2027-02-06': '설날 연휴', '2027-02-07': '설날', '2027-02-08': '설날 연휴',
      '2027-05-13': '부처님오신날', '2027-09-14': '추석 연휴', '2027-09-15': '추석', '2027-09-16': '추석 연휴',
    },
  };
  if (lunar[year]) Object.assign(h, lunar[year]);
  return h;
}

export default function PublicCalendarPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      const { data } = await supabase
        .from('pharmacy_schedules')
        .select('*, pharmacy_users(name)')
        .eq('status', 'approved');
      if (data) setSchedules(data);
      setLoading(false);
    };
    fetchSchedules();
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const toDateStr = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const getSchedulesForDay = (dateStr: string) =>
    schedules.filter(s => s.start_date <= dateStr && s.end_date >= dateStr);

  const typeColor: any = { 연차: 'bg-red-400', 반차: 'bg-orange-300', 근무: 'bg-blue-400' };

  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const todayStr = toDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  return (
    <div className="min-h-screen bg-gray-300">
      <div className="max-w-5xl mx-auto bg-gray-50 min-h-screen p-6">

        <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow mb-6">
          <h1 className="text-2xl font-bold text-blue-600">🏥 1번약국 일정표</h1>
          <span className="text-sm text-gray-400">공개 달력</span>
        </header>

        <section className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">📅 스케줄 및 연차 달력</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }}
                className="p-2 hover:bg-gray-100 rounded">◀</button>
              <span className="font-bold">{currentYear}년 {monthNames[currentMonth]} ~ {
                (() => {
                  const m2 = (currentMonth + 2) % 12;
                  const y2 = currentMonth + 2 > 11 ? currentYear + 1 : currentYear;
                  return `${y2 !== currentYear ? y2 + '년 ' : ''}${monthNames[m2]}`;
                })()
              }</span>
              <button
                onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }}
                className="p-2 hover:bg-gray-100 rounded">▶</button>
            </div>
          </div>

          <div className="flex gap-4 mb-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" />연차</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 inline-block" />반차</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400 inline-block" />근무</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400 inline-block" />기타</span>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400">불러오는 중...</div>
          ) : (
            <div className="space-y-8">
              {[0, 1, 2].map(offset => {
                const mOffset = (currentMonth + offset) % 12;
                const yOffset = currentMonth + offset > 11 ? currentYear + 1 : currentYear;
                const dim = getDaysInMonth(yOffset, mOffset);
                const fd = getFirstDayOfMonth(yOffset, mOffset);
                const holidayNames = getKoreanHolidayNames(yOffset);

                return (
                  <div key={offset}>
                    <h3 className="text-base font-bold text-gray-700 mb-2">{yOffset}년 {monthNames[mOffset]}</h3>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
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
                        const holidayName = holidayNames[dateStr];
                        const isRed = dayOfWeek === 0 || !!holidayName;

                        return (
                          <div key={day} className={`border rounded p-1.5 min-h-32
                            ${isToday ? 'border-blue-400 bg-blue-50' : ''}`}>
                            <span className={`text-base font-medium
                              ${isRed ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-800'}
                              ${isToday ? 'bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center mx-auto' : ''}`}>
                              {day}
                            </span>
                            {holidayName && (
                              <div className="text-xs text-red-400 truncate mt-0.5">{holidayName}</div>
                            )}
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
          )}
        </section>
      </div>
    </div>
  );
}