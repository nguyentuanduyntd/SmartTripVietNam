'use client';

import { createClient } from '@/src/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton(){
    const router = useRouter();
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(false);
    
    async function handleLogout(){
        setIsLoading(true);

        const { error } = await supabase.auth.signOut();

        if(error){
            console.error(error.message);
            setIsLoading(false);
            return;
        }
        router.push('/auth/login');
        router.refresh();
    }
    return (
        <button type="button" onClick={handleLogout} disabled={isLoading}>
            {isLoading ? 'Đang đăng xuất...':'Đăng xuất'}
        </button>
    );
}