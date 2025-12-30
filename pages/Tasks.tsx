
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { TaskPriority, UserRole, Task } from '../types';
import { CheckSquare, Plus, Calendar, User, Clock, AlertTriangle, CheckCircle, Trash2, Filter } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';

export const Tasks: React.FC = () => {
  const { tasks, users, currentUser, addTask, updateTaskStatus, deleteTask } = useStore();
  
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('PENDING');
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);

  const myTasks = useMemo(() => {
      if (!currentUser) return [];
      
      return tasks.filter(task => {
          // Admin hepsini görür, Personel sadece kendine atananları veya kendi oluşturduklarını görür
          const hasAccess = currentUser.role === UserRole.ADMIN 
              ? true 
              : (task.assignedTo === currentUser.id || task.createdBy === currentUser.name);
          
          if (!hasAccess) return false;

          if (filterStatus === 'ALL') return true;
          return task.status === filterStatus;
      }).sort((a, b) => {
          // Sıralama: Önce tamamlanmamışlar, sonra aciliyet, sonra tarih
          if (a.status !== b.status) return a.status === 'PENDING' ? -1 : 1;
          
          const priorityOrder = {
              [TaskPriority.VERY_HIGH]: 5,
              [TaskPriority.HIGH]: 4,
              [TaskPriority.MEDIUM]: 3,
              [TaskPriority.LOW]: 2,
              [TaskPriority.VERY_LOW]: 1
          };
          
          const pDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (pDiff !== 0) return pDiff;
          
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [tasks, currentUser, filterStatus]);

  const handleAddTask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      if (!title || !dueDate || !assignedTo) {
          alert("Lütfen zorunlu alanları doldurunuz.");
          return;
      }

      const assignedUser = users.find(u => u.id === assignedTo);
      
      await addTask({
          id: Math.random().toString(36).substr(2, 9),
          title,
          description,
          assignedTo,
          assignedToName: assignedUser?.username || 'Bilinmiyor',
          createdBy: currentUser.name,
          dueDate: new Date(dueDate).toISOString(),
          priority,
          status: 'PENDING'
      });

      setShowModal(false);
      resetForm();
  };

  const resetForm = () => {
      setTitle('');
      setDescription('');
      // Eğer admin değilse kendine ata
      setAssignedTo(currentUser?.role !== UserRole.ADMIN ? currentUser?.id || '' : '');
      setDueDate('');
      setPriority(TaskPriority.MEDIUM);
  };

  // Modal açılınca form varsayılanları
  const openNewTaskModal = () => {
      resetForm();
      if (currentUser?.role !== UserRole.ADMIN) {
          setAssignedTo(currentUser?.id || '');
      }
      setShowModal(true);
  };

  const getPriorityBadge = (p: TaskPriority) => {
      switch(p) {
          case TaskPriority.VERY_HIGH: return { label: 'Çok Yüksek', classes: 'bg-red-100 text-red-700 border-red-200' };
          case TaskPriority.HIGH: return { label: 'Yüksek', classes: 'bg-orange-100 text-orange-700 border-orange-200' };
          case TaskPriority.MEDIUM: return { label: 'Orta', classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
          case TaskPriority.LOW: return { label: 'Düşük', classes: 'bg-blue-100 text-blue-700 border-blue-200' };
          case TaskPriority.VERY_LOW: return { label: 'Çok Düşük', classes: 'bg-gray-100 text-gray-600 border-gray-200' };
          default: return { label: '-', classes: '' };
      }
  };

  const getDateStatus = (dateStr: string, status: string) => {
      if (status === 'COMPLETED') return { text: 'Tamamlandı', color: 'text-green-600' };
      
      const date = new Date(dateStr);
      if (isPast(date) && !isToday(date)) return { text: 'GECİKTİ!', color: 'text-red-600 font-black animate-pulse' };
      if (isToday(date)) return { text: 'Bugün Son', color: 'text-orange-600 font-bold' };
      if (isTomorrow(date)) return { text: 'Yarın', color: 'text-blue-600' };
      return { text: format(date, 'dd MMM', { locale: tr }), color: 'text-gray-500' };
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto mb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <CheckSquare size={28} className="mr-3 text-indigo-600" /> İş & Görev Takibi
            </h1>
            <p className="text-sm text-gray-500 mt-1">Ekip içi görevlendirmeler ve yapılacaklar listesi</p>
        </div>
        <button 
            onClick={openNewTaskModal}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 flex items-center transition-all w-full sm:w-auto justify-center"
        >
            <Plus size={18} className="mr-2" /> Yeni Görev Oluştur
        </button>
      </div>

      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm mb-6 inline-flex w-full sm:w-auto">
          <button onClick={() => setFilterStatus('PENDING')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterStatus === 'PENDING' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>YAPILACAKLAR</button>
          <button onClick={() => setFilterStatus('COMPLETED')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterStatus === 'COMPLETED' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>TAMAMLANANLAR</button>
          <button onClick={() => setFilterStatus('ALL')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterStatus === 'ALL' ? 'bg-gray-100 text-gray-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>HEPSİ</button>
      </div>

      <div className="space-y-3">
          {myTasks.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                  <CheckSquare size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">Görüntülenecek görev bulunamadı.</p>
              </div>
          )}

          {myTasks.map(task => {
              const priorityInfo = getPriorityBadge(task.priority);
              const dateInfo = getDateStatus(task.dueDate, task.status);
              const isUrgent = (task.priority === TaskPriority.VERY_HIGH || task.priority === TaskPriority.HIGH) && task.status !== 'COMPLETED';
              
              return (
                  <div key={task.id} className={`bg-white p-4 rounded-xl border transition-all hover:shadow-md group relative overflow-hidden ${task.status === 'COMPLETED' ? 'opacity-70 bg-gray-50 border-gray-200' : isUrgent ? 'border-red-200 shadow-red-100' : 'border-gray-200'}`}>
                      {/* Urgent Indicator Strip */}
                      {isUrgent && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>}
                      
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                          {/* Checkbox Area */}
                          <div className="flex-shrink-0 pt-1 sm:pt-0 pl-2">
                              <button 
                                onClick={() => updateTaskStatus(task.id, task.status === 'PENDING' ? 'COMPLETED' : 'PENDING')}
                                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${task.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-500 text-transparent'}`}
                              >
                                  <CheckCircle size={16} fill="currentColor" />
                              </button>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className={`text-base font-bold truncate ${task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-slate-800'}`}>{task.title}</h3>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${priorityInfo.classes}`}>{priorityInfo.label}</span>
                              </div>
                              {task.description && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{task.description}</p>}
                              
                              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                  <div className="flex items-center bg-gray-50 px-2 py-1 rounded">
                                      <User size={12} className="mr-1.5" />
                                      <span className="font-semibold text-slate-700">{task.assignedToName}</span>
                                  </div>
                                  <div className={`flex items-center font-medium ${dateInfo.color}`}>
                                      <Calendar size={12} className="mr-1.5" />
                                      {dateInfo.text}
                                  </div>
                                  {currentUser?.role === UserRole.ADMIN && (
                                      <span className="text-[10px] text-gray-400">Oluşturan: {task.createdBy}</span>
                                  )}
                              </div>
                          </div>

                          {/* Actions */}
                          <div className="flex-shrink-0 self-end sm:self-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { if(confirm('Görevi silmek istiyor musunuz?')) deleteTask(task.id); }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                  <Trash2 size={18} />
                              </button>
                          </div>
                      </div>
                  </div>
              );
          })}
      </div>

      {/* NEW TASK MODAL */}
      {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold mb-6 border-b pb-4 flex items-center text-slate-800">
                      <Plus className="mr-2 text-indigo-600" /> Yeni Görev Oluştur
                  </h2>
                  
                  <form onSubmit={handleAddTask} className="space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Konu Başlığı</label>
                          <input 
                            type="text" required 
                            className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                            placeholder="Örn: Stok sayımı yapılacak"
                            value={title} onChange={e => setTitle(e.target.value)}
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Açıklama (Opsiyonel)</label>
                          <textarea 
                            rows={3} 
                            className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                            placeholder="Detaylar..."
                            value={description} onChange={e => setDescription(e.target.value)}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Kime Atanacak?</label>
                              <select 
                                required
                                className={`w-full p-3 border border-gray-300 rounded-xl text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500 ${currentUser?.role !== UserRole.ADMIN ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''}`}
                                value={assignedTo} 
                                onChange={e => setAssignedTo(e.target.value)}
                                disabled={currentUser?.role !== UserRole.ADMIN}
                              >
                                  {currentUser?.role === UserRole.ADMIN ? (
                                      <>
                                        <option value="">Seçiniz...</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                                      </>
                                  ) : (
                                      <option value={currentUser?.id}>{currentUser?.username} (Ben)</option>
                                  )}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Son Tarih</label>
                              <input 
                                type="date" required 
                                className="w-full p-3 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                                value={dueDate} onChange={e => setDueDate(e.target.value)}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Aciliyet Durumu</label>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                              {[
                                  { val: TaskPriority.VERY_HIGH, label: 'Çok Yüksek', color: 'bg-red-100 text-red-700 border-red-200' },
                                  { val: TaskPriority.HIGH, label: 'Yüksek', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                                  { val: TaskPriority.MEDIUM, label: 'Orta', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                                  { val: TaskPriority.LOW, label: 'Düşük', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                                  { val: TaskPriority.VERY_LOW, label: 'Çok Düşük', color: 'bg-gray-100 text-gray-600 border-gray-200' },
                              ].map(opt => (
                                  <button
                                    key={opt.val} type="button"
                                    onClick={() => setPriority(opt.val)}
                                    className={`py-2 text-[10px] font-bold rounded-lg border transition-all ${priority === opt.val ? `ring-2 ring-offset-1 ring-indigo-500 ${opt.color}` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                  >
                                      {opt.label}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-gray-100">
                          <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs uppercase hover:bg-gray-200 transition-all">İptal</button>
                          <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Görevi Kaydet</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
