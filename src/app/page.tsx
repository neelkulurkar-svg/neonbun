'use client';

import { useState, useEffect } from 'react'; // FIXED: Added missing imports
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, MapPin, CheckCircle, ShoppingCart, Plus, Minus, 
  User, Clock, Flame, Truck, MessageSquare, Send, X 
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NeonBunDelivery() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [key: string]: any }>({});
  const [customerInfo, setCustomerInfo] = useState({ name: '', address: '' });
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetchMenu();
    const savedOrderId = localStorage.getItem('activeOrderId');
    if (savedOrderId) trackOrder(savedOrderId);
  }, []);

  // FIXED: Build-safe Realtime Listener
  useEffect(() => {
    if (activeOrder) {
      const sub = supabase.channel(`chat-${activeOrder.id}`)
        .on(
          'postgres_changes' as any, 
          { event: 'INSERT', table: 'messages', schema: 'public', filter: `order_id=eq.${activeOrder.id}` }, 
          (p: any) => setMessages(m => [...m, p.new])
        )
        .subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [activeOrder]);

  const fetchMenu = async () => {
    const { data } = await supabase.from('menu_items').select('*').eq('is_available', true);
    if (data) setMenuItems(data);
  };

  const trackOrder = async (id: string) => {
    const { data } = await supabase.from('orders').select('*').eq('id', id).single();
    if (data) setActiveOrder(data);
    
    supabase.channel(`track-${id}`)
      .on('postgres_changes' as any, { event: 'UPDATE', table: 'orders', schema: 'public', filter: `id=eq.${id}` }, 
      (payload: any) => setActiveOrder(payload.new)).subscribe();
  };

  const addToCart = (item: any) => {
    setCart(prev => ({
      ...prev,
      [item.id]: { name: item.name, price: item.price, qty: (prev[item.id]?.qty || 0) + 1 }
    }));
  };

  const removeFromCart = (id: string) => {
    const newCart = { ...cart };
    if (newCart[id].qty > 1) newCart[id].qty -= 1;
    else delete newCart[id];
    setCart(newCart);
  };

  const totalPrice = Object.values(cart).reduce((sum, item) => sum + (item.price * item.qty), 0);

  const submitOrder = async () => {
    if (!customerInfo.name || !customerInfo.address) return alert("Enter Name & Address!");
    setIsOrdering(true);
    const { data, error } = await supabase.from('orders').insert([{
      customer_name: customerInfo.name.toUpperCase(),
      delivery_address: customerInfo.address,
      items: Object.values(cart).map(i => `${i.qty}x ${i.name}`),
      total_price: totalPrice,
      payment_status: 'waiting',
      status: 'pending'
    }]).select().single();

    if (!error && data) {
      localStorage.setItem('activeOrderId', data.id);
      trackOrder(data.id);
      setOrderComplete(true);
      setCart({});
    }
    setIsOrdering(false);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeOrder) return;
    await supabase.from('messages').insert([{
      order_id: activeOrder.id,
      sender_name: customerInfo.name,
      text: newMsg,
      is_chef: false
    }]);
    setNewMsg('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-4 pb-32">
      <header className="py-6 flex justify-between items-center max-w-xl mx-auto border-b border-white/10">
        <h1 className="text-2xl font-black italic text-[#ffaa00]">NEON BUN</h1>
        <ShoppingCart size={20} className="opacity-50" />
      </header>

      <main className="max-w-xl mx-auto mt-8 space-y-6">
        {activeOrder && activeOrder.status !== 'delivered' && (
          <div className="bg-[#ffaa00] p-6 rounded-[2rem] text-black border-4 border-black">
             <div className="flex justify-between items-center mb-4">
                <h2 className="font-black italic uppercase">Track Order</h2>
                <span className="text-[10px] font-bold bg-black/10 px-2 py-1 rounded">#{activeOrder.id.slice(0,5)}</span>
             </div>
             <div className="flex justify-between px-2">
                <div className="flex flex-col items-center">
                  <div className={`p-3 rounded-2xl border-2 ${activeOrder.payment_status === 'verified' ? 'bg-black text-[#ffaa00] border-black' : 'bg-black/10 text-black/20 border-transparent'}`}><Clock size={16}/></div>
                  <span className="text-[8px] font-black uppercase mt-2">Paid</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`p-3 rounded-2xl border-2 ${activeOrder.status === 'preparing' ? 'bg-black text-[#ffaa00] border-black' : 'bg-black/10 text-black/20 border-transparent'}`}><Flame size={16}/></div>
                  <span className="text-[8px] font-black uppercase mt-2">Cook</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`p-3 rounded-2xl border-2 ${activeOrder.status === 'dispatched' ? 'bg-black text-[#ffaa00] border-black' : 'bg-black/10 text-black/20 border-transparent'}`}><Truck size={16}/></div>
                  <span className="text-[8px] font-black uppercase mt-2">Sent</span>
                </div>
             </div>
          </div>
        )}

        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-3">
            <input placeholder="YOUR NAME" onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full bg-black p-3 rounded-xl text-xs outline-none focus:border-[#ffaa00] border border-transparent"/>
            <textarea placeholder="DELIVERY ADDRESS" onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} className="w-full bg-black p-3 rounded-xl text-xs outline-none focus:border-[#ffaa00] border border-transparent h-20"/>
        </div>

        {menuItems.map(item => (
          <div key={item.id} className="bg-zinc-900 p-5 rounded-3xl flex justify-between items-center border border-white/5">
            <div><h3 className="font-bold uppercase tracking-tight">{item.name}</h3><p className="text-[#ffaa00] font-black italic text-sm">₹{item.price}</p></div>
            <div className="flex items-center gap-3 bg-black/40 p-1 rounded-xl">
              {cart[item.id] && <button onClick={() => removeFromCart(item.id)} className="p-1 text-[#ffaa00]"><Minus size={16}/></button>}
              <span className="text-xs font-bold px-2">{cart[item.id]?.qty || 0}</span>
              <button onClick={() => addToCart(item)} className="p-1 text-[#ffaa00]"><Plus size={16}/></button>
            </div>
          </div>
        ))}
      </main>

      {totalPrice > 0 && !orderComplete && (
        <div className="fixed bottom-6 left-4 right-4 max-w-xl mx-auto bg-[#ffaa00] p-4 rounded-3xl flex justify-between items-center shadow-xl">
          <p className="text-black font-black text-xl italic">₹{totalPrice}</p>
          <button onClick={submitOrder} disabled={isOrdering} className="bg-black text-white px-6 py-3 rounded-2xl font-black uppercase text-xs">SEND ORDER</button>
        </div>
      )}

      {activeOrder && (
        <button onClick={() => setShowChat(!showChat)} className="fixed bottom-24 right-6 bg-white text-black p-4 rounded-full shadow-lg z-40">
          <MessageSquare size={24} />
        </button>
      )}

      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed inset-x-6 bottom-32 max-w-sm ml-auto bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden z-50 h-[400px] flex flex-col shadow-2xl">
            <div className="bg-[#ffaa00] p-4 text-black font-black flex justify-between items-center">
              <span className="text-xs uppercase">Message Chef</span>
              <button onClick={() => setShowChat(false)}><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.is_chef ? 'items-start' : 'items-end'}`}>
                  <div className={`p-3 rounded-2xl max-w-[80%] text-[10px] ${m.is_chef ? 'bg-white/10 text-white' : 'bg-[#ffaa00] text-black font-bold'}`}>{m.text}</div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-black flex gap-2">
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type..." className="flex-1 bg-zinc-900 p-2 rounded-xl text-xs outline-none" />
              <button onClick={sendMessage} className="bg-[#ffaa00] p-2 rounded-xl text-black"><Send size={16}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {orderComplete && (
          <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-6">
            <div className="bg-zinc-900 border border-[#ffaa00] p-8 rounded-[3rem] text-center w-full max-w-sm">
              <CheckCircle size={48} className="text-[#ffaa00] mx-auto mb-4" />
              <h2 className="text-2xl font-black italic mb-6 uppercase">Logged</h2>
              <div className="bg-white p-4 rounded-3xl mb-6 inline-block">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=YOUR_UPI_ID@fampay&am=${totalPrice}`} className="w-40 h-40" alt="QR" />
              </div>
              <button onClick={() => setOrderComplete(false)} className="w-full py-4 bg-[#ffaa00] text-black font-black rounded-2xl uppercase">Close & Track</button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}