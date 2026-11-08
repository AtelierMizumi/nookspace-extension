# NookSpace ✦ Your Space. Your Workflow.

> Một không gian làm việc số và học tập năng suất cao, biến trang Tab Mới (New Tab) của trình duyệt thành một Studio đa năng, riêng tư và giàu tính năng. Hỗ trợ đầy đủ Google Chrome, Cốc Cốc, Microsoft Edge, Brave và Zen Browser / Mozilla Firefox.

---

## 🌟 Tổng quan & Kiến trúc Hai Chế độ Hoạt động

NookSpace được thiết kế theo triết lý độc đáo kết hợp giữa **Ngoại tuyến tối đa (Local-First)** và **Cộng tác trực tuyến thời gian thực (Realtime Collaborative)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NOOKSPACE EXTENSION                             │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
         [Chế độ Cá nhân (Offline)]        [Chế độ Chia sẻ (Online)]
                    │                                │
         ┌──────────▼───────────┐         ┌──────────▼───────────┐
         │ IndexedDB (Dexie.js) │         │  Supabase Cloud DB   │
         │  17 Bảng dữ liệu     │         │  Realtime & Storage  │
         │  100% Cục bộ & Bảo mật│        │  Phòng học & Nhóm    │
         └──────────────────────┘         └──────────────────────┘
