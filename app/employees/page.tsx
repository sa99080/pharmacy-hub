'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabase'

const POSITIONS = ['조제보조', '전산보조', '조제실장', '전산실장', '약사', '부국장', '국장']
const ADMIN_POSITIONS = ['부국장', '국장']

type Employee = {
  id: string
  name: string
  position: string
  email: string
  auth_id: string | null
  hire_date?: string
  usedLeave?: number
  totalLeave?: number
}

const POSITION_RANK: Record<string, number> = {
  국장: 1,
  부국장: 2,
  조제실장: 3,
  전산실장: 3,
  약사: 4,
  조제보조: 5,
  전산보조: 5,
}

export default function EmployeesPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<{ name: string; position: string } | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPosition, setNewPosition] = useState('조제보조')
  const [newPassword, setNewPassword] = useState('')
  const [newHireDate, setNewHireDate] = useState('')

  const [editName, setEditName] = useState('')
  const [editPosition, setEditPosition] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('pharmacy_users')
      .select('name, position')
      .eq('auth_id', user.id)
      .single()

    if (!data || !ADMIN_POSITIONS.includes(data.position)) {
      router.push('/')
      return
    }
    setCurrentUser(data)
    fetchEmployees()
  }

  async function fetchEmployees() {
    setLoading(true)

    const { data: empData } = await supabase
      .from('pharmacy_users')
      .select('id, name, position, email, auth_id, hire_date')

    if (!empData) { setLoading(false); return }

    // 연차 총 개수 (user_leave_status 뷰)
    const { data: leaveStatus } = await supabase
      .from('user_leave_status')
      .select('id, total_allowed_leave')

    // 사용한 연차/반차 (승인된 것)
    const { data: schedules } = await supabase
      .from('pharmacy_schedules')
      .select('user_id, type')
      .eq('status', 'approved')
      .in('type', ['연차', '반차'])

    const merged = empData.map(emp => {
      const leaveInfo = leaveStatus?.find(l => l.id === emp.id)
      const used = schedules?.filter(s => s.user_id === emp.id).length || 0
      return {
        ...emp,
        usedLeave: used,
        totalLeave: leaveInfo?.total_allowed_leave || 0,
      }
    }).sort((a, b) => {
      const rankDiff = (POSITION_RANK[a.position] || 99) - (POSITION_RANK[b.position] || 99)
      if (rankDiff !== 0) return rankDiff
      // 동급이면 입사일 오름차순 (빠른 사람이 위)
      return (a.hire_date || '').localeCompare(b.hire_date || '')
    })

    setEmployees(merged)
    setLoading(false)
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleAddEmployee() {
    if (!newName || !newEmail || !newPassword) {
      showMessage('error', '이름, 이메일, 비밀번호를 모두 입력해주세요.')
      return
    }
    setActionLoading(true)
    try {
      // 현재 관리자 세션 저장
      const { data: { session: adminSession } } = await supabase.auth.getSession()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      })
      if (authError) throw authError

      const authId = authData.user?.id || null

      // 관리자 세션 복원 (signUp이 새 유저로 로그인시켜버리기 때문)
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        })
      }

      const { error: dbError } = await supabase
        .from('pharmacy_users')
        .insert({ name: newName, email: newEmail, position: newPosition, auth_id: authId, hire_date: newHireDate || null })
      if (dbError) throw dbError

      showMessage('success', `${newName} 직원이 추가되었습니다.`)
      setShowAddModal(false)
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewPosition('조제보조'); setNewHireDate('')
      fetchEmployees()
    } catch (err: any) {
      showMessage('error', err.message || '직원 추가 중 오류가 발생했습니다.')
    }
    setActionLoading(false)
  }

  async function handleEditEmployee() {
    if (!editTarget || !editName) return
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('pharmacy_users')
        .update({ name: editName, position: editPosition })
        .eq('id', editTarget.id)
      if (error) throw error
      showMessage('success', '직원 정보가 수정되었습니다.')
      setEditTarget(null)
      fetchEmployees()
    } catch (err: any) {
      showMessage('error', err.message || '수정 중 오류가 발생했습니다.')
    }
    setActionLoading(false)
  }

  async function handleDeleteEmployee() {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('pharmacy_users')
        .delete()
        .eq('id', deleteTarget.id)
      if (error) throw error
      showMessage('success', `${deleteTarget.name} 직원이 삭제되었습니다.`)
      setDeleteTarget(null)
      fetchEmployees()
    } catch (err: any) {
      showMessage('error', err.message || '삭제 중 오류가 발생했습니다.')
    }
    setActionLoading(false)
  }

  const positionBadgeColor: Record<string, string> = {
    조제보조: 'bg-blue-100 text-blue-700',
    전산보조: 'bg-purple-100 text-purple-700',
    조제실장: 'bg-cyan-100 text-cyan-700',
    전산실장: 'bg-indigo-100 text-indigo-700',
    약사: 'bg-green-100 text-green-700',
    부국장: 'bg-orange-100 text-orange-700',
    국장: 'bg-red-100 text-red-700',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1">
            ← 메인으로
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-lg font-bold text-gray-800">직원 관리</h1>
        </div>
        {currentUser && (
          <span className="text-sm text-gray-500">{currentUser.name} ({currentUser.position})</span>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {message && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">전체 직원</h2>
            <p className="text-sm text-gray-500 mt-1">총 {employees.length}명</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + 직원 추가
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">불러오는 중...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-600 font-semibold">이름</th>
                  <th className="text-left px-5 py-3 text-gray-600 font-semibold">직급</th>
                  <th className="text-left px-5 py-3 text-gray-600 font-semibold">이메일</th>
                  <th className="text-center px-5 py-3 text-gray-600 font-semibold">연차</th>
                  <th className="text-left px-5 py-3 text-gray-600 font-semibold">연동상태</th>
                  <th className="text-center px-5 py-3 text-gray-600 font-semibold">관리</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const remain = (emp.totalLeave || 0) - (emp.usedLeave || 0)
                  const isLow = remain <= 3 && (emp.totalLeave || 0) > 0
                  return (
                    <tr key={emp.id} className={`border-b border-gray-100 hover:bg-gray-50 ${idx === employees.length - 1 ? 'border-b-0' : ''}`}>
                      <td className="px-5 py-3 font-medium text-gray-800">{emp.name}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${positionBadgeColor[emp.position] || 'bg-gray-100 text-gray-600'}`}>
                          {emp.position}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{emp.email}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="font-semibold text-gray-800">{emp.usedLeave}</span>
                        <span className="text-gray-400 mx-0.5">/</span>
                        <span className="text-gray-500">{emp.totalLeave}</span>
                        {isLow && (
                          <span className="ml-1.5 text-xs text-red-400 font-medium">(잔여 {remain})</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {emp.auth_id ? (
                          <span className="text-green-600 text-xs font-medium">✓ 연동됨</span>
                        ) : (
                          <span className="text-gray-400 text-xs">미연동</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => { setEditTarget(emp); setEditName(emp.name); setEditPosition(emp.position) }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => setDeleteTarget(emp)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 직원 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5">신규 직원 추가</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="홍길동"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="staff@pharmacy.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">초기 비밀번호(6자리) *</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="휴대폰 끝4자리+11"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직급 *</label>
                <select value={newPosition} onChange={e => setNewPosition(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">입사일</label>
                <input type="date" value={newHireDate} onChange={e => setNewHireDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setNewName(''); setNewEmail(''); setNewPassword(''); setNewPosition('조제보조'); setNewHireDate('') }}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50" disabled={actionLoading}>
                취소
              </button>
              <button onClick={handleAddEmployee} disabled={actionLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50">
                {actionLoading ? '추가 중...' : '추가하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직원 수정 모달 */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5">직원 정보 수정</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직급</label>
                <select value={editPosition} onChange={e => setEditPosition(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-400">※ 이메일과 비밀번호는 Supabase 대시보드에서 변경해주세요.</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditTarget(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50" disabled={actionLoading}>
                취소
              </button>
              <button onClick={handleEditEmployee} disabled={actionLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50">
                {actionLoading ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">직원 삭제</h3>
            <p className="text-sm text-gray-600 mb-6">
              <span className="font-semibold text-red-600">{deleteTarget.name}</span> ({deleteTarget.position}) 직원을 삭제하시겠습니까?<br />
              <span className="text-xs text-gray-400 mt-1 block">※ pharmacy_users 테이블에서만 삭제됩니다. Auth 계정은 Supabase 대시보드에서 별도 삭제가 필요합니다.</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50" disabled={actionLoading}>
                취소
              </button>
              <button onClick={handleDeleteEmployee} disabled={actionLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50">
                {actionLoading ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}