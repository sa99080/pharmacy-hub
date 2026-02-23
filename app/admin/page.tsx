'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [userPosition, setUserPosition] = useState('');
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: userData } = await supabase
        .from('pharmacy_users').select('*').eq('auth_id', user.id).single();
      if (userData) {
        setUserPosition(userData.position);
        fetchSchedules(userData.position);
      }
    };
    init();
  }, []);

  const fetchSchedules = async (position: string) => {
    // 직급별 승인 가능한 대상 직급 목록
    const canApprove: Record<string, string[]> = {
      '조제실장': ['조제보조'],
      '전산실장': ['전산보조'],
      '부국장': ['조제보조', '전산보조', '조제실장', '전산실장', '약사'],
      '국장': ['조제보조', '전산보조', '조제실장', '전산실장', '약사', '부국장'],
    };

    const targets = canApprove[position];
    if (!targets) return;

    const { data: targetUsers } = await supabase
      .from('pharmacy_users').select('id').in('position', targets);
    const ids = targetUsers?.map(u => u.id) || [];
    if (ids.length === 0) return;

    const { data } = await supabase
      .from('pharmacy_schedules')
      .select('*, pharmacy_users(name, position)')
      .in('user_id', ids)
      .order('created_at', { ascending: false });
    if (data) setSchedules(data);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('pharmacy_schedules').update({ status }).eq('id', id);
    fetchSchedules(userPosition);
  };

  const statusLabel: any = { pending: '⏳ 승인대기', approved: '✅ 승인', rejected: '❌ 반려' };
  const statusColor: any = { pending: 'text-yellow-600', approved: 'text-green-600', rejected: 'text-red-500' };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold text-blue-600">🏥 연차 승인 관리</h1>
        <button onClick={() => router.push('/')} className="text-sm text-blue-500 underline">← 메인으로</button>
      </header>

      <div className="bg-white rounded-lg shadow">
        <h2 className="text-lg font-bold p-4 border-b">📋 연차 신청 목록</h2>
        {schedules.map(s => (
          <div key={s.id} className="flex justify-between items-center border-b p-4">
            <div>
              <span className="font-medium">{s.pharmacy_users?.name}</span>
              <span className="text-xs text-gray-500 ml-2">({s.pharmacy_users?.position})</span>
              <span className="ml-2 text-sm bg-gray-100 px-2 py-0.5 rounded">{s.type}</span>
              <p className="text-sm text-gray-500 mt-1">{s.start_date} ~ {s.end_date}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${statusColor[s.status]}`}>{statusLabel[s.status]}</span>
              {s.status === 'pending' && (
                <>
                  <button onClick={() => updateStatus(s.id, 'approved')}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">승인</button>
                  <button onClick={() => updateStatus(s.id, 'rejected')}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">반려</button>
                </>
              )}
              {s.status !== 'pending' && (
                <button onClick={() => updateStatus(s.id, 'pending')}
                  className="border px-3 py-1 rounded text-sm hover:bg-gray-50 text-gray-500">되돌리기</button>
              )}
            </div>
          </div>
        ))}
        {schedules.length === 0 && <p className="text-center text-gray-400 p-8">승인할 연차 신청이 없습니다</p>}
      </div>
    </div>
  );
}