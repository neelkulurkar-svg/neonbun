'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function ChefLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else router.push('/kitchen');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-mono">
      <form onSubmit={handleLogin} className="bg-zinc-900 p-8 rounded-[2rem] border border-[#ffaa00] w-full max-w-sm">
        <h1 className="text-[#ffaa00] text-2xl font-black mb-6 italic uppercase">Chef Auth</h1>
        <input type="email" placeholder="CHEF EMAIL" onChange={e => setEmail(e.target.value)} className="w-full bg-black p-4 rounded-xl border border-white/10 mb-4 text-white focus:border-[#ffaa00] outline-none" />
        <input type="password" placeholder="SECRET KEY" onChange={e => setPassword(e.target.value)} className="w-full bg-black p-4 rounded-xl border border-white/10 mb-6 text-white focus:border-[#ffaa00] outline-none" />
        <button className="w-full py-4 bg-[#ffaa00] text-black font-black rounded-xl uppercase hover:scale-105 transition-transform">Unlock Kitchen</button>
      </form>
    </div>
  );
}