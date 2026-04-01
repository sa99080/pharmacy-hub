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
      '2024-02-09': '설날연휴', '2024-02-10': '설날', '2024-02-11': '설날연휴',
      '2024-05-15': '부처님오신날', '2024-09-16': '추석연휴', '2024-09-17': '추석', '2024-09-18': '추석연휴',
    },
    2025: {
      '2025-01-28': '설날연휴', '2025-01-29': '설날', '2025-01-30': '설날연휴',
      '2025-05-05': '부처님오신날', '2025-10-05': '추석연휴', '2025-10-06': '추석', '2025-10-07': '추석연휴',
    },
    2026: {
      '2026-02-17': '설날연휴', '2026-02-18': '설날', '2026-02-19': '설날연휴',
      '2026-05-24': '부처님오신날', '2026-09-24': '추석연휴', '2026-09-25': '추석', '2026-09-26': '추석연휴',
    },
    2027: {
      '2027-02-06': '설날연휴', '2027-02-07': '설날', '2027-02-08': '설날연휴',
      '2027-05-13': '부처님오신날', '2027-09-14': '추석연휴', '2027-09-15': '추석', '2027-09-16': '추석연휴',
    },
  };
  if (lunar[year]) Object.assign(h, lunar[year]);
  return h;
}

const typeColor: any = {
  연차: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
  반차: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' },
  근무: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
};

export default function PublicCalendarPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); } else setCurrentMonth(m => m-1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); } else setCurrentMonth(m => m+1); };

  const dim = getDaysInMonth(currentYear, currentMonth);
  const fd = getFirstDayOfMonth(currentYear, currentMonth);
  const holidayNames = getKoreanHolidayNames(currentYear);
  const selectedSchedules = selectedDate ? getSchedulesForDay(selectedDate) : [];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-lg mx-auto bg-white min-h-screen flex flex-col">

        {/* 헤더 */}
        <div className="px-4 pt-5 pb-3 border-b border-gray-100">
          <h1 className="text-center text-base font-bold text-blue-600 mb-3">🏥 1번약국 일정표</h1>
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">◀</button>
            <span className="text-xl font-bold text-gray-800">{currentYear}년 {monthNames[currentMonth]}</span>
            <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">▶</button>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
          {[['bg-red-400','연차'],['bg-orange-400','반차'],['bg-blue-400','근무'],['bg-gray-400','기타']].map(([color, label]) => (
            <span key={label} className="flex items-center gap-1 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${color}`}/>
              {label}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">불러오는 중...</div>
        ) : (
          <div className="flex-1 px-2 pt-2 pb-4">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-1">
              {['일','월','화','수','목','금','토'].map((d, i) => (
                <div key={d} className={`text-center text-xs font-bold py-1.5
                  ${i===0?'text-red-500':i===6?'text-blue-500':'text-gray-400'}`}>{d}</div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
              {Array.from({ length: fd }).map((_, i) => (
                <div key={`e-${i}`} className="bg-white min-h-16" />
              ))}
              {Array.from({ length: dim }).map((_, i) => {
                const day = i + 1;
                const dateStr = toDateStr(currentYear, currentMonth, day);
                const daySchedules = getSchedulesForDay(dateStr);
                const dayOfWeek = (fd + i) % 7;
                const isToday = dateStr === todayStr;
                const holidayName = holidayNames[dateStr];
                const isRed = dayOfWeek === 0 || !!holidayName;
                const isSelected = selectedDate === dateStr;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`bg-white min-h-16 p-1 cursor-pointer transition-colors
                      ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'hover:bg-gray-50'}`}
                  >
                    {/* 날짜 숫자 */}
                    <div className="flex justify-center mb-1">
                      <span className={`text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-blue-500 text-white' :
                          isRed ? 'text-red-500' :
                          dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-800'}`}>
                        {day}
                      </span>
                    </div>

                    {/* 공휴일 이름 */}
                    {holidayName && (
                      <div className="text-center text-red-400 leading-tight mb-0.5" style={{fontSize:'8px'}}>
                        {holidayName}
                      </div>
                    )}

                    {/* 일정 도트 */}
                    {daySchedules.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {daySchedules.slice(0, 5).map((s, idx) => {
                          const c = typeColor[s.type];
                          return <span key={idx} className={`w-1.5 h-1.5 rounded-full ${c ? c.dot : 'bg-gray-400'}`} />;
                        })}
                        {daySchedules.length > 5 && (
                          <span className="text-gray-400" style={{fontSize:'8px'}}>+{daySchedules.length-5}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 선택된 날짜 상세 */}
            {selectedDate && (
              <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                  <span className="font-bold text-gray-700 text-sm">
                    {selectedDate.replace(/-/g, '.')} 일정
                  </span>
                  <span className="text-xs text-gray-400">{selectedSchedules.length}건</span>
                </div>
                {selectedSchedules.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-gray-400 text-center">등록된 일정이 없습니다</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {selectedSchedules.map(s => {
                      const c = typeColor[s.type];
                      return (
                        <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${c ? c.bg : 'bg-gray-50'}`}>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c ? c.dot : 'bg-gray-400'}`} />
                          <span className={`font-semibold text-sm ${c ? c.text : 'text-gray-700'}`}>
                            {s.pharmacy_users?.name}
                          </span>
                          <span className={`text-xs ml-auto px-2 py-0.5 rounded-full font-medium ${c ? c.bg+' '+c.text : 'bg-gray-100 text-gray-500'}`}>
                            {s.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}