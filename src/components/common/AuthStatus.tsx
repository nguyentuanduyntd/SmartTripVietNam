import Link from 'next/link';

import { createClient } from '@/src/lib/supabase/server';
import { LogoutButton } from './LogoutButton';

export async function AuthStatus(){
    const supabase = await createClient();

    const{
        data: {user},
    } = await supabase.auth.getUser();

    if(!user){
        return(
            <div>
                <p>Chưa đăng nhập</p>
                <Link href="/auth/login">Đăng nhập</Link>
                {' | '}
                <Link href="/auth/register">Đăng ký</Link>
            </div>
        );
    }
    return (
        <div>
            <p>Đang đăng nhập: {user.email}</p>
            <LogoutButton/>
        </div>
    );
}