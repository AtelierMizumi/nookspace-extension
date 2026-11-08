# NOOKSPACE — BÁO CÁO TRIỂN KHAI HỆ THỐNG TÀI KHOẢN & XÁC THỰC SUPABASE
# POST-ROADMAP INITIATIVE: USER IDENTITY, LOGIN, REGISTRATION & PROFILE FOUNDATION

- **Dự án:** NookSpace — Your Space. Your Workflow.
- **Thư mục làm việc:** `D:\NookSpace`
- **Nhánh:** `master`
- **Phiên bản:** `0.1.0-alpha.51`
- **Công nghệ nền tảng:** WXT + React 18 + TypeScript Strict + Tailwind CSS + Dexie + Supabase v2
- **Trình duyệt mục tiêu:** Chromium MV3 (Chrome, Cốc Cốc, Edge, Brave), Firefox MV2/MV3 (Firefox, Zen Browser)
- **Chính sách Git:** Tuân thủ nghiêm ngặt quy định — Không commit / Không push / Không tạo tag.

---

## 1. TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC BẢO MẬT

Dự án NookSpace đã thiết lập thành công nền tảng tài khoản người dùng và xác thực Supabase với triết lý thiết kế cốt lõi:

### 1.1 Hai chế độ hoạt động song song (Dual Operating Modes)
1. **Chế độ Cá nhân (Personal Mode - Local-First):**
   - Hoạt động 100% ngoại tuyến (offline) và độc lập.
   - Người dùng **không bị ép buộc** phải tạo tài khoản hay đăng nhập mới được sử dụng ứng dụng.
   - Toàn bộ dữ liệu cá nhân (Ghi chú, Danh sách công việc Todo, Dấu trang Smart Bookmarks, Lịch học tập Study Tracker, Mục tiêu Daily Goals, Flashcards, Pomodoro, Tuỳ biến giao diện) chỉ lưu trong IndexedDB cục bộ trên máy người dùng.
   - Tuyệt đối không gửi hoặc di dời dữ liệu cá nhân lên đám mây trái ý muốn của người dùng.

2. **Chế độ Chia sẻ (Shared Mode - Cloud Identity):**
   - Kích hoạt khi người dùng đăng nhập tài khoản.
   - Đóng vai trò là nền tảng định danh (Identity & Profile Foundation) chuẩn bị sẵn sàng cho các tính năng chia sẻ phòng học nhóm, chia sẻ ghi chú, không gian làm việc chung (Shared Workspaces).
   - Truy cập vào Không gian Chung được bảo vệ (Protected Entry Point), yêu cầu người dùng phải xác thực.

