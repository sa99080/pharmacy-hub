'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function BoardPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [category, setCategory] = useState('공지');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data } = await supabase.from('pharmacy_users').select('*').eq('auth_id', user.id).single();
      if (data) { setUserName(data.name); setUserId(data.id); }
      fetchPosts();
    };
    init();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase.from('pharmacy_board').select('*, pharmacy_users(name)').order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const handleSubmit = async () => {
    if (!title || !content) return;
    await supabase.from('pharmacy_board').insert({ author_id: userId, category, title, content });
    setTitle(''); setContent('');
    fetchPosts();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold text-blue-600">🏥 우리약국 직원 허브</h1>
        <button onClick={() => router.push('/')} className="text-sm text-blue-500 underline">← 메인으로</button>
      </header>

      <section className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-4">✏️ 글 작성</h2>
        <select className="border p-2 rounded mb-3 w-full" value={category} onChange={e => setCategory(e.target.value)}>
          <option>공지</option>
          <option>인수인계</option>
          <option>건의</option>
        </select>
        <input className="border p-2 rounded mb-3 w-full" placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="border p-2 rounded mb-3 w-full h-24" placeholder="내용" value={content} onChange={e => setContent(e.target.value)} />
        <button onClick={handleSubmit} className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">등록</button>
      </section>

      <section className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">📋 게시글 목록</h2>
        {posts.map(post => (
          <div key={post.id} className="border-b py-3">
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded mr-2">{post.category}</span>
            <span className="font-medium">{post.title}</span>
            <p className="text-sm text-gray-500 mt-1">{post.content}</p>
            <p className="text-xs text-gray-400 mt-1">{post.pharmacy_users?.name} · {new Date(post.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </section>
    </div>
  );
}