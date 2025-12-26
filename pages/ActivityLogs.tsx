
import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { FileText, Search, Filter, User, Calendar, Tag, AlertCircle, X, Info, Code, Hash, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ActivityLog } from '../types';

export const ActivityLogs: React.FC = () => {
    const { activityLogs } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState<string>('ALL');
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

    const filteredLogs = useMemo(() => {
        return activityLogs.filter(log => {
            const matchesSearch = 
                log.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                log.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAction = filterAction === 'ALL' || log.action === filterAction;
            return matchesSearch && matchesAction;
        });
    }, [activityLogs, searchTerm, filterAction]);

    const getActionColor = (action: string) => {
        switch(action) {
            case 'LOGIN': return 'text-blue-600 bg-blue-100';
            case 'CREATE': return 'text-emerald-600 bg-emerald-100';
            case 'UPDATE': return 'text-orange-600 bg-orange-100';
            case 'DELETE': return 'text-red-600 bg-red-100';
            case 'FINANCIAL': return 'text-purple-600 bg-purple-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto mb-20">
            <div className="flex items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center">
                    <FileText size={28} className="mr-3 text-indigo-600" /> Kullanıcı Hareket Kayıtları (Log)
                </h1>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" placeholder="Kullanıcı veya işlem ara..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                     <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                     <select 
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                        value={filterAction} onChange={(e) => setFilterAction(e.target.value)}
                     >
                        <option value="ALL">Tüm İşlemler</option>
                        <option value="LOGIN">Girişler</option>
                        <option value="CREATE">Yeni Kayıt</option>
                        <option value="UPDATE">Düzenleme</option>
                        <option value="DELETE">Silme</option>
                        <option value="FINANCIAL">Finansal</option>
                     </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-[800px] w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase border-b">
                            <tr>
                                <th className="p-4 whitespace-nowrap">Tarih</th>
                                <th className="p-4 whitespace-nowrap">Kullanıcı</th>
                                <th className="p-4 whitespace-nowrap">İşlem Türü</th>
                                <th className="p-4 whitespace-nowrap">Modül</th>
                                <th className="p-4 whitespace-nowrap">Açıklama</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLogs.map(log => (
                                <tr 
                                    key={log.id} 
                                    onClick={() => setSelectedLog(log)}
                                    className="hover:bg-gray-50 transition-colors text-xs cursor-pointer group"
                                >
                                    <td className="p-4 whitespace-nowrap text-gray-600 font-medium">
                                        {format(new Date(log.date), 'dd.MM.yyyy HH:mm:ss')}
                                    </td>
                                    <td className="p-4 font-bold text-slate-800 flex items-center whitespace-nowrap">
                                        <User size={14} className="mr-2 text-gray-400" /> {log.userName}
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 font-bold text-gray-500 uppercase tracking-tight whitespace-nowrap">
                                        {log.entity}
                                    </td>
                                    <td className="p-4 text-slate-700 font-medium whitespace-nowrap max-w-xs truncate group-hover:text-indigo-600">
                                        {log.description}
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400 italic">
                                        Kayıt bulunamadı.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DETAIL MODAL */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-slate-800 flex items-center">
                                <Info size={20} className="mr-2 text-indigo-600" /> Kayıt Detayı
                            </h3>
                            <button onClick={() => setSelectedLog(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm transition-colors"><X size={18} /></button>
                        </div>
                        
                        {/* Content */}
                        <div className="p-6 space-y-5 overflow-y-auto">
                            
                            <div className="flex items-center justify-between">
                                <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${getActionColor(selectedLog.action)}`}>
                                    {selectedLog.action}
                                </span>
                                <span className="text-xs font-bold text-gray-400 flex items-center bg-gray-100 px-2 py-1 rounded">
                                    <Hash size={12} className="mr-1" /> {selectedLog.id}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center"><User size={12} className="mr-1"/> İşlemi Yapan</p>
                                    <p className="text-sm font-bold text-slate-800">{selectedLog.userName}</p>
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase">{selectedLog.userRole}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center"><Calendar size={12} className="mr-1"/> Tarih & Saat</p>
                                    <p className="text-sm font-bold text-slate-800">{format(new Date(selectedLog.date), 'dd.MM.yyyy')}</p>
                                    <p className="text-xs text-gray-500 font-bold">{format(new Date(selectedLog.date), 'HH:mm:ss')}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">İşlem Açıklaması</label>
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-900 font-medium leading-relaxed">
                                    {selectedLog.description}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-100 rounded-lg">
                                <Tag size={16} className="text-yellow-600" />
                                <span className="text-xs font-bold text-yellow-800 uppercase">Etkilenen Modül: {selectedLog.entity}</span>
                            </div>

                            {/* Metadata Viewer (If exists) */}
                            {selectedLog.metadata && (
                                <div className="mt-4">
                                    <p className="text-[10px] font-bold text-slate-400 mb-2 flex items-center uppercase"><Code size={12} className="mr-1"/> Teknik Detaylar (Metadata)</p>
                                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto shadow-inner">
                                        <pre className="text-[10px] text-green-400 font-mono leading-tight">
                                            {JSON.stringify(selectedLog.metadata, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button onClick={() => setSelectedLog(null)} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-xs uppercase hover:bg-gray-100 transition-all shadow-sm">
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