```

1. **Chế độ Cá nhân (Personal Mode - 100% Local-First)**:
   - Hoàn toàn **không bắt buộc đăng ký tài khoản** hay kết nối mạng.
   - Toàn bộ ghi chú, danh sách công việc, dấu trang thông minh, phiên Pomodoro, thói quen và bố cục widget được lưu trữ trực tiếp trong **IndexedDB** trên máy của bạn.
   - Không có telemetry, không có analytics, không gửi dữ liệu cá nhân lên bất kỳ máy chủ nào.

2. **Chế độ Không gian Làm việc chung (Shared Mode - Online Realtime)**:
   - Đăng nhập an toàn qua **Supabase Auth**.
   - Tạo phòng học / phòng làm việc nhóm với **mã tham gia 6 ký tự** duy nhất (ví dụ: `PHM5QL`).
   - Màn hình tự động chuyển sang **Không gian làm việc chung (Shared Workspace)**:
     - 📝 **Ghi chú chung (Shared Notes)**: Cùng viết, cùng đọc, tự động lưu và đồng bộ tức thời.
     - 📋 **Nhiệm vụ nhóm (Shared Tasks)**: Cùng tạo việc cần làm; khi một người tick hoàn thành, task sẽ gạch ngang trên màn hình của cả phòng.
     - 🎵 **Đồng bộ Âm thanh nền (Ambient Audio Sync)**: Khi chủ phòng bật tiếng mưa rào hay lofi, toàn bộ thành viên trong phòng cùng nghe chung bầu không khí học tập.
     - 💬 **Khung Chat trực tiếp (Live Room Chat)**: Trò chuyện có Avatar, tên hiển thị, kèm thông báo tự động khi thành viên vào/ra phòng.
     - 👑 **Quyền của Chủ phòng (Admin/Owner)**: Quản lý thành viên, mời người khác ra khỏi phòng (Kick) hoặc giải tán/xóa phòng (Delete Room).
     - 🔒 **Ràng buộc an toàn**: Người dùng phải bấm **"Thoát phòng"** thì mới trở về Không gian cá nhân ngoại tuyến ban đầu.

---

## ✨ Tính năng Nổi bật

### 1. Không gian làm việc chung & Phòng học ảo (Shared Workspace & Virtual Study Room)
- **Tạo & Tham gia phòng nhanh**: Tạo phòng với màu đại diện tùy chọn hoặc nhập mã 6 ký tự để vào phòng bạn bè.
- **Lưới thành viên trực quan**: Xem danh sách thành viên trong phòng, xem ảnh đại diện (Avatar), huy hiệu 👑 Chủ phòng / 👤 Thành viên và trạng thái trực tuyến.
- **Trạng thái học tập thời gian thực**:
  - 🟢 **Đang tập trung (In Focus)**: Chấm xanh nhấp nháy, hiển thị môn học/công việc đang làm (ví dụ: *Ôn thi Giải tích*).
  - 🟡 **Nghỉ giải lao (On Break)**: Báo hiệu đang giải lao uống nước/cà phê.
  - ⚪ **Rảnh rỗi (Idle)**: Sẵn sàng thảo luận.
- **Đồng hồ Pomodoro phòng học**: Đếm ngược 25 phút tập trung đồng hành cùng nhóm.
- **Trình phát âm thanh nền đồng bộ (Web Audio API Synthesizer)**:
  - 🌧️ **Mưa rào (Gentle Rain)**
  - 🌊 **Sóng biển (Ocean Waves)**
  - ☕ **Quán Cafe (Coffee Shop)**
  - ⚡ **Tiếng ồn trắng (White Noise)**
  - 🎧 **Lofi Chill Beats**
  - Tích hợp sẵn trong trình duyệt, không tốn băng thông ngoài, không lo bản quyền. Có nút Tắt tiếng (Mute) và chỉnh âm lượng riêng cho từng cá nhân.
- **Khung Chat thời gian thực**:
  - Hiển thị tin nhắn, Avatar, tên người gửi và thời gian gửi.
  - Tự động phát thông báo hệ thống: *"🟢 [Tên] đã tham gia phòng"*, *"⚪ [Tên] đã rời phòng"*.
- **Quản lý phòng mạnh mẽ**:
  - Admin có nút **Kick (Mời ra khỏi phòng)** cạnh tên thành viên khác.
  - Admin có nút **Xóa phòng (Delete Room)** để giải tán phòng khi kết thúc phiên làm việc.

### 2. Quản lý Tài khoản & Hồ sơ (Account & Profiles)
- Đăng ký, Đăng nhập email/mật khẩu, Quên mật khẩu an toàn với Supabase Auth.
- **Tải ảnh đại diện (Avatar Upload)**: Tải ảnh JPG/PNG/WebP/GIF lên Supabase Storage với dung lượng tối đa 5MB, bảo mật thư mục theo UID (`avatars/{userId}/...`).
- Chỉnh sửa Tên hiển thị, Tiểu sử (Bio), và xem ngày tham gia.

### 3. Bảng điều khiển Cá nhân & Hệ thống Tiện ích (Widgets)
- 🔍 **Thanh tìm kiếm thông minh**: Hỗ trợ Google, Bing, DuckDuckGo; điều hướng trực tiếp tên miền (`github.com`, `localhost:3000`) và chặn các mã độc hại (`javascript:`, `data:`).
- 🕒 **Thời gian & Chào hỏi**: Đồng hồ số hiển thị theo giây, câu chào theo thời gian trong ngày.
- 🍅 **Pomodoro & Đồng hồ bấm giờ**: Bộ đếm thời gian tập trung với chuông báo âm thanh và thông báo trình duyệt.
- ✅ **Danh sách việc cần làm (Todo List)**: Phân loại mức độ ưu tiên, gắn nhãn danh mục, kéo thả sắp xếp.
- 🔖 **Dấu trang thông minh (Smart Bookmarks)**: Phân nhóm thư mục, lấy favicon tự động, tìm kiếm nhanh và nhập/xuất file HTML Netscape.
- 📝 **Ghi chú & Kiến thức (Notes & Flashcards)**: Soạn thảo Markdown an toàn, thẻ ghi nhớ từ vựng, tài nguyên học tập.
- 🔥 **Lịch học tập & Chuỗi ngày (Study Calendar & Streaks)**: Tính chuỗi ngày học liên tục không bị ảnh hưởng bởi múi giờ (DST-immune).
- 🎨 **Studio Tùy biến Bố cục**: Kéo thả lưới 12 cột tự do, tự căn chỉnh trên 5 kích thước màn hình (`lg`, `md`, `sm`, `xs`, `xxs`).
- 🖼️ **Hình nền tùy chỉnh**: Tải ảnh hình nền chất lượng cao từ máy tính (lưu trong IndexedDB) hoặc dùng link ảnh HTTPS, có lớp phủ mờ tối ưu độ đọc chữ.
- 🌐 **Hệ thống Song ngữ 100%**: Chuyển đổi mượt mà giữa **Tiếng Việt** và **English** mà không tải lại trang.

---

## 🗄️ Kiến trúc Cơ sở Dữ liệu (Database Architecture)

### 1. Cơ sở dữ liệu Cục bộ (IndexedDB qua Dexie.js)
Dành riêng cho Chế độ Cá nhân, quản lý qua 17 bảng strongly-typed trong `NookSpaceDB`:
- `workspaces`: Danh sách không gian làm việc cá nhân và cài đặt preset.
- `widgetInstances`: Các tiện ích đang được gắn trên bảng điều khiển.
- `widgetLayouts`: Tọa độ (x, y, w, h) của từng widget theo 5 breakpoint màn hình.
- `todos`: Danh sách công việc cá nhân.
- `notes`, `noteCollections`, `noteTags`: Hệ thống ghi chú và bộ sưu tập.
- `bookmarks`, `bookmarkGroups`: Cây thư mục dấu trang thông minh.
- `focusSessions`: Lịch sử các phiên tập trung Pomodoro.
- `dailyGoals`: Mục tiêu học tập hàng ngày.
- `settings`: Cài đặt giao diện, ngôn ngữ, công cụ tìm kiếm, hình nền.
- `localAudioTracks`, `stickyNotes`, `vocabulary`, `resources`, `calendarEvents`...

### 2. Cơ sở dữ liệu Đám mây (PostgreSQL trên Supabase)
Dành riêng cho Chế độ Chia sẻ, bảo vệ bằng chính sách **Row Level Security (RLS)** và các hàm `SECURITY DEFINER` chống vòng lặp đệ quy:
- **`public.profiles`**: Lưu UID, email, tên hiển thị, URL avatar, tiểu sử. Tự động kích hoạt khi tài khoản mới đăng ký qua Supabase Trigger.
- **`public.shared_workspaces`**: Lưu thông tin phòng, mã tham gia 6 ký tự (`join_code`), màu đại diện, ID chủ phòng (`owner_id`).
- **`public.shared_workspace_members`**: Lưu thành viên trong phòng và vai trò (`owner`, `admin`, `member`).
- **`public.study_room_presence`**: Lưu trạng thái học tập trực tiếp (`IN_FOCUS`, `ON_BREAK`, `IDLE`), môn đang học, số phút tập trung tích lũy. Kích hoạt Supabase Realtime broadcast.
- **`public.shared_workspace_data`**: Lưu bảng ghi chú cộng tác (`notes`), danh sách nhiệm vụ nhóm (`tasks`), và trạng thái âm thanh (`audio_state`). Đồng bộ hai chiều qua Supabase Realtime.
- **`public.shared_workspace_messages`**: Lưu lịch sử chat phòng và tin nhắn thông báo vào/ra phòng.
- **`storage.buckets ('avatars')`**: Lưu trữ ảnh đại diện của người dùng với chính sách chỉ cho phép chủ tài khoản upload/sửa ảnh trong thư mục `avatars/{userId}/`.

---

## 🛠️ Hướng dẫn Cài đặt Cơ sở Dữ liệu Supabase (Database Setup)

Để kích hoạt tính năng Đăng nhập và Phòng học chung trên dự án của bạn:

### Bước 1: Tạo dự án Supabase
1. Truy cập [https://supabase.com](https://supabase.com) và tạo một tài khoản miễn phí.
2. Tạo một **New Project** mới (chọn khu vực gần bạn, ví dụ: *Singapore*).

### Bước 2: Lấy thông tin API
1. Vào **Project Settings** (biểu tượng bánh răng) $\to$ **API**.
2. Sao chép 2 giá trị:
   - **Project URL** (dạng `https://xxxxxxxxxxxx.supabase.co`)
   - **Project API Keys** $\to$ lấy khóa **`anon` / `publishable`** (khóa công khai an toàn cho trình duyệt).

