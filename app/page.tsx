"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  History, 
  Settings as SettingsIcon, 
  Download, 
  Milk, 
  IndianRupee, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Save,
  CheckCircle2,
  Share2,
  Copy,
  Edit2,
  X,
  TrendingUp,
  ArrowUpRight,
  Zap,
  LogOut,
  Eye,
  EyeOff,
  Lock,
  User
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths,
  isSameMonth,
  parseISO
} from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MilkEntry, Payment, AppSettings, MonthlySummary } from '../lib/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<MilkEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ default_rate: '60' });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'edit' | 'milk' | 'payments' | 'history' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<MilkEntry | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [pinForm, setPinForm] = useState({ current: '', new: '', confirm: '' });

  const monthStr = format(currentMonth, 'yyyy-MM');

  useEffect(() => {
    // Check login on mount
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
    setIsLoggedIn(loggedIn);
  }, []);

  useEffect(() => {
    // Apply theme
    const theme = settings.theme || 'midnight';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.add('dark');
  }, [settings.theme]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, paymentsRes, settingsRes] = await Promise.all([
        fetch(`/api/entries?month=${monthStr}`),
        fetch(`/api/payments?month=${monthStr}`),
        fetch('/api/settings')
      ]);

      const entriesData = await entriesRes.json();
      const paymentsData = await paymentsRes.json();
      const settingsData = await settingsRes.json();

      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setSettings(settingsData || { default_rate: '60' });
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monthStr]);

  const summary = useMemo<MonthlySummary>(() => {
    const totalLiters = entries.reduce((sum, e) => sum + e.quantity, 0);
    const totalAmount = entries.reduce((sum, e) => sum + (e.quantity * e.rate), 0);
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalDays = entries.filter(e => e.quantity > 0).length;
    return {
      totalLiters,
      totalAmount,
      paidAmount,
      balance: totalAmount - paidAmount,
      totalDays
    };
  }, [entries, payments]);

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const entry = entries.find(e => e.date === dateStr);
      return {
        date: format(day, 'dd'),
        liters: entry ? entry.quantity : 0,
        fullDate: dateStr
      };
    });
  }, [currentMonth, entries]);

  const handleAddEntry = async (date: string, quantity: number, rate: number) => {
    try {
      await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, quantity, rate })
      });
      setEditingEntry(null);
      setShowSuccessAnim(true);
      setTimeout(() => setShowSuccessAnim(false), 2000);
      fetchData();
    } catch (error) {
      console.error('Error adding/updating entry:', error);
    }
  };

  const handleEditEntry = (entry: MilkEntry) => {
    setEditingEntry(entry);
    setActiveTab('milk');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm("Kya aap is entry ko delete karna chahte hain?")) return;
    await fetch(`/api/entries?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleAddPayment = async (date: string, amount: number) => {
    try {
      await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPayment?.id, date, amount })
      });
      setEditingPayment(null);
      setShowSuccessAnim(true);
      setTimeout(() => setShowSuccessAnim(false), 2000);
      fetchData();
    } catch (error) {
      console.error('Error adding/updating payment:', error);
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setActiveTab('payments');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelPaymentEdit = () => {
    setEditingPayment(null);
  };

  const handleDeletePayment = async (id: number) => {
    if (!confirm("Kya aap is payment ko delete karna chahte hain?")) return;
    await fetch(`/api/payments?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
    });
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleChangePin = async () => {
    if (pinForm.new !== pinForm.confirm) {
      alert("New PIN and Confirm PIN do not match!");
      return;
    }
    if (pinForm.new.length !== 4) {
      alert("PIN must be 4 digits!");
      return;
    }

    const res = await fetch('/api/change-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPin: pinForm.current, newPin: pinForm.new })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      setChangingPin(false);
      setPinForm({ current: '', new: '', confirm: '' });
      setSettings(prev => ({ ...prev, pin: pinForm.new }));
    } else {
      alert(data.message);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const monthName = format(currentMonth, 'MMMM yyyy');
    
    doc.setFontSize(20);
    doc.text('Ghar Ka Doodh Hisaab', 14, 22);
    doc.setFontSize(12);
    doc.text(`Monthly Report: ${monthName}`, 14, 32);

    const summaryData = [
      ['Total Liters', `${summary.totalLiters.toFixed(2)} L`],
      ['Total Amount', `Rs. ${summary.totalAmount.toFixed(2)}`],
      ['Paid Amount', `Rs. ${summary.paidAmount.toFixed(2)}`],
      ['Remaining Balance', `Rs. ${summary.balance.toFixed(2)}`]
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Description', 'Value']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] }
    });

    const tableData = entries.map(e => [
      format(parseISO(e.date), 'dd MMM yyyy'),
      `${e.quantity} L`,
      `Rs. ${e.rate}`,
      `Rs. ${(e.quantity * e.rate).toFixed(2)}`
    ]);

    const finalY = (doc as any).lastAutoTable?.finalY || 40;
    doc.text('Daily Entries', 14, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Date', 'Quantity', 'Rate', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22] }
    });

    return doc;
  };

  const exportPDF = () => {
    const doc = generatePDF();
    doc.save(`Milk_Report_${monthStr}.pdf`);
  };

  const getReportText = () => {
    const monthName = format(currentMonth, 'MMMM yyyy');
    let text = `*🥛 Ghar Ka Doodh Hisaab - ${monthName} Report*\n\n` +
      `*📊 SUMMARY*\n` +
      `--------------------------\n` +
      `Total Liters: ${summary.totalLiters.toFixed(2)} L\n` +
      `Total Amount: ₹${summary.totalAmount.toFixed(2)}\n` +
      `Paid Amount: ₹${summary.paidAmount.toFixed(2)}\n` +
      `*Balance Due: ₹${summary.balance.toFixed(2)}*\n\n` +
      `*📅 DAILY ENTRIES*\n` +
      `--------------------------\n`;
    
    if (entries.length > 0) {
      entries.forEach(e => {
        text += `${format(parseISO(e.date), 'dd MMM')}: ${e.quantity}L x ₹${e.rate} = ₹${(e.quantity * e.rate).toFixed(1)}\n`;
      });
    } else {
      text += `No entries found.\n`;
    }

    text += `\n_Generated via Ghar Ka Doodh Hisaab App_`;
    return text;
  };

  const shareReport = async () => {
    try {
      const monthName = format(currentMonth, 'MMMM yyyy');
      const doc = generatePDF();
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `Milk_Report_${monthStr}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Milk Report - ${monthName}`,
          text: `Milk expense report for ${monthName}`
        });
      } else {
        fallbackWhatsAppShare();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      fallbackWhatsAppShare();
    }
  };

  const fallbackWhatsAppShare = () => {
    const text = getReportText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const win = window.open(url, '_blank');
    if (!win) {
      copyToClipboard();
      alert("WhatsApp open nahi ho paya. Report clipboard par copy kar di gayi hai.");
    }
  };

  const copyToClipboard = () => {
    const text = getReportText();
    navigator.clipboard.writeText(text).then(() => {
      alert("Report clipboard par copy ho gayi hai!");
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
    }} correctPin={settings.pin || '2580'} />;
  }

  return (
    <div className="min-h-screen pb-24 text-main transition-colors duration-300">
      {/* Header */}
      <header className="bg-dark-card border-b border-dark-border p-4 sticky top-0 z-30 shadow-2xl backdrop-blur-md bg-opacity-80">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="bg-primary p-1.5 rounded-lg shadow-lg shadow-primary/20">
              <Milk className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white uppercase">
                Ghar Ka <span className="text-primary">Doodh</span>
              </h1>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Premium Tracker</p>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-2">
            <HeaderAction icon={<Copy className="w-5 h-5" />} onClick={copyToClipboard} title="Copy" />
            <HeaderAction icon={<Share2 className="w-5 h-5" />} onClick={shareReport} title="Share" />
            <HeaderAction icon={<Download className="w-5 h-5" />} onClick={exportPDF} title="PDF" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Main Content Area */}
        <div className="xl:col-span-1 space-y-6">
          {/* Month Selector */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between bg-dark-card p-3 rounded-xl border border-dark-border shadow-inner"
          >
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-dark-border rounded-full transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5 text-primary" />
            </button>
            <div className="flex items-center gap-2.5 font-black text-white text-base uppercase tracking-tighter">
              <Calendar className="w-4 h-4 text-primary" />
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-dark-border rounded-full transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5 text-primary" />
            </button>
          </motion.div>

        <AnimatePresence>
          {showSuccessAnim && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="bg-primary text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold">
                <CheckCircle2 className="w-6 h-6" />
                Entry Added Successfully!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Sticky Summary */}
        <div className="xl:hidden sticky top-[88px] z-20 -mx-4 px-4 pb-2 bg-opacity-80 backdrop-blur-md" style={{ backgroundColor: 'var(--bg-color)' }}>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex-shrink-0 bg-dark-card border border-dark-border px-4 py-2 rounded-xl flex items-center gap-3">
              <Calendar className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[8px] text-slate-500 font-black uppercase">Days</p>
                <p className="text-sm font-black text-white">{summary.totalDays} Days</p>
              </div>
            </div>
            <div className="flex-shrink-0 bg-dark-card border border-dark-border px-4 py-2 rounded-xl flex items-center gap-3">
              <Milk className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[8px] text-slate-500 font-black uppercase">Liters</p>
                <p className="text-sm font-black text-white">{summary.totalLiters.toFixed(1)}L</p>
              </div>
            </div>
            <div className="flex-shrink-0 bg-dark-card border border-dark-border px-4 py-2 rounded-xl flex items-center gap-3">
              <IndianRupee className="w-4 h-4 text-white" />
              <div>
                <p className="text-[8px] text-slate-500 font-black uppercase">Bill</p>
                <p className="text-sm font-black text-white">₹{summary.totalAmount.toFixed(0)}</p>
              </div>
            </div>
            <div className="flex-shrink-0 bg-dark-card border border-dark-border px-4 py-2 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-[8px] text-slate-500 font-black uppercase">Paid</p>
                <p className="text-sm font-black text-emerald-500">₹{summary.paidAmount.toFixed(0)}</p>
              </div>
            </div>
            <div className="flex-shrink-0 bg-dark-card border border-dark-border px-4 py-2 rounded-xl flex items-center gap-3">
              <Zap className="w-4 h-4 text-rose-500" />
              <div>
                <p className="text-[8px] text-slate-500 font-black uppercase">Due</p>
                <p className={cn("text-sm font-black", summary.balance > 0 ? "text-rose-500" : "text-emerald-500")}>₹{summary.balance.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Consumption Analytics</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Daily Liter Usage Trends</p>
            </div>

            {/* Chart Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden border-none bg-transparent p-0 shadow-none"
            >
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#737373', fontWeight: 'bold'}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#737373', fontWeight: 'bold'}} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#171717', 
                        borderRadius: '16px', 
                        border: '1px solid #262626',
                        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)'
                      }}
                      itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="liters" 
                      stroke="#f97316" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorLiters)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'milk' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Milk Entry</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Add daily milk quantity</p>
            </div>
            <div className="max-w-md">
              <EntryForm 
                defaultRate={parseFloat(settings.default_rate)} 
                onSubmit={handleAddEntry} 
                editingEntry={editingEntry}
                onCancel={handleCancelEdit}
              />
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Add Payment</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Record your payments</p>
            </div>
            <div className="max-w-md">
              <PaymentForm 
                onSubmit={handleAddPayment} 
                editingPayment={editingPayment}
                onCancel={handleCancelPaymentEdit}
              />
            </div>
          </div>
        )}

        {activeTab === 'edit' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Manage Records</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Edit or delete your entries</p>
            </div>

            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Daily Log</h3>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">{entries.length} Entries</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-dark-border text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      <th className="pb-4">Date</th>
                      <th className="pb-4">Qty</th>
                      <th className="pb-4">Rate</th>
                      <th className="pb-4">Total</th>
                      <th className="pb-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/50">
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">No records found</td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className="group hover:bg-white/5 transition-colors">
                          <td className="py-4 font-bold text-white">{format(parseISO(entry.date), 'dd MMM')}</td>
                          <td className="py-4 font-black text-primary">{entry.quantity}L</td>
                          <td className="py-4 text-slate-400 text-xs">₹{entry.rate}</td>
                          <td className="py-4 font-bold text-white">₹{(entry.quantity * entry.rate).toFixed(1)}</td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1 transition-opacity">
                              <button 
                                onClick={() => handleEditEntry(entry)}
                                className="p-2 text-slate-400 hover:text-primary transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => entry.id && handleDeleteEntry(entry.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Payment History</h3>
              <div className="grid gap-3">
                {payments.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 font-bold uppercase text-xs tracking-widest">No payments recorded</p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-4 rounded-2xl border border-dark-border group" style={{ backgroundColor: 'var(--bg-color)' }}>
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-500/10 p-2 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{format(parseISO(payment.date), 'dd MMM yyyy')}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Transaction Success</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-emerald-500 font-black text-lg">₹{payment.amount}</p>
                        <div className="flex items-center gap-1 transition-opacity">
                          <button 
                            onClick={() => handleEditPayment(payment)}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => payment.id && handleDeletePayment(payment.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Monthly Report</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Summary of {format(currentMonth, 'MMMM yyyy')}</p>
            </div>

            <div className="card">
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-dark-border pb-4">
                  <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total Consumption</span>
                  <span className="text-white font-black text-xl">{summary.totalLiters.toFixed(2)} L</span>
                </div>
                <div className="flex justify-between items-center border-b border-dark-border pb-4">
                  <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Total Bill</span>
                  <span className="text-white font-black text-xl">₹{summary.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dark-border pb-4">
                  <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Amount Paid</span>
                  <span className="text-emerald-500 font-black text-xl">₹{summary.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Balance Due</span>
                  <span className={cn("font-black text-xl", summary.balance > 0 ? "text-rose-500" : "text-emerald-500")}>
                    ₹{summary.balance.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <button 
                  onClick={exportPDF}
                  className="btn-primary flex items-center justify-center gap-2 text-xs uppercase tracking-widest h-12"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
                <button 
                  onClick={shareReport}
                  className="bg-dark-border text-white hover:bg-white/10 transition-all rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-widest h-12"
                >
                  <Share2 className="w-5 h-5" />
                  Share Report
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card max-w-md mx-auto"
          >
            <h3 className="text-xl font-black text-main uppercase tracking-tighter mb-8 flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <SettingsIcon className="w-6 h-6 text-primary" />
              </div>
              System Config
            </h3>
            <div className="space-y-8">
              {/* Rate Setting */}
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Default Rate (per Liter)</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">₹</span>
                    <input 
                      type="number" 
                      className="input-field pl-10 h-12 text-lg font-bold"
                      value={settings.default_rate}
                      onChange={(e) => setSettings({ ...settings, default_rate: e.target.value })}
                    />
                  </div>
                  <button 
                    onClick={() => handleUpdateSettings({ default_rate: settings.default_rate })}
                    className="btn-primary h-12 px-6"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Theme Setting */}
              <div className="pt-6 border-t border-dark-border space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Display Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'midnight', label: 'Midnight', color: 'bg-[#f97316]' },
                    { id: 'ocean', label: 'Ocean', color: 'bg-[#06b6d4]' },
                    { id: 'forest', label: 'Forest', color: 'bg-[#22c55e]' }
                  ].map((t) => (
                    <button 
                      key={t.id}
                      onClick={() => handleUpdateSettings({ theme: t.id as any })}
                      className={cn(
                        "h-16 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all",
                        (settings.theme || 'midnight') === t.id ? "border-primary ring-2 ring-primary/20" : "border-dark-border opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded-full", t.color)} />
                      <span className="text-[9px] font-black uppercase">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN Change Section */}
              <div className="pt-6 border-t border-dark-border space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Security (PIN)</label>
                {!changingPin ? (
                  <button 
                    onClick={() => setChangingPin(true)}
                    className="w-full h-12 bg-dark-border text-slate-300 rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-white/5 transition-all"
                  >
                    <Lock className="w-4 h-4" />
                    Change Access PIN
                  </button>
                ) : (
                  <div className="space-y-4 p-4 rounded-xl border border-dark-border bg-black/20">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-primary uppercase">Update PIN</span>
                      <button onClick={() => setChangingPin(false)}><X className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Current PIN</label>
                        <input 
                          type="password" 
                          className="input-field h-10 text-center tracking-widest"
                          maxLength={4}
                          value={pinForm.current}
                          onChange={(e) => setPinForm({...pinForm, current: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">New PIN</label>
                        <input 
                          type="password" 
                          className="input-field h-10 text-center tracking-widest"
                          maxLength={4}
                          value={pinForm.new}
                          onChange={(e) => setPinForm({...pinForm, new: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Confirm PIN</label>
                        <input 
                          type="password" 
                          className="input-field h-10 text-center tracking-widest"
                          maxLength={4}
                          value={pinForm.confirm}
                          onChange={(e) => setPinForm({...pinForm, confirm: e.target.value})}
                        />
                      </div>
                      <button 
                        onClick={handleChangePin}
                        className="btn-primary w-full h-10 text-xs"
                      >
                        Save New PIN
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-dark-border">
                <button 
                  onClick={() => {
                    setIsLoggedIn(false);
                    localStorage.removeItem('isLoggedIn');
                  }}
                  className="w-full h-12 flex items-center justify-center gap-2 text-slate-500 hover:text-rose-500 transition-colors text-[10px] font-black uppercase tracking-widest"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out Session
                </button>
              </div>
            </div>
          </motion.div>
        )}
        </div>

        {/* Persistent Desktop Sidebar Summary */}
        <div className="hidden xl:block xl:col-span-1">
          <div className="sticky top-28 space-y-6">
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="card border-2 border-primary/20 bg-dark-card/90 backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] p-6 space-y-6 h-full min-h-[450px] flex flex-col justify-center"
            >
              <div className="flex items-center gap-3 border-b border-dark-border pb-4">
                <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/20">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-tighter text-lg">Live Summary</h3>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Real-time stats</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary/30 rounded-full group-hover:bg-primary transition-colors" />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Days</span>
                  </div>
                  <span className="text-white font-black text-2xl tracking-tighter">{summary.totalDays} <span className="text-[10px] text-slate-500">Days</span></span>
                </div>

                <div className="flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary/30 rounded-full group-hover:bg-primary transition-colors" />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Liters</span>
                  </div>
                  <span className="text-white font-black text-2xl tracking-tighter">{summary.totalLiters.toFixed(1)} <span className="text-[10px] text-slate-500">L</span></span>
                </div>

                <div className="flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-white/10 rounded-full group-hover:bg-white transition-colors" />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Bill</span>
                  </div>
                  <span className="text-white font-black text-2xl tracking-tighter">₹{summary.totalAmount.toFixed(0)}</span>
                </div>

                <div className="flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-emerald-500/20 rounded-full group-hover:bg-emerald-500 transition-colors" />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Paid Amount</span>
                  </div>
                  <span className="text-emerald-500 font-black text-2xl tracking-tighter">₹{summary.paidAmount.toFixed(0)}</span>
                </div>

                <div className="pt-6 border-t border-dark-border flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-1 h-10 rounded-full transition-colors", summary.balance > 0 ? "bg-rose-500" : "bg-emerald-500")} />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Balance Due</span>
                  </div>
                  <span className={cn("font-black text-3xl tracking-tighter", summary.balance > 0 ? "text-rose-500" : "text-emerald-500")}>
                    ₹{summary.balance.toFixed(0)}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-card border-t border-dark-border p-2 z-40 backdrop-blur-xl bg-opacity-90">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <NavButton icon={<TrendingUp className="w-5 h-5" />} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavButton icon={<Plus className="w-5 h-5" />} label="Milk" active={activeTab === 'milk'} onClick={() => setActiveTab('milk')} />
          <NavButton icon={<IndianRupee className="w-5 h-5" />} label="Cash" active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} />
          <NavButton icon={<History className="w-5 h-5" />} label="Log" active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
          <NavButton icon={<Download className="w-5 h-5" />} label="Report" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavButton icon={<SettingsIcon className="w-5 h-5" />} label="Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300",
        active ? "text-primary scale-110" : "text-slate-500 hover:text-slate-300"
      )}
    >
      {icon}
      <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function HeaderAction({ icon, onClick, title }: { icon: React.ReactNode, onClick: () => void, title: string }) {
  return (
    <button 
      onClick={onClick}
      className="p-2 text-slate-400 hover:text-primary hover:bg-white/5 rounded-xl transition-all"
      title={title}
    >
      {icon}
    </button>
  );
}

function EntryForm({ defaultRate, onSubmit, editingEntry, onCancel }: { defaultRate: number, onSubmit: (date: string, quantity: number, rate: number) => void, editingEntry: MilkEntry | null, onCancel: () => void }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [quantity, setQuantity] = useState('1');
  const [rate, setRate] = useState(defaultRate.toString());

  useEffect(() => {
    if (editingEntry) {
      setDate(editingEntry.date);
      setQuantity(editingEntry.quantity.toString());
      setRate(editingEntry.rate.toString());
    } else {
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setQuantity('1');
      setRate(defaultRate.toString());
    }
  }, [editingEntry, defaultRate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(date, parseFloat(quantity), parseFloat(rate));
    if (!editingEntry) {
      setQuantity('1');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("card border-2 transition-colors", editingEntry ? "border-primary/50" : "border-transparent")}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            {editingEntry ? <Edit2 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
          </div>
          {editingEntry ? 'Edit Entry' : 'Quick Entry'}
        </h3>
        {editingEntry && (
          <button 
            onClick={onCancel}
            className="text-[10px] font-black uppercase text-slate-500 hover:text-white flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
            <input 
              type="date" 
              className="input-field text-xs h-10" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Qty (L)</label>
            <input 
              type="number" 
              step="0.1"
              className="input-field text-xs h-10" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Rate (₹/L)</label>
          <input 
            type="number" 
            className="input-field text-xs h-10" 
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full h-11 text-xs uppercase tracking-widest">
          {editingEntry ? 'Update Record' : 'Add Record'}
        </button>
      </form>
    </motion.div>
  );
}

function PaymentForm({ onSubmit, editingPayment, onCancel }: { onSubmit: (date: string, amount: number) => void, editingPayment: Payment | null, onCancel: () => void }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (editingPayment) {
      setDate(editingPayment.date);
      setAmount(editingPayment.amount.toString());
    } else {
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setAmount('');
    }
  }, [editingPayment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(date, parseFloat(amount));
    if (!editingPayment) {
      setAmount('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("card border-2 transition-colors", editingPayment ? "border-emerald-500/50" : "border-transparent")}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
          <div className="bg-emerald-500/10 p-1.5 rounded-lg">
            {editingPayment ? <Edit2 className="w-5 h-5 text-emerald-500" /> : <IndianRupee className="w-5 h-5 text-emerald-500" />}
          </div>
          {editingPayment ? 'Edit Payment' : 'Add Payment'}
        </h3>
        {editingPayment && (
          <button 
            onClick={onCancel}
            className="text-[10px] font-black uppercase text-slate-500 hover:text-white flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
          <input 
            type="date" 
            className="input-field text-xs h-10" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Amount (₹)</label>
          <input 
            type="number" 
            className="input-field text-xs h-10" 
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700 w-full h-11 text-xs uppercase tracking-widest">
          {editingPayment ? 'Update Cash' : 'Record Cash'}
        </button>
      </form>
    </motion.div>
  );
}

function LoginPage({ onLogin, correctPin }: { onLogin: () => void, correctPin: string }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleLogin = (pinToTry?: string) => {
    const currentPin = pinToTry !== undefined ? pinToTry : pin;
    if (currentPin === correctPin) {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
      setPin('');
    }
  };

  // Character Animation States
  const eyeVariants = {
    default: { y: 0, x: 0 },
    typing: { 
      y: 2, 
      x: (pin.length - 2) * 2,
      transition: { type: "spring" as const, stiffness: 300 }
    },
    error: { 
      y: [0, -2, 2, -2, 0],
      x: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className="min-h-screen bg-main flex items-center justify-center p-4 overflow-hidden relative" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Immersive Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/5 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md z-10"
      >
        {/* Character Animation Area */}
        <div className="relative h-40 flex items-center justify-center mb-4">
          <motion.div 
            animate={error ? { rotate: [-5, 5, -5, 5, 0] } : {}}
            className="relative"
          >
            {/* Milk Bottle Character */}
            <div className="w-24 h-32 bg-white rounded-t-3xl rounded-b-xl relative shadow-2xl overflow-hidden border-4 border-white/20">
              {/* Milk Level */}
              <motion.div 
                animate={{ height: `${40 + (pin.length * 15)}%` }}
                className="absolute bottom-0 left-0 right-0 bg-slate-100/50"
              />
              
              {/* Face */}
              <div className="absolute top-10 left-0 right-0 flex flex-col items-center gap-3">
                <div className="flex gap-4">
                  {/* Eyes */}
                  <motion.div 
                    variants={eyeVariants}
                    animate={error ? "error" : (pin.length > 0 ? "typing" : "default")}
                    className="flex gap-4"
                  >
                    <div className="w-3 h-3 bg-slate-800 rounded-full" />
                    <div className="w-3 h-3 bg-slate-800 rounded-full" />
                  </motion.div>
                </div>
                {/* Mouth */}
                <motion.div 
                  animate={error ? { scaleY: 0.5, y: 2 } : (pin.length > 0 ? { scaleX: 1.2 } : { scaleX: 1 })}
                  className="w-6 h-1 bg-slate-800 rounded-full" 
                />
              </div>
            </div>
            {/* Cap */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-primary rounded-full shadow-lg" />
          </motion.div>
        </div>

        <div className="bg-dark-card/80 backdrop-blur-2xl p-8 rounded-[32px] border border-dark-border shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Welcome Back</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Enter your 4-digit security PIN</p>
          </div>

          <div className="flex justify-center gap-4">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={pin.length > i ? { scale: [1, 1.2, 1], backgroundColor: 'var(--primary-color)' } : { scale: 1, backgroundColor: 'rgba(255,255,255,0.05)' }}
                className={cn(
                  "w-4 h-4 rounded-full border border-dark-border transition-colors",
                  pin.length > i ? "border-primary" : "border-dark-border"
                )}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((num) => (
              <button
                key={num}
                onClick={() => {
                  if (num === 'C') setPin('');
                  else if (num === 'OK') handleLogin();
                  else if (pin.length < 4) {
                    const newPin = pin + num;
                    setPin(newPin);
                    if (newPin.length === 4) {
                      setTimeout(() => handleLogin(newPin), 300);
                    }
                  }
                }}
                className={cn(
                  "h-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-90",
                  num === 'OK' ? "bg-primary text-white shadow-lg shadow-primary/20" : 
                  num === 'C' ? "bg-rose-500/10 text-rose-500" : 
                  "bg-white/5 text-white hover:bg-white/10"
                )}
              >
                {num}
              </button>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">Secure End-to-End Encryption</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
