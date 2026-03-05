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
  const [customReason, setCustomReason] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  // 수정 모달
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editDates, setEditDates] = useState<string[]>([]);
  const [editType, setEditType] = useState('연차');
  const [editYear, setEditYear] = useState(new Date().getFullYear());
  const [editMonth, setEditMonth] = useState(new Date().getMonth());

  // 삭제 확인 모달
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase
        .from('pharmacy_users').select('*').eq('auth_id', user.id).maybeSingle();

      if (data) {
        setUserId(data.id);
        setUserName(data.name);
        setUserPosition(data.position);
        if (data.position === '국장') setLeaveType('해외');

        const { data: leaveData } = await supabase
          .from('user_leave_status').select('total_allowed_leave').eq('id', data.id).maybeSingle();
        if (leaveData) setTotalLeave(leaveData.total_allowed_leave);

        fetchSchedules(data.id);
      }
    };
    init();
  }, []);

  const fetchSchedules = async (uid?: string) => {
    const { data } = await supabase
      .from('pharmacy_schedules').select('*').eq('user_id', uid || userId).order('start_date', { ascending: false });
    if (data) setSchedules(data);
  };

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
    if (!leaveType || leaveType.trim() === '') return alert('사유를 입력해주세요!');
    const sorted = [...selectedDates].sort();
    const isGukjang = userPosition === '국장';

    let hasError = false;
    for (const date of sorted) {
      const { error } = await supabase.from('pharmacy_schedules').insert({
        user_id: userId,
        title: `${userName} ${leaveType.trim()}`,
        type: leaveType.trim(),
        start_date: date,
        end_date: date,
        status: isGukjang ? 'approved' : 'pending'
      });
      if (error) { console.error(error); hasError = true; }
    }
    if (hasError) return alert('저장 중 오류가 발생했습니다.');
    setSelectedDates([]);
    setIsCustom(false);
    setCustomReason('');
    setLeaveType('연차');
    await fetchSchedules(userId);
  };

  // 수정 모달 열기
  const openEdit = (s: any) => {
    setEditTarget(s);
    setEditType(s.type);
    // 기존 날짜를 선택 상태로 세팅
    const dates: string[] = [];
    let d = new Date(s.start_date);
    const end = new Date(s.end_date);
    while (d <= end) {
      dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }
    setEditDates(dates);
    const firstDate = new Date(s.start_date);
    setEditYear(firstDate.getFullYear());
    setEditMonth(firstDate.getMonth());
  };

  const handleEditDayClick = (dateStr: string) => {
    setEditDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleEditSubmit = async () => {
    if (!editTarget || editDates.length === 0) return alert('날짜를 선택해주세요!');
    const sorted = [...editDates].sort();

    // 기존 삭제 후 새로 등록 (pending으로 재신청)
    await supabase.from('pharmacy_schedules').delete().eq('id', editTarget.id);

    const isGukjang = userPosition === '국장';
    for (const date of sorted) {
      await supabase.from('pharmacy_schedules').insert({
        user_id: userId,
        title: `${userName} ${editType}`,
        type: editType,
        start_date: date,
        end_date: date,
        status: isGukjang ? 'approved' : 'pending'
      });
    }
    setEditTarget(null);
    fetchSchedules();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('pharmacy_schedules').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null);
    fetchSchedules();
  };

  const usedLeave = schedules.filter(s => s.status === 'approved' && ['연차', '반차', '해외'].includes(s.type)).length;
  const statusLabel: any = { pending: '⏳ 승인대기', approved: '✅ 승인', rejected: '❌ 반려' };
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const isGukjang = userPosition === '국장';

  const editDaysInMonth = getDaysInMonth(editYear, editMonth);
  const editFirstDay = getFirstDayOfMonth(editYear, editMonth);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold text-blue-600">🏥 1번약국</h1>
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

      {/* 신청 폼 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-4">
          {isGukjang ? '✈️ 해외체류 일정 등록' : '📅 연차 신청'}
        </h2>
        {!isGukjang && (
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            {['연차', '반차'].map(type => (
              <button key={type} onClick={() => { setLeaveType(type); setIsCustom(false); }}
                className={`px-6 py-2 rounded-full font-medium ${leaveType === type && !isCustom ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {type}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
              <button onClick={() => { setIsCustom(true); setLeaveType(customReason || ''); }}
                className={`px-6 py-2 rounded-full font-medium ${isCustom ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                기타사유
              </button>
              {isCustom && (
                <input
                  type="text"
                  value={customReason}
                  onChange={e => { setCustomReason(e.target.value); setLeaveType(e.target.value); }}
                  placeholder="예비군, 경조사 등"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-purple-400 w-56"
                />
              )}
            </div>
          </div>
        )}
        <div className="border rounded-lg overflow-hidden">
          <div className="flex justify-between items-center bg-gray-50 p-3">
            <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); } else setCurrentMonth(m => m-1); }} className="p-2 hover:bg-gray-200 rounded">◀</button>
            <span className="font-bold">{currentYear}년 {monthNames[currentMonth]}</span>
            <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); } else setCurrentMonth(m => m+1); }} className="p-2 hover:bg-gray-200 rounded">▶</button>
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
          <button onClick={() => setSelectedDates([])} className="px-6 py-2 border rounded hover:bg-gray-50">선택 해제</button>
          <button onClick={handleSubmit}
            className={`px-6 py-2 text-white rounded font-medium ${isGukjang ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}>
            {isGukjang ? '일정 등록' : '신청하기'}
          </button>
        </div>
      </div>

      {/* 신청 내역 */}
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
            <div className="flex items-center gap-3">
              <span className="text-sm">{statusLabel[s.status]}</span>
              {/* 승인대기: 수정 + 삭제 / 승인됨: 수정만 */}
              {s.status === 'pending' && (
                <>
                  <button onClick={() => openEdit(s)}
                    className="text-xs text-blue-500 hover:text-blue-700 border border-blue-300 rounded px-2 py-1">수정</button>
                  <button onClick={() => setDeleteTarget(s)}
                    className="text-xs text-red-500 hover:text-red-700 border border-red-300 rounded px-2 py-1">삭제</button>
                </>
              )}
              {s.status === 'approved' && !isGukjang && (
                <button onClick={() => openEdit(s)}
                  className="text-xs text-orange-500 hover:text-orange-700 border border-orange-300 rounded px-2 py-1">수정(재신청)</button>
              )}
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-center text-gray-400 p-8">
            {isGukjang ? '등록된 해외체류 일정이 없습니다' : '신청 내역이 없습니다'}
          </p>
        )}
      </div>

      {/* 수정 모달 */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">연차 수정</h3>
            {editTarget.status === 'approved' && (
              <p className="text-xs text-orange-500 mb-3">⚠️ 승인된 연차를 수정하면 다시 승인 대기 상태가 됩니다.</p>
            )}
            {!isGukjang && (
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                {['연차', '반차'].map(type => (
                  <button key={type} onClick={() => setEditType(type)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium ${editType === type && !['연차','반차'].every(t => t !== editType) ? 'bg-blue-500 text-white' : editType === type ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {type}
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-1 pl-2 border-l border-gray-200">
                  <button onClick={() => { if (editType === '연차' || editType === '반차') setEditType(''); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium ${editType !== '연차' && editType !== '반차' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    기타
                  </button>
                  {editType !== '연차' && editType !== '반차' && (
                    <input
                      type="text"
                      value={editType}
                      onChange={e => setEditType(e.target.value)}
                      placeholder="예비군, 경조사 등"
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-purple-400 w-32"
                    />
                  )}
                </div>
              </div>
            )}
            {/* 수정용 달력 */}
            <div className="border rounded-lg overflow-hidden mb-4">
              <div className="flex justify-between items-center bg-gray-50 p-2">
                <button onClick={() => { if (editMonth === 0) { setEditMonth(11); setEditYear(y => y-1); } else setEditMonth(m => m-1); }} className="p-1 hover:bg-gray-200 rounded">◀</button>
                <span className="font-bold text-sm">{editYear}년 {monthNames[editMonth]}</span>
                <button onClick={() => { if (editMonth === 11) { setEditMonth(0); setEditYear(y => y+1); } else setEditMonth(m => m+1); }} className="p-1 hover:bg-gray-200 rounded">▶</button>
              </div>
              <div className="grid grid-cols-7 text-center">
                {['일','월','화','수','목','금','토'].map((d, i) => (
                  <div key={d} className={`py-1.5 text-xs font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-700'}`}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 text-center">
                {Array.from({ length: editFirstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: editDaysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = toDateStr(editYear, editMonth, day);
                  const isSelected = editDates.includes(dateStr);
                  const dayOfWeek = (editFirstDay + i) % 7;
                  return (
                    <div key={day} onClick={() => handleEditDayClick(dateStr)}
                      className={`py-2 cursor-pointer text-xs mx-0.5 my-0.5 rounded-full
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
            {editDates.length > 0 && (
              <p className="text-xs text-blue-600 mb-3">선택된 날짜 ({editDates.length}일): {[...editDates].sort().join(', ')}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setEditTarget(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleEditSubmit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg">
                {editTarget.status === 'approved' ? '수정 후 재신청' : '수정하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">연차 삭제</h3>
            <p className="text-sm text-gray-600 mb-6">
              <span className="font-semibold text-red-600">{deleteTarget.start_date} ~ {deleteTarget.end_date}</span><br/>
              {deleteTarget.type} 신청을 삭제하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm py-2 rounded-lg">삭제하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}