### Bước 3: Cấu hình file `.env` trên máy
Tạo file `.env` tại thư mục gốc của dự án (`D:\NookSpace\.env`) với nội dung:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-publishable-key
```

### Bước 4: Chạy SQL Migrations
Mở **Supabase Dashboard $\to$ SQL Editor**, tạo New Query và dán lần lượt nội dung của 4 file migration trong thư mục `supabase/migrations/`:
1. `supabase/migrations/20261108000000_create_profiles.sql` *(Tạo bảng hồ sơ & trigger tự động tạo profile khi đăng ký)*
2. `supabase/migrations/20261108010000_storage_avatars.sql` *(Tạo storage bucket `avatars` & policies upload ảnh)*
3. `supabase/migrations/20261108020000_shared_workspaces.sql` *(Tạo bảng phòng chia sẻ, thành viên, trạng thái phòng & hàm join mã)*
4. `supabase/migrations/20261108030000_shared_room_sync_chat.sql` *(Tạo bảng ghi chú/nhiệm vụ/âm thanh chung & khung chat realtime)*

Nhấn **Run**. Khi thông báo `Success` xuất hiện là hạ tầng backend của bạn đã sẵn sàng 100%!

---

## 💻 Hướng dẫn Cài đặt Tiện ích trên Trình duyệt

Dự án hỗ trợ sẵn cả 2 dòng trình duyệt phổ biến nhất hiện nay:

### 1. Trình duyệt nhân Chromium (Google Chrome, Cốc Cốc, Microsoft Edge, Brave)
1. Mở terminal tại thư mục dự án và đóng gói bản Chromium:
   ```bash
   npm run build
   ```
   *(Thư mục đầu ra: `.output/chrome-mv3`)*
2. Mở trình duyệt và truy cập trang quản lý tiện ích:
   - **Cốc Cốc**: `coccoc://extensions`
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
3. Bật công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải.
4. Nhấn nút **Tải tiện ích đã giải nén (Load unpacked)** $\to$ Chọn thư mục:
   ```text
   D:\NookSpace\.output\chrome-mv3
   ```
