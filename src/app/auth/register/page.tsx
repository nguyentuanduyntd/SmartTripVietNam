'use client';

import { createClient } from '@/src/lib/supabase/client';
import { useState } from 'react';

export default function RegisterPage(){
    const supabase = createClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<string | null>(null);

    async function handleRegister(e: React.FormEvent){
        e.preventDefault();

        const { error } = await supabase.auth.signUp({ 
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error){
            setMessage(error.message);
            return;
        }

        setMessage('Kiểm tra email để xác nhận tài khoản.');
    }

    return (
        <form onSubmit={handleRegister}>
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
            {message && <p>{message}</p>}
            <button type="submit">Đăng ký</button>
        </form>
    );
}