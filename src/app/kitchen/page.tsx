'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Truck, Flame, DollarSign, CheckCircle, Settings, List, MapPin, Send, MessageCircle, X, Plus, Trash2 } from 'lucide-react'; // FIXED: Added MapPin and all other icons

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [view, setView] = useState<'orders' | 'menu'>('orders');
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState('');

  const fetchData = async () => {
    const { data: ords } = await supabase.from('orders').select('*').neq('status', 'delivered').order('created_at', { ascending: false });
    const { data: menu } = await supabase.from('menu_items').select('*').order('name');
    if (ords) setOrders(ords);
    if (menu) setMenuItems(menu);
  };

  useEffect(() => {
    fetchData();
    const ch = supabase.channel('k').on('postgres_changes', { event: '*', table: 'orders' }, fetchData).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (activeChat) {
      supabase.from('messages').select('*').eq('order_id', activeChat).order('created_at', { ascending: true }).then(({data}) => setMessages(data || []));
      const sub = supabase.channel('c').on('postgres_changes', { event: 'INSERT', table: 'messages', filter: `order_id=eq.${activeChat}` }, (p) => setMessages(m => [...m, p.new])).subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [activeChat]);

  const updateStatus = async (id: string, next: string, pay?: string) => {
    const upd: any = { status: next };
    if (pay) upd.payment_status = pay;
    await supabase.from('orders').update(upd).eq('id', id);
    fetchData();
  };

  const sendReply = async () => {
    if (!reply.trim() || !activeChat) return;
    await supabase.from('messages').insert([{ order_id: activeChat, sender_name: 'CHEF', text: reply, is_chef: true }]);
    setReply('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-6">
      <header className="flex justify-between items-center mb-10 border-b-2 border-[#ffaa00] pb-4">
        <h1 className="text-2xl font-black italic text-[#ffaa00]">CHEF_OS</h1>
        <button onClick={() => setView(view === 'orders' ? 'menu' : 'orders')} className="bg-white text-black p-2 rounded-xl">
          {view === 'orders' ? <Settings size={18}/> : <List size={18}/>}
        </button>
      </header>

      {view === 'menu' ? (
        <div className="max-w-xl mx-auto space-y-4">
          <button onClick={async () => { await supabase.from('menu_items').insert([{name:'NEW BURGER', price:0}]); fetchData(); }} className="w-full py-4 border-2 border-dashed border-white/20 rounded-2xl hover:border-[#ffaa00]">+ NEW ITEM</button>
          {menuItems.map(item => (
            <div key={item.id} className="flex gap-2 bg-zinc-900 p-3 rounded-xl border border-white/5">
              <input defaultValue={item.name} onBlur={async (e) => { await supabase.from('menu_items').update({name: e.target.value}).eq('id', item.id); fetchData(); }} className="bg-black flex-1 p-2 rounded text-xs uppercase"/>
              <input type="number" defaultValue={item.price} onBlur={async (e) => { await supabase.from('menu_items').update({price: Number(e.target.value)}).eq('id', item.id); fetchData(); }} className="bg-black w-20 p-2 rounded text-[#ffaa00] text-center font-bold"/>
              <button onClick={async () => { await supabase.from('menu_items').delete().eq('id', item.id); fetchData(); }} className="text-red-500 p-2"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
            <div key={order.id} className={`p-6 rounded-[2rem] border-2 flex flex-col justify-between ${order.payment_status === 'verified' ? 'border-green-500' : 'border-red-500 bg-red-500/5 animate-pulse'}`}>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black uppercase text-[#ffaa00]">{order.customer_name}</span>
                  <button onClick={() => setActiveChat(order.id)} className="text-[#ffaa00]"><MessageCircle size={18}/></button>
                </div>
                <ul className="text-xl font-black italic mb-4 uppercase">{order.items.map((it:any, i:any) => <li key={i}>- {it}</li>)}</ul>
                <div className="bg-black/50 p-3 rounded-2xl text-[10px] mb-6 flex gap-2"><MapPin size={12} className="text-[#ffaa00]"/><span className="opacity-60">{order.delivery_address}</span></div>
              </div>

              <div className="space-y-2">
                {order.payment_status !== 'verified' ? (
                  <button onClick={() => updateStatus(order.id, 'pending', 'verified')} className="w-full py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 uppercase tracking-tighter text-xs">Confirm Payment</button>
                ) : (
                  <>
                    {order.status === 'pending' && <button onClick={() => updateStatus(order.id, 'preparing')} className="w-full py-3 bg-orange-500 text-black font-black rounded-xl flex items-center justify-center gap-2 uppercase italic text-xs">Start Preparing</button>}
                    {order.status === 'preparing' && <button onClick={() => updateStatus(order.id, 'dispatched')} className="w-full py-3 bg-green-500 text-black font-black rounded-xl flex items-center justify-center gap-2 uppercase italic text-xs">Mark Dispatched</button>}
                    {order.status === 'dispatched' && <button onClick={() => updateStatus(order.id, 'delivered')} className="w-full py-3 bg-blue-500 text-white font-black rounded-xl flex items-center justify-center gap-2 uppercase italic text-xs">Confirm Delivery</button>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeChat && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-[#ffaa00] w-full max-w-md rounded-3xl overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 bg-[#ffaa00] text-black font-black flex justify-between items-center">
              <span className="text-xs uppercase italic">Chatting with Customer</span>
              <button onClick={() => setActiveChat(null)}><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.is_chef ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl text-[10px] ${m.is_chef ? 'bg-[#ffaa00] text-black font-bold' : 'bg-white/10 text-white'}`}>{m.text}</div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-black flex gap-2">
              <input value={reply} onChange={e => setReply(e.target.value)} className="flex-1 bg-zinc-900 p-3 rounded-xl outline-none text-xs" placeholder="Reply..." />
              <button onClick={sendReply} className="bg-[#ffaa00] p-3 rounded-xl text-black"><Send size={18}/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}