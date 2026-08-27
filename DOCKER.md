# Chạy SmartTripVietNam bằng Docker

## Phạm vi hiện tại

Docker chỉ đóng gói ứng dụng Next.js. PostgreSQL, Supabase Auth,
Cloudinary, Gemini, OpenAI, Resend và các API bên ngoài vẫn sử dụng
cấu hình trong `.env.local`.

Redis chưa được thêm ở giai đoạn này. Khi triển khai Redis và BullMQ,
Redis sẽ được bổ sung thành một service riêng trong `compose.yaml`.

## 1. Chuẩn bị môi trường

Đảm bảo Docker Desktop đang chạy và file `.env.local` ở thư mục gốc
đã có đầy đủ biến môi trường theo `.env.example`.

Kiểm tra Docker:

```powershell
docker --version
docker compose version