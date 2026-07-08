'use client';

import { createClient } from '@/src/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage(){
    const router = useRouter();
    const supabase = createClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [ error, setError] = useState<string | null>(null);

    async function handleLogin(e: React.FormEvent){
        e.preventDefault();
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({ email, password});

        if(error){
            setError(error.message);
            return;
        }

        router.push('/');
        router.refresh();
    }

    return (
        <form onSubmit={handleLogin}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                required
            />
            {error && <p className="text-red-500">{error}</p>}
            <button type="submit">Đăng nhập</button>
    </form>    
    );
}