### 1.2 An toàn & Tương thích Extension WebExtension
- **Lưu trữ phiên xác thực an toàn:** Sử dụng custom storage adapter tích hợp trực tiếp với `browser.storage.local` (qua lớp trừu tượng `browserApi.storage.local`), có bộ đệm bộ nhớ (in-memory fallback) phòng ngừa lỗi hạn ngạch.
- **Xác thực PKCE (Proof Key for Code Exchange):** Thiết lập `flowType: 'pkce'`, vô hiệu hóa việc lưu trữ raw password trong bộ nhớ hay cơ sở dữ liệu cục bộ.
- **Graceful Unconfigured Fallback:** Khi chưa có biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`, hệ thống phát hiện trạng thái chưa cấu hình và hiển thị thông báo hướng dẫn rõ ràng trong modal mà không gây crash ứng dụng hay cản trở việc sử dụng NookSpace ở chế độ cá nhân.
- **Bảo mật cơ sở dữ liệu bằng Row Level Security (RLS):** Toàn bộ truy vấn vào bảng `public.profiles` được bảo vệ bằng các chính sách RLS chỉ cho phép người dùng xem và cập nhật hồ sơ của chính mình (`auth.uid() = id`). Trigger `handle_new_user` được cấu hình `SECURITY DEFINER` và cố định `SET search_path = public` để phòng ngừa SQL injection và leo thang quyền.

---

## 2. CÁC TÍNH NĂNG VÀ THÀNH PHẦN ĐÃ HOÀN TẤT

### 2.1 Hạ tầng Supabase (`src/infrastructure/supabase/`)
- `config.ts`: Đọc và kiểm tra tính hợp lệ của biến môi trường Supabase (`getSupabaseConfig()`, `isSupabaseConfigured()`).
- `storageAdapter.ts`: Adapter lưu trữ tương thích với chuẩn `SupportedStorage` của `@supabase/supabase-js`, hoạt động mượt mà trên Chromium và Firefox.
- `client.ts`: Singleton instance của Supabase Client với cấu hình PKCE, auto-refresh token và session persistence.
- `types.ts`: Định nghĩa kiểu dữ liệu hạ tầng.

### 2.2 Nghiệp vụ tài khoản (`src/features/account/`)
- `validation/authValidation.ts`: Schema kiểm tra dữ liệu bằng Zod (định dạng email, độ dài mật khẩu tối thiểu 6 ký tự, kiểm tra trùng khớp mật khẩu xác nhận, giới hạn độ dài tên hiển thị và tiểu sử).
- `services/authService.ts`: Lớp dịch vụ đăng ký (`signUp`), đăng nhập (`signIn`), đăng xuất (`signOut`), khôi phục mật khẩu (`resetPassword`), lấy session (`getSession`) và lắng nghe sự thay đổi trạng thái xác thực (`onAuthStateChange`).
- `services/profileService.ts`: Lớp dịch vụ tương tác với bảng `public.profiles` (`getProfile`, `updateProfile`), tự động ánh xạ snake_case sang camelCase.
- `stores/authStore.ts`: Zustand store quản lý trạng thái xác thực toàn cục (`status`, `user`, `profile`, `session`, `isConfigured`, `isLoading`, `error`, `activeModal`, `authView`, `pendingEmail`).

### 2.3 Giao diện người dùng (`src/features/account/components/`)
- `AccountMenu.tsx`: Nút định danh tích hợp tại góc phải thanh điều hướng `TopNav`:
  - Khi chưa đăng nhập: Nút "Đăng nhập" / "Sign in" với icon `LogIn`.
  - Khi đã đăng nhập: Monogram đại diện hoặc ảnh đại diện avatar cùng tên hiển thị, kèm dropdown menu: Hồ sơ cá nhân (My Profile), Cài đặt tài khoản (Account Settings), Không gian chung (Shared Workspace), Đăng xuất (Sign Out).
- `AuthModal.tsx`: Hộp thoại xác thực đa năng hỗ trợ chuyển đổi mượt mà giữa các chế độ:
  - Đăng nhập (Email, Mật khẩu, Quên mật khẩu).
  - Đăng ký (Tên hiển thị, Email, Mật khẩu, Xác nhận mật khẩu).
  - Khôi phục mật khẩu (Email, Gửi liên kết đặt lại).
  - Trạng thái chờ xác nhận email (Hiển thị email đã gửi và hướng dẫn kích hoạt).
  - Trạng thái đã gửi liên kết khôi phục.
  - Nút an toàn "Tiếp tục dùng Không gian cá nhân (Ngoại tuyến)" để người dùng luôn có thể quay lại dashboard mà không bị ép buộc đăng nhập.
  - Cảnh báo hướng dẫn cấu hình khi chưa nhập credentials Supabase.
- `ProfileModal.tsx`: Hộp thoại xem và chỉnh sửa thông tin hồ sơ:
  - Tên hiển thị, ngày tham gia, email đăng ký.
  - Tiểu sử cá nhân.
  - Tùy chọn ngôn ngữ giao diện (Tiếng Việt 🇻🇳 / English 🇺🇸) đồng bộ ngay lập tức.
- `AccountSettingsModal.tsx`: Hộp thoại xem chi tiết tài khoản, giải thích cơ chế hoạt động hai chế độ Cá nhân vs Chia sẻ, và nút Đăng xuất.

### 2.4 Bản dịch song ngữ hoàn chỉnh (`src/services/i18n/locales/`)
- Đã bổ sung 100% khóa ngôn ngữ dưới hai namespace `auth` và `account` trong cả `en.ts` và `vi.ts`.
- Đảm bảo độ chính xác và nhất quán 100% giữa hai file từ điển, đã vượt qua bộ test kiểm định `bilingualCompleteness.test.ts`.

### 2.5 Cơ sở dữ liệu và tài liệu hướng dẫn
- `supabase/migrations/20261108000000_create_profiles.sql`: Script khởi tạo bảng `public.profiles`, kích hoạt RLS, trigger tự động tạo hồ sơ khi có user mới trên `auth.users`, và trigger cập nhật `updated_at`.
- `docs/setup/SUPABASE_SETUP_GUIDE.md`: Hướng dẫn chi tiết từng bước bằng tiếng Việt và tiếng Anh để người dùng tạo project Supabase, lấy API key, điền file `.env`, dán mã SQL vào SQL Editor và cấu hình Authentication.
- `.env.example`: Mẫu cấu hình biến môi trường chuẩn.

---

## 3. KẾT QUẢ KIỂM ĐỊNH & KIỂM THỬ (TESTING & VERIFICATION)

| Hạng mục kiểm thử | Công cụ | Kết quả | Ghi chú |
|---|---|---|---|
| Kiểm tra kiểu dữ liệu TypeScript | `npx tsc --noEmit` | **PASSED (0 errors)** | Tuân thủ TypeScript Strict Mode |
| Kiểm tra tính đầy đủ từ điển song ngữ | `bilingualCompleteness.test.ts` | **PASSED (5/5 tests)** | Đạt độ cân xứng 100% en - vi |
| Unit test hệ thống tài khoản | `vitest run tests/unit/account` | **PASSED (30/30 tests)** | 6 file test mới bao phủ storage, validation, service, store và component |
| Kiểm thử hồi quy toàn bộ hệ thống | `npm test` | **PASSED (1,355/1,355 tests)** | 182/182 file test đạt 100% màu xanh |
| Build đóng gói Chromium MV3 | `npm run build` | **PASSED (0 errors)** | Xuất bản tại `.output/chrome-mv3` |
| Build đóng gói Firefox MV2/MV3 | `npm run build:firefox` | **PASSED (0 errors)** | Xuất bản tại `.output/firefox-mv2` |

---

## 4. BƯỚC TIẾP THEO DÀNH CHO NGƯỜI DÙNG (STAGE B CHECKPOINT)

Giai đoạn phát triển mã nguồn và kiểm thử tự động (Stage A) đã hoàn thành xuất sắc và an toàn. Để kết nối NookSpace với dự án Supabase thực tế của bạn:

1. Làm theo hướng dẫn chi tiết tại [SUPABASE_SETUP_GUIDE.md](../../setup/SUPABASE_SETUP_GUIDE.md).
2. Tạo file `.env` tại thư mục gốc `D:\NookSpace` với `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Chạy câu lệnh SQL trong `supabase/migrations/20261108000000_create_profiles.sql` trên Supabase SQL Editor.
4. Mở extension trên trình duyệt và trải nghiệm đăng ký, đăng nhập tài khoản!