5. Mở Tab mới (`Ctrl + T`) để trải nghiệm NookSpace!

---

### 2. Trình duyệt nhân Gecko / Firefox (Zen Browser, Mozilla Firefox)
1. Mở terminal tại thư mục dự án và đóng gói bản Firefox:
   ```bash
   npm run build:firefox
   ```
   *(Thư mục đầu ra: `.output/firefox-mv2`)*
2. Mở Zen Browser hoặc Firefox, truy cập đường dẫn:
   ```text
   about:debugging#/runtime/this-firefox
   ```
3. Nhấn vào nút **Load Temporary Add-on... (Tải tiện ích tạm thời...)**.
4. Duyệt tới thư mục và chọn file:
   ```text
   D:\NookSpace\.output\firefox-mv2\manifest.json
   ```
5. **Cấu hình quan trọng dành riêng cho Zen Browser:**
   - Trên thanh địa chỉ của Zen Browser, nhập `about:config` và nhấn Enter.
   - Tìm kiếm từ khóa: `zen.urlbar.replace-newtab`
   - Nhấp đúp chuột để chuyển giá trị từ `true` thành **`false`**.
   - Nhấn `Ctrl + T` để tận hưởng NookSpace làm trang Tab mới trên Zen Browser!

---

## 🚀 Hướng dẫn Dành cho Lập trình viên (Developer Guide)

```bash
# 1. Clone mã nguồn từ GitHub
git clone https://github.com/giabaoqh/nookspace-extension.git
cd nookspace-extension

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Chạy môi trường phát triển (Hot-Reload)
# Dành cho Chromium:
npm run dev

# Dành cho Zen Browser / Firefox:
npm run dev:firefox

# 4. Kiểm tra biên dịch TypeScript nghiêm ngặt (Strict TypeCheck)
npm run compile

# 5. Chạy bộ kiểm thử tự động toàn diện (165+ test suites)
npm test
```

