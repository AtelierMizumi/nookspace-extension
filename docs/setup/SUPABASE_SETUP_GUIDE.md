# Hướng dẫn Cấu hình Supabase cho NookSpace
# NookSpace — Supabase Project Configuration & Setup Guide

Tài liệu này hướng dẫn bạn từng bước thiết lập dự án Supabase để kích hoạt tính năng tài khoản, xác thực người dùng và chế độ Không gian Chung (Shared Mode) trên NookSpace.

---

## 1. Tạo dự án Supabase mới

1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập hoặc đăng ký tài khoản.
2. Tại trang **Dashboard**, chọn **New project**.
3. Điền các thông tin:
   - **Name**: `NookSpace` (hoặc tên bạn muốn)
   - **Database Password**: Chọn mật khẩu an toàn và lưu lại
   - **Region**: Chọn khu vực gần bạn nhất (ví dụ: `Southeast Asia (Singapore) - ap-southeast-1`)
   - **Pricing Plan**: Chọn gói **Free Plan**
4. Bấm **Create new project** và đợi 1-2 phút để Supabase khởi tạo hạ tầng.

---

## 2. Lấy thông tin kết nối API

1. Trong dự án Supabase của bạn, ở thanh menu bên trái, nhấp vào biểu tượng bánh răng **Project Settings**.
2. Chọn mục **API** (nằm dưới mục Configuration).
3. Tại đây bạn sẽ thấy hai thông số quan trọng:
   - **Project URL**: Ví dụ `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   - **Project API Keys** -> Tìm khóa có nhãn **anon** hoặc **publishable** (loại `public`, an toàn khi dùng trên client/extension).

---

## 3. Cấu hình biến môi trường trên máy tính

1. Trong thư mục gốc của dự án NookSpace (`D:\NookSpace`), tạo file `.env` (hoặc copy từ `.env.example`):
   ```bash
   cp .env.example .env
   ```
2. Mở file `.env` và điền hai giá trị bạn vừa lấy ở Bước 2:
   ```env
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJh...dien_khoa_anon_cua_ban...
   ```
3. Lưu file `.env`. (Lưu ý: File `.env` đã được cấu hình trong `.gitignore` nên thông tin sẽ không bao giờ bị lộ lên git).

---

## 4. Chạy câu lệnh SQL Migration (Bảng Hồ sơ & RLS)

Để hệ thống tự động tạo hồ sơ người dùng khi đăng ký và đảm bảo bảo mật dữ liệu theo chuẩn Row Level Security (RLS):

1. Trong Supabase Dashboard, nhấp vào mục **SQL Editor** ở thanh menu bên trái.
2. Chọn **New query**.
3. Mở file `supabase/migrations/20261108000000_create_profiles.sql` trong mã nguồn NookSpace, sao chép toàn bộ nội dung và dán vào ô soạn thảo SQL trên Supabase:
   ```sql
   -- Nội dung từ file supabase/migrations/20261108000000_create_profiles.sql
   CREATE TABLE IF NOT EXISTS public.profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     email TEXT NOT NULL,
     display_name TEXT,
     avatar_url TEXT,
     bio TEXT,
     language TEXT DEFAULT 'vi',
     theme TEXT DEFAULT 'system',
     created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
   );

   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can view own profile"
     ON public.profiles FOR SELECT TO authenticated
     USING (auth.uid() = id);

   CREATE POLICY "Users can update own profile"
     ON public.profiles FOR UPDATE TO authenticated
     USING (auth.uid() = id)
     WITH CHECK (auth.uid() = id);

   CREATE POLICY "Users can insert own profile"
     ON public.profiles FOR INSERT TO authenticated
     WITH CHECK (auth.uid() = id);

   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
   BEGIN
     INSERT INTO public.profiles (id, email, display_name, avatar_url, language)
     VALUES (
       NEW.id,
       NEW.email,
       COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
       NEW.raw_user_meta_data->>'avatar_url',
       COALESCE(NEW.raw_user_meta_data->>'language', 'vi')
     )
     ON CONFLICT (id) DO NOTHING;
     RETURN NEW;
   END;
   $$;

   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

   CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
   RETURNS TRIGGER LANGUAGE plpgsql AS $$
   BEGIN
     NEW.updated_at = timezone('utc'::text, now());
     RETURN NEW;
   END;
   $$;

   DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
   CREATE TRIGGER on_profile_updated
     BEFORE UPDATE ON public.profiles
     FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated_at();
   ```
4. Nhấn nút **Run** (hoặc `Ctrl + Enter`).
5. Kết quả báo **Success. No rows returned** nghĩa là bảng `profiles` và các trigger đã sẵn sàng hoạt động!

---

## 5. Cấu hình xác thực (Authentication Settings)

1. Trong Supabase Dashboard, chuyển đến mục **Authentication** -> **URL Configuration**.
2. Tại ô **Site URL**, bạn có thể để URL mặc định của extension hoặc localhost trong lúc phát triển.
3. Tại ô **Redirect URLs**:
   - Thêm đường dẫn trang newtab của extension:
     ```text
     chrome-extension://*
     moz-extension://*
     ```
   - (Tùy chọn) Nếu bạn muốn kiểm tra ngay trên trình duyệt mà không cần xác nhận email qua hộp thư, vào mục **Authentication** -> **Providers** -> **Email** -> Tắt tùy chọn **"Confirm email"** (Enable Email Confirmations: OFF) để có thể đăng ký và đăng nhập được ngay lập tức.

---

## 6. Chạy thử nghiệm trên NookSpace

Sau khi lưu cấu hình `.env`:
1. Chạy lệnh dev server:
   ```bash
   npm run dev
   ```
   hoặc build lại extension:
   ```bash
   npm run build
   ```
2. Mở tab NookSpace trên trình duyệt.
3. Ở góc trên bên phải thanh điều hướng TopNav, bạn sẽ thấy nút **Đăng nhập** / **Sign in**.
4. Bấm vào để:
   - Đăng ký tài khoản mới (Email, Mật khẩu, Tên hiển thị).
   - Đăng nhập tài khoản.
   - Xem thông tin hồ sơ và chỉnh sửa tiểu sử, tên hiển thị, ngôn ngữ.
   - Thử nghiệm chức năng Đăng xuất và Khôi phục mật khẩu.
