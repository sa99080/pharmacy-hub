'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState({ company_name: '', category: '', manager_name: '', phone_number: '', memo: '' });
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    const { data } = await supabase.from('pharmacy_contacts').select('*').order('category');
    if (data) setContacts(data);
  };

  const handleSubmit = async () => {
    if (!form.company_name) return;
    await supabase.from('pharmacy_contacts').insert(form);
    setForm({ company_name: '', category: '', manager_name: '', phone_number: '', memo: '' });
    setShowForm(false);
    fetchContacts();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold text-blue-600">🏥 우리약국 직원 허브</h1>
        <button onClick={() => router.push('/')} className="text-sm text-blue-500 underline">← 메인으로</button>
      </header>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">📞 거래처 연락처</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">+ 추가</button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <input className="border p-2 rounded mb-2 w-full" placeholder="거래처명*" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
          <input className="border p-2 rounded mb-2 w-full" placeholder="분류 (예: 도매, 제약사)" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
          <input className="border p-2 rounded mb-2 w-full" placeholder="담당자명" value={form.manager_name} onChange={e => setForm({...form, manager_name: e.target.value})} />
          <input className="border p-2 rounded mb-2 w-full" placeholder="전화번호" value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} />
          <input className="border p-2 rounded mb-2 w-full" placeholder="메모" value={form.memo} onChange={e => setForm({...form, memo: e.target.value})} />
          <button onClick={handleSubmit} className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">저장</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {contacts.map(c => (
          <div key={c.id} className="flex justify-between items-center border-b p-4 hover:bg-gray-50">
            <div>
              <span className="font-medium">{c.company_name}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded ml-2">{c.category}</span>
              <p className="text-sm text-gray-500 mt-1">{c.manager_name} · {c.memo}</p>
            </div>
            <a href={`tel:${c.phone_number}`} className="text-blue-500 font-medium">{c.phone_number}</a>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-center text-gray-400 p-8">거래처를 추가해보세요!</p>}
      </div>
    </div>
  );
}