'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function LeavePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userPosition, setUserPosition] = useState('');
  const [totalLeave, setTotalLeave] = useState(0);
  const [leaveType, setLeaveType] = useState('연차');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data, error } = await supabase
        .from('pharmacy_users')
        .select('*')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (data) {
        setUserId(data.id);
        setUserName(data.name);
        setUserPosition(data.position);

        // 국장이면 연차 타입을 '해외'로 초기화
        if (data.position === '국장') setLeaveType('해외');

        const { data: leaveData } = await supabase
          .from('user_leave_status')
          .select('total_allowed_leave')
          .eq('id', data.id)
          .maybeSingle();
        if (leaveData) setTotalLeave(leaveData.total_allowed_leave);

        const { data: scheduleData } = await supabase
          .from('pharmacy_schedules')
          .select('*')
          .eq('user_id', data.id)
          .order('start_date', { ascending: false });
        if (scheduleData) setSchedules(scheduleData);
      }
    };
    init();
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const toDateStr = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const handleDayClick = (dateStr: string) => {
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleSubmit = async () => {
    if (selectedDates.length === 0) return alert('날짜를 선택해주세요!');
    const sorted = [...selectedDates].sort();
    const isGukjang = userPosition === '국장';

    for (const date of sorted) {
      await supabase.from('pharmacy_schedules').insert({
        user_id: userId,
        title: `${userName} ${leaveType}`,
        type: leaveType,
        start_date: date,
        end_date: date,
        status: isGukjang ? 'approved' : 'pending'
      });
    }
    setSelectedDates([]);
    const { data } = await supabase.from('pharmacy_schedules').select('*').eq('user_id', userId).order('start_date', { ascending: false });
    if (data) setSchedules(data);
  };

  const usedLeave = schedules.filter(s => s.status === 'approved' && ['연차', '반차', '해외'].includes(s.type)).length;
  const statusLabel: any = { pending: '⏳ 승인대기', approved: '✅ 승인', rejected: '❌ 반려' };
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const isGukjang = userPosition === '국장';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold text-blue-600">🏥 우리약국 직원 허브</h1>
        <button onClick={() => router.push('/')} className="text-sm text-blue-500 underline">← 메인으로</button>
      </header>

      {!isGukjang && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-500">총 연차</p>
            <p className="text-3xl font-bold text-blue-600">{totalLeave}개</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-500">사용</p>
            <p className="text-3xl font-bold text-red-500">{usedLeave}개</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow text-center">
            <p className="text-sm text-gray-500">잔여</p>
            <p className="text-3xl font-bold text-green-500">{totalLeave - usedLeave}개</p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-4">
          {isGukjang ? '✈️ 해외체류 일정 등록' : '📅 연차 신청'}
        </h2>

        {!isGukjang && (
          <div className="flex gap-3 mb-4">
            {['연차', '반차'].map(type => (
              <button key={type} onClick={() => setLeaveType(type)}
                className={`px-6 py-2 rounded-full font-medium ${leaveType === type ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {type}
              </button>
            ))}
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <div className="flex justify-between items-center bg-gray-50 p-3">
            <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); } else setCurrentMonth(m => m-1); }}
              className="p-2 hover:bg-gray-200 rounded">◀</button>
            <span className="font-bold">{currentYear}년 {monthNames[currentMonth]}</span>
            <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); } else setCurrentMonth(m => m+1); }}
              className="p-2 hover:bg-gray-200 rounded">▶</button>
          </div>

          <div className="grid grid-cols-7 text-center">
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <div key={d} className={`py-2 text-sm font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-800'}`}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 text-center">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = toDateStr(currentYear, currentMonth, day);
              const isSelected = selectedDates.includes(dateStr);
              const dayOfWeek = (firstDay + i) % 7;

              return (
                <div key={day} onClick={() => handleDayClick(dateStr)}
                  className={`py-3 cursor-pointer text-sm mx-1 my-1 rounded-full
                    ${isSelected ? 'bg-green-500 text-white font-bold' : ''}
                    ${!isSelected && dayOfWeek === 0 ? 'text-red-400' : ''}
                    ${!isSelected && dayOfWeek === 6 ? 'text-blue-400' : ''}
                    ${!isSelected && dayOfWeek !== 0 && dayOfWeek !== 6 ? 'text-gray-900' : ''}
                    hover:bg-green-100`}>
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {selectedDates.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            선택된 날짜 ({selectedDates.length}일): {[...selectedDates].sort().join(', ')}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={() => setSelectedDates([])}
            className="px-6 py-2 border rounded hover:bg-gray-50">선택 해제</button>
          <button onClick={handleSubmit}
            className={`px-6 py-2 text-white rounded font-medium ${isGukjang ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}>
            {isGukjang ? '일정 등록' : '신청하기'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <h2 className="text-lg font-bold p-4 border-b">
          {isGukjang ? '📋 해외체류 내역' : '📋 신청 내역'}
        </h2>
        {schedules.map(s => (
          <div key={s.id} className="flex justify-between items-center border-b p-4">
            <div>
              <span className="font-medium">{s.type}</span>
              <p className="text-sm text-gray-500">{s.start_date} ~ {s.end_date}</p>
            </div>
            <span className="text-sm">{statusLabel[s.status]}</span>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-center text-gray-400 p-8">
            {isGukjang ? '등록된 해외체류 일정이 없습니다' : '신청 내역이 없습니다'}
          </p>
        )}
      </div>
    </div>
  );
}