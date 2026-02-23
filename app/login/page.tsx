'use client';
import { useState } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!loginId || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');

    // 이름으로 이메일 조회
    const { data: userData, error: userError } = await supabase
      .from('pharmacy_users')
      .select('email')
      .eq('name', loginId.trim())
      .maybeSingle();

    if (userError || !userData?.email) {
      setError('아이디를 찾을 수 없습니다.');
      setLoading(false);
      return;
    }

    // 이메일로 로그인
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    });

    if (authError) {
      setError('비밀번호가 틀렸습니다.');
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-md">
        <h1 className="text-2xl font-bold text-blue-600 mb-6 text-center">🏥 1번약국</h1>

        <label className="block text-sm font-semibold text-gray-800 mb-1">아이디 (이름)</label>
        <input
          className="w-full border border-gray-300 p-3 rounded mb-4 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-blue-400"
          type="text"
          placeholder="예: 최우석"
          value={loginId}
          onChange={e => setLoginId(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        <label className="block text-sm font-semibold text-gray-800 mb-1">비밀번호</label>
        <input
          className="w-full border border-gray-300 p-3 rounded mb-4 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-blue-400"
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-500 text-white p-3 rounded font-bold hover:bg-blue-600 disabled:opacity-50">
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </div>
    </div>
  );
}