---

## 📂 Cấu trúc Thư mục Dự án

```
nookspace-extension/
├── docs/                      # Tài liệu kiến trúc, PRD, context và báo cáo phát triển
│   ├── PRD.md                 # Yêu cầu sản phẩm chi tiết
│   ├── ARCHITECTURE.md        # Thiết kế kiến trúc tổng thể
│   ├── CHANGELOG.md           # Nhật ký thay đổi phiên bản
│   └── setup/                 # Tài liệu hướng dẫn cài đặt hạ tầng Supabase
├── entrypoints/               # Điểm khởi chạy của WXT Extension
│   ├── newtab/                # Ứng dụng chính trang Tab Mới (App.tsx, index.html)
│   ├── popup/                 # Menu popup nhanh trên thanh công cụ trình duyệt
│   └── background.ts          # Service Worker chạy nền quản lý Pomodoro alarms
├── src/
│   ├── components/            # UI Primitives (Button, Modal, Input, Dropdown, Tooltip...)
│   ├── features/              # Các mô-đun chức năng độc lập:
│   │   ├── account/           # Hệ thống tài khoản, auth, hồ sơ, lưu avatar
│   │   ├── shared-workspace/  # Phòng học chung, khung chat, đồng bộ ghi chú/nhiệm vụ/âm thanh
│   │   ├── bookmarks/         # Dấu trang thông minh, tìm kiếm fuzzy, import/export
│   │   ├── notes/             # Quản lý ghi chú Markdown, bộ sưu tập, thẻ nhãn
│   │   ├── workspaces/        # Đa không gian làm việc cá nhân, presets
│   │   ├── preferences/       # Cài đặt nền, ngôn ngữ, công cụ tìm kiếm
│   │   └── widget-system/     # Hệ thống đăng ký và kết nối widget
│   ├── widgets/               # Các tiện ích cụ thể (Pomodoro, Todo, Clock, Music, Calendar...)
│   ├── infrastructure/        # Tích hợp hạ tầng Supabase (Client, StorageAdapter, Config)
│   ├── services/              # Cơ sở dữ liệu Dexie cục bộ, i18n đa ngôn ngữ, Browser API
│   ├── stores/                # Zustand stores (UI state, layout, settings, themes)
│   └── types/                 # Định nghĩa kiểu dữ liệu TypeScript & schema Zod
├── supabase/
│   └── migrations/            # Toàn bộ mã nguồn SQL migration cho cơ sở dữ liệu Supabase
├── tests/                     # Hệ thống test tự động Vitest & React Testing Library
├── .env.example               # File mẫu biến môi trường (an toàn khi chia sẻ)
├── package.json               # Cấu hình dự án và dependencies
└── wxt.config.ts              # Cấu hình đa nền tảng WXT (Chromium MV3 & Firefox MV2)
```

---

## 🔒 Cam kết Riêng tư & Bảo mật (Privacy & Security First)

1. **Không thu thập dữ liệu (Zero Telemetry)**: Không chứa Google Analytics, Mixpanel, hay bất kỳ mã theo dõi người dùng nào.
2. **Không thực thi mã động (Zero Dynamic Execution)**: Không sử dụng `eval()` hoặc chèn HTML động không an toàn, đạt chuẩn Content Security Policy (CSP) khắt khe của Chrome Web Store và Mozilla Add-ons.
3. **Bảo vệ khóa bí mật (Secret Isolation)**: File `.env` chứa thông tin nhạy cảm được cấu hình tự động trong `.gitignore`, đảm bảo không bao giờ bị rò rỉ lên GitHub.

---

## 📜 Giấy phép & Đóng góp
Dự án được xây dựng và phát triển bởi [giabaoqh](https://github.com/giabaoqh). Mọi ý kiến đóng góp, báo cáo lỗi và yêu cầu tính năng mới đều được hoan nghênh qua mục [Issues](https://github.com/giabaoqh/nookspace-extension/issues) trên GitHub.
