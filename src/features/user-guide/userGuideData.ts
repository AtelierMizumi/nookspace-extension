export interface UserGuideTopic {
  id: string;
  titleEn: string;
  titleVi: string;
  summaryEn: string;
  summaryVi: string;
  stepsEn: string[];
  stepsVi: string[];
  shortcuts?: Array<{
    key: string;
    descriptionEn: string;
    descriptionVi: string;
  }>;
  tipsEn?: string;
  tipsVi?: string;
}

export interface UserGuideSection {
  id: string;
  iconName: string;
  titleEn: string;
  titleVi: string;
  descriptionEn: string;
  descriptionVi: string;
  topics: UserGuideTopic[];
}

export const USER_GUIDE_SECTIONS: UserGuideSection[] = [
  {
    id: 'getting-started',
    iconName: 'Rocket',
    titleEn: 'Getting Started',
    titleVi: 'Bắt đầu sử dụng',
    descriptionEn: 'Essential concepts, first-time setup, and dashboard orientation.',
    descriptionVi: 'Các khái niệm nền tảng, thiết lập ban đầu và định hướng giao diện.',
    topics: [
      {
        id: 'what-is-nookspace',
        titleEn: 'What is NookSpace?',
        titleVi: 'NookSpace là gì?',
        summaryEn: 'NookSpace is a local-first, privacy-respecting personal productivity workspace and homepage for your browser.',
        summaryVi: 'NookSpace là không gian làm việc cá nhân và trang chủ trình duyệt ưu tiên bảo mật cục bộ, hoạt động trực tiếp trong máy tính.',
        stepsEn: [
          'All your data (notes, bookmarks, goals, preferences) resides securely inside browser IndexedDB.',
          'Zero analytics trackers, zero telemetry, and zero mandatory cloud logins.',
          'Works seamlessly offline and supports instantaneous startup on Chromium and Firefox/Gecko browsers.',
        ],
        stepsVi: [
          'Toàn bộ dữ liệu (ghi chú, dấu trang, mục tiêu, cấu hình) được lưu trực tiếp trong IndexedDB của trình duyệt.',
          'Không theo dõi phân tích, không telemetry và không bắt buộc tài khoản đám mây.',
          'Hoạt động mượt mà ngoại tuyến (offline) và khởi động tức thì trên các trình duyệt Chromium và Firefox/Gecko.',
        ],
        tipsEn: 'Export a full backup anytime from Preferences > Backup & Restore to keep your data safe.',
        tipsVi: 'Bạn có thể xuất bản sao lưu bất kỳ lúc nào từ Cài đặt > Sao lưu & Khôi phục để đảm bảo an toàn dữ liệu.',
      },
      {
        id: 'dashboard-orientation',
        titleEn: 'Dashboard Overview & Orientation',
        titleVi: 'Tổng quan giao diện Dashboard',
        summaryEn: 'Understand the primary zones of your NookSpace environment.',
        summaryVi: 'Tìm hiểu các khu vực điều hướng chính trong không gian NookSpace.',
        stepsEn: [
          'Top Navigation Bar: Switch workspaces, access Notes & Bookmarks, toggle Edit mode, switch themes, open User Guide, and open Preferences.',
          'Greeting & Search Header: Real-time clock, personalized greeting, and integrated omni-search bar.',
          'Responsive Widget Canvas: Interactive grid containing your active widgets with auto-layout preservation.',
          'Bottom Footer: Version indicator and platform branding.',
        ],
        stepsVi: [
          'Thanh điều hướng đỉnh (TopNav): Chuyển đổi workspace, mở Ghi chú & Dấu trang, bật Chế độ sửa, đổi chủ đề giao diện, mở Hướng dẫn và mở Cài đặt.',
          'Khu vực Lời chào & Tìm kiếm: Đồng hồ thời gian thực, lời chào cá nhân hóa và thanh tìm kiếm tích hợp.',
          'Khung lưới Tiện ích: Lưới linh hoạt hiển thị các widget đang hoạt động với tính năng tự động ghi nhớ bố cục.',
          'Thanh chân trang (Footer): Hiển thị phiên bản và thương hiệu nền tảng.',
        ],
        shortcuts: [
          { key: 'Ctrl + T', descriptionEn: 'Open a new NookSpace tab', descriptionVi: 'Mở tab NookSpace mới' },
          { key: 'Ctrl + K / /', descriptionEn: 'Focus the search bar', descriptionVi: 'Đưa con trỏ vào thanh tìm kiếm' },
        ],
      },
      {
        id: 'browser-startup-setup',
        titleEn: 'Setting Up Browser Startup & Homepage',
        titleVi: 'Thiết lập Trang chủ & Khởi động Trình duyệt',
        summaryEn: 'Configure NookSpace to appear when starting your browser or opening new windows.',
        summaryVi: 'Cài đặt NookSpace tự động hiển thị khi mở trình duyệt hoặc tạo cửa sổ mới.',
        stepsEn: [
          'Open NookSpace Preferences (Gear icon in top-right) and scroll to "Browser Integration".',
          'Review the guided instructions tailored for Chrome, Cốc Cốc, Edge, or Zen Browser.',
          'For Chromium browsers: Go to Settings > On startup > Open a specific page > Add NookSpace extension URL.',
          'For Zen Browser: Set Home page and new windows to Custom URL or use Zen new tab integration.',
        ],
        stepsVi: [
          'Mở Cài đặt NookSpace (biểu tượng bánh răng góc trên bên phải) và cuộn đến mục "Tích hợp Trình duyệt".',
          'Xem hướng dẫn chi tiết cho Chrome, Cốc Cốc, Edge hoặc Zen Browser.',
          'Với trình duyệt Chromium: Vào Cài đặt > Khi khởi động > Mở một trang cụ thể > Thêm URL tiện ích NookSpace.',
          'Với Zen Browser: Thiết lập Trang chủ và cửa sổ mới thành URL tùy chỉnh hoặc tích hợp tab mới của Zen.',
        ],
      },
    ],
  },
  {
    id: 'dashboard-widgets',
    iconName: 'LayoutGrid',
    titleEn: 'Dashboard & Widgets',
    titleVi: 'Bảng điều khiển & Tiện ích',
    descriptionEn: 'Adding, rearranging, resizing, and configuring widgets across 5 responsive breakpoints.',
    descriptionVi: 'Thêm, sắp xếp, đổi kích thước và cấu hình tiện ích trên 5 kích thước màn hình.',
    topics: [
      {
        id: 'widget-customization',
        titleEn: 'Edit Mode: Dragging & Resizing',
        titleVi: 'Chế độ Sửa: Kéo thả & Thay đổi kích thước',
        summaryEn: 'Freely customize your widget layout with live snapping grid feedback.',
        summaryVi: 'Tự do tùy biến vị trí và diện tích widget với lưới căn chỉnh trực quan.',
        stepsEn: [
          'Click the "Customize" (LayoutGrid) button in the top navigation bar to enter Edit Mode.',
          'Drag widgets by their title bar or handles to reposition them.',
          'Pull the resize handle in the bottom-right corner of any widget to resize its width and height.',
          'Click "Done" to save your layout permanently to IndexedDB, or "Cancel" to revert changes.',
        ],
        stepsVi: [
          'Nhấp vào nút "Tùy biến" (LayoutGrid) trên thanh đỉnh để chuyển sang Chế độ Chỉnh sửa.',
          'Kéo widget bằng thanh tiêu đề hoặc tay nắm để thay đổi vị trí.',
          'Kéo góc dưới bên phải của widget để thay đổi chiều rộng và chiều cao.',
          'Nhấn "Xong" để lưu bố cục vào IndexedDB, hoặc "Hủy" để khôi phục trạng thái ban đầu.',
        ],
        tipsEn: 'Layouts are independently tracked across 5 responsive breakpoints: Mobile, Phablet, Tablet, Desktop, and Ultrawide.',
        tipsVi: 'Bố cục được lưu riêng biệt cho từng loại màn hình: Điện thoại, Phablet, Máy tính bảng, Desktop và Màn hình rộng.',
      },
      {
        id: 'widget-catalog',
        titleEn: 'Widget Catalog & Adding Widgets',
        titleVi: 'Thư viện Tiện ích & Thêm Widget mới',
        summaryEn: 'Explore available productivity, media, and utility widgets.',
        summaryVi: 'Khám phá các tiện ích năng suất, giải trí và công cụ đa dạng.',
        stepsEn: [
          'Click "+ Add Widget" in the top bar or customization toolbar.',
          'Filter by category (Core, Productivity, Personal) or search by name.',
          'Click "Add" to place the widget onto your active workspace grid.',
          'You can enable or disable widgets without losing their stored settings.',
        ],
        stepsVi: [
          'Nhấn "+ Thêm tiện ích" trên thanh đỉnh hoặc thanh công cụ tùy biến.',
          'Lọc theo phân loại (Cơ bản, Năng suất, Cá nhân) hoặc tìm kiếm theo tên.',
          'Nhấn "Thêm" để đặt widget lên lưới làm việc hiện tại.',
          'Bạn có thể bật/tắt widget mà không làm mất cấu hình đã lưu.',
        ],
      },
    ],
  },
  {
    id: 'productivity',
    iconName: 'Timer',
    titleEn: 'Productivity Suite',
    titleVi: 'Bộ công cụ năng suất',
    descriptionEn: 'Daily Goals, Pomodoro Focus Timer, Study Tracker, and Calendar trackers.',
    descriptionVi: 'Mục tiêu hàng ngày, Đồng hồ Pomodoro, Theo dõi học tập và Lịch sự kiện.',
    topics: [
      {
        id: 'pomodoro-timer',
        titleEn: 'Pomodoro Focus Timer',
        titleVi: 'Đồng hồ Pomodoro Tập trung',
        summaryEn: 'Work in structured intervals using the proven 25-minute Pomodoro technique.',
        summaryVi: 'Làm việc theo các chu kỳ tập trung 25 phút khoa học và hiệu quả.',
        stepsEn: [
          'Select between Focus (25m), Short Break (5m), and Long Break (15m).',
          'Click Start to initiate the countdown timer.',
          'Completed sessions are recorded automatically to help you measure productivity.',
          'Audio chimes and system notifications alert you when sessions finish.',
        ],
        stepsVi: [
          'Chọn giữa Tập trung (25 phút), Nghỉ ngắn (5 phút) và Nghỉ dài (15 phút).',
          'Nhấn Bắt đầu để khởi chạy đồng hồ đếm ngược.',
          'Các phiên hoàn thành được ghi nhận tự động để đo lường năng suất học tập và làm việc.',
          'Âm thanh thông báo và chuông báo nhắc nhở khi phiên kết thúc.',
        ],
      },
      {
        id: 'daily-goals',
        titleEn: 'Daily Goals & Tasks',
        titleVi: 'Mục tiêu Hàng ngày & Nhiệm vụ',
        summaryEn: 'Track your highest-priority milestones every day.',
        summaryVi: 'Ghi nhận và hoàn thành các ưu tiên quan trọng nhất mỗi ngày.',
        stepsEn: [
          'Enter a new goal title and optional target duration.',
          'Check off goals as you complete them to maintain focus momentum.',
          'Filter between active and completed goals effortlessly.',
        ],
        stepsVi: [
          'Nhập tên mục tiêu mới và thời lượng dự kiến nếu cần.',
          'Đánh dấu hoàn thành khi làm xong để duy trì đà tập trung.',
          'Chuyển đổi linh hoạt giữa các mục tiêu đang làm và đã hoàn tất.',
        ],
      },
      {
        id: 'study-tracker',
        titleEn: 'Study Tracker & Streaks',
        titleVi: 'Theo dõi Học tập & Chuỗi ngày liên tục',
        summaryEn: 'Track focused study hours and build durable habit streaks.',
        summaryVi: 'Ghi lại thời gian học tập tập trung và duy trì chuỗi ngày liên tục.',
        stepsEn: [
          'Use the stopwatch timer to record study and deep work sessions in real time.',
          'View your daily minutes, current streak, and all-time best streak.',
          'Sessions are automatically aggregated into your local statistics.',
        ],
        stepsVi: [
          'Sử dụng đồng hồ bấm giờ để ghi lại thời gian học và làm việc sâu theo thời gian thực.',
          'Xem số phút học trong ngày, chuỗi ngày hiện tại và kỷ lục chuỗi dài nhất.',
          'Dữ liệu buổi học tự động được tổng hợp vào thống kê cục bộ.',
        ],
      },
    ],
  },
  {
    id: 'notes-knowledge',
    iconName: 'FileText',
    titleEn: 'Notes & Knowledge',
    titleVi: 'Ghi chú & Kiến thức',
    descriptionEn: 'Full Markdown editor, tagging, pinned notes, and categorized collections.',
    descriptionVi: 'Trình soạn thảo Markdown đầy đủ, gắn thẻ, ghim ghi chú và quản lý theo bộ sưu tập.',
    topics: [
      {
        id: 'notes-manager',
        titleEn: 'Notes Manager & Full Editor',
        titleVi: 'Trình quản lý Ghi chú & Soạn thảo chuyên sâu',
        summaryEn: 'Capture meeting notes, technical docs, and ideas in a dedicated modal interface.',
        summaryVi: 'Ghi lại biên bản cuộc họp, tài liệu kỹ thuật và ý tưởng trong giao diện chuyên dụng.',
        stepsEn: [
          'Click the "Notes" button in the TopNav to open the full Notes Manager.',
          'Create rich Markdown documents with headers, lists, code blocks, and blockquotes.',
          'Organize notes into Collections (e.g. Work, Research, Personal) and assign multi-colored Tags.',
          'Pin critical notes to keep them anchored at the top of your lists.',
        ],
        stepsVi: [
          'Nhấn nút "Ghi chú" trên thanh TopNav để mở Trình quản lý Ghi chú toàn diện.',
          'Tạo tài liệu Markdown phong phú với tiêu đề, danh sách, khối mã lệnh và trích dẫn.',
          'Phân loại ghi chú vào các Bộ sưu tập (VD: Công việc, Nghiên cứu, Cá nhân) và gắn Thẻ màu sắc.',
          'Ghim các ghi chú quan trọng lên đầu danh sách để truy cập nhanh chóng.',
        ],
        tipsEn: 'Quick Note widgets on your dashboard can be linked directly to any collection.',
        tipsVi: 'Widget Ghi chú nhanh trên Dashboard có thể liên kết trực tiếp với bất kỳ bộ sưu tập nào.',
      },
    ],
  },
  {
    id: 'smart-bookmarks',
    iconName: 'Bookmark',
    titleEn: 'Smart Bookmarks',
    titleVi: 'Dấu trang Thông minh',
    descriptionEn: 'Hierarchical folders, favicon caching, tagging, and quick website access.',
    descriptionVi: 'Thư mục phân cấp, lưu trữ favicon, gắn thẻ và truy cập website nhanh chóng.',
    topics: [
      {
        id: 'bookmarks-manager',
        titleEn: 'Organizing Bookmarks & Folders',
        titleVi: 'Tổ chức Dấu trang & Thư mục',
        summaryEn: 'Structure your web shortcuts into clean, searchable collections.',
        summaryVi: 'Sắp xếp các liên kết web thành các danh mục gọn gàng, dễ tìm kiếm.',
        stepsEn: [
          'Click the "Bookmarks" button in the TopNav or click the gear in any Bookmarks widget.',
          'Create folders to group related links by domain or project.',
          'Add URLs with custom titles, descriptions, and tags.',
          'Import bookmarks from browser HTML or JSON exports anytime.',
        ],
        stepsVi: [
          'Nhấn nút "Dấu trang" trên TopNav hoặc biểu tượng bánh răng trên Widget Dấu trang.',
          'Tạo thư mục để gom nhóm liên kết theo chuyên môn hoặc dự án.',
          'Thêm URL với tiêu đề tùy chỉnh, mô tả và thẻ phân loại.',
          'Nhập dấu trang từ tệp HTML hoặc JSON của trình duyệt bất kỳ lúc nào.',
        ],
      },
    ],
  },
  {
    id: 'workspaces',
    iconName: 'Layers',
    titleEn: 'Workspaces',
    titleVi: 'Không gian làm việc',
    descriptionEn: 'Create multiple dedicated spaces for Work, Study, Coding, and Personal life.',
    descriptionVi: 'Tạo nhiều không gian riêng biệt cho Công việc, Học tập, Lập trình và Đời sống.',
    topics: [
      {
        id: 'workspace-switching',
        titleEn: 'Switching & Managing Workspaces',
        titleVi: 'Chuyển đổi & Quản lý Workspace',
        summaryEn: 'Isolate your workflows so different contexts do not clutter each other.',
        summaryVi: 'Phân tách quy trình làm việc để các ngữ cảnh khác nhau không gây rối mắt.',
        stepsEn: [
          'Click the workspace dropdown in the top-left corner of the TopNav.',
          'Select any existing workspace to instantly load its layout and widget configuration.',
          'Click "Manage Workspaces" to rename, reorder, change icons, or set a default workspace.',
          'Create new spaces from curated starter presets (Student, Developer, Minimalist).',
        ],
        stepsVi: [
          'Nhấn vào menu thả xuống ở góc trên bên trái của thanh TopNav.',
          'Chọn workspace mong muốn để tải ngay bố cục và cấu hình widget tương ứng.',
          'Chọn "Quản lý Không gian" để đổi tên, sắp xếp lại, đổi biểu tượng hoặc đặt workspace mặc định.',
          'Tạo không gian mới từ các mẫu cấu hình có sẵn (Sinh viên, Lập trình viên, Tối giản).',
        ],
      },
    ],
  },
  {
    id: 'customization',
    iconName: 'Palette',
    titleEn: 'Customization & Themes',
    titleVi: 'Tùy biến & Giao diện',
    descriptionEn: 'Light/Dark/System modes, custom background images, scaling modes, and overlays.',
    descriptionVi: 'Chế độ Sáng/Tối/Hệ thống, ảnh nền tùy chỉnh, chế độ hiển thị và độ mờ phủ lớp.',
    topics: [
      {
        id: 'themes-and-backgrounds',
        titleEn: 'Custom Background Images & Themes',
        titleVi: 'Ảnh nền tùy chỉnh & Chủ đề màu sắc',
        summaryEn: 'Personalize the visual appearance of your browser new tab dashboard.',
        summaryVi: 'Cá nhân hóa diện mạo trực quan của trang chủ trình duyệt.',
        stepsEn: [
          'Theme Selector: Switch between Light, Dark, or System mode via the Sun/Moon icon in TopNav.',
          'Background Settings: Open Preferences > Dashboard Background.',
          'Choose between Clean Minimal Theme or Custom Image Background.',
          'Upload your own image from your computer or enter an external image URL.',
          'Adjust Background Mode (Cover, Contain, Stretch, Center) and Dark Overlay opacity for readability.',
        ],
        stepsVi: [
          'Bộ chọn giao diện: Chuyển đổi giữa chế độ Sáng, Tối hoặc Hệ thống qua biểu tượng Mặt trời/Mặt trăng ở TopNav.',
          'Cài đặt hình nền: Mở Cài đặt > Hình nền Không gian làm việc.',
          'Lựa chọn giữa Phong cách tối giản nguyên bản hoặc Hình nền tùy chỉnh.',
          'Tải ảnh trực tiếp từ máy tính hoặc dán đường dẫn URL hình ảnh bên ngoài.',
          'Tùy chỉnh Chế độ hiển thị (Cover, Contain, Stretch, Center) và độ mờ phủ tối để đảm bảo độ tương phản dễ đọc.',
        ],
      },
    ],
  },
  {
    id: 'native-search',
    iconName: 'Search',
    titleEn: 'Native Browser Search & Omnibox',
    titleVi: 'Tìm kiếm Gốc & Thanh địa chỉ Trình duyệt',
    descriptionEn: 'Browser security boundaries, native address bar shortcuts, and same-tab search navigation.',
    descriptionVi: 'Hàng rào bảo mật trình duyệt, phím tắt thanh địa chỉ và điều hướng tìm kiếm cùng tab.',
    topics: [
      {
        id: 'browser-omnibox-isolation',
        titleEn: 'Native Omnibox Handoff & Shortcuts',
        titleVi: 'Điều hướng Thanh địa chỉ & Phím tắt Gốc',
        summaryEn: 'Understand why browsers isolate extension pages from the native address bar and how to invoke it.',
        summaryVi: 'Tìm hiểu lý do bảo mật trình duyệt cô lập trang tiện ích và cách mở nhanh thanh địa chỉ.',
        stepsEn: [
          'Browser Security Standard: W3C WebExtensions specifications strictly prohibit in-page JavaScript from programmatically focusing the browser address bar (Omnibox/AwesomeBar) to prevent UI spoofing.',
          'Quick Shortcut: Press Ctrl+L (or Cmd+L on macOS) at any time to focus the native browser address bar with native autocomplete, history, and bookmarks.',
          'In-Page Search Fallback: The NookSpace search bar is always ready for queries and direct website URLs.',
          'Same-Tab Navigation: Submitting a search or URL navigates directly within the same tab, keeping your browser Back/Forward history perfectly preserved.',
        ],
        stepsVi: [
          'Tiêu chuẩn bảo mật: Quy chuẩn W3C WebExtensions ngăn chặn tuyệt đối mã lệnh trên trang web/tiện ích tự động chiếm quyền điều khiển thanh địa chỉ (Omnibox) nhằm chống giả mạo giao diện.',
          'Phím tắt thuận tiện: Nhấn Ctrl+L (hoặc Cmd+L trên macOS) bất cứ lúc nào để đưa con trỏ vào thanh địa chỉ gốc của trình duyệt kèm gợi ý tự động, lịch sử và dấu trang.',
          'Tìm kiếm trực tiếp: Thanh tìm kiếm NookSpace luôn sẵn sàng cho từ khóa tìm kiếm và truy cập website.',
          'Điều hướng trên cùng một tab: Tìm kiếm hoặc mở trang web diễn ra ngay trên tab hiện tại, bảo lưu trọn vẹn nút Back/Forward.',
        ],
        shortcuts: [
          { key: 'Ctrl + L / ⌘L', descriptionEn: 'Focus native browser address bar', descriptionVi: 'Mở thanh địa chỉ gốc của trình duyệt' },
          { key: 'Ctrl + K / /', descriptionEn: 'Focus NookSpace in-page search', descriptionVi: 'Đưa con trỏ vào thanh tìm kiếm NookSpace' },
        ],
      },
    ],
  },
  {
    id: 'music-widget',
    iconName: 'Music',
    titleEn: 'Audio-Focused Music Player',
    titleVi: 'Trình phát nhạc Tập trung Âm thanh',
    descriptionEn: 'YouTube listening, Error 153 protection, volume controls, and spinning vinyl animation.',
    descriptionVi: 'Nghe nhạc YouTube, khắc phục Lỗi 153, thanh âm lượng và đĩa than hoạt họa.',
    topics: [
      {
        id: 'audio-player-features',
        titleEn: 'Audio Playback & Provider Capabilities',
        titleVi: 'Khả năng Phát nhạc & Các nguồn Hỗ trợ',
        summaryEn: 'Listen to ambient lo-fi music with genuine audible playback and zero video thumbnail clutter.',
        summaryVi: 'Lắng nghe âm nhạc thư giãn với chất lượng âm thanh thật và hoàn toàn không bị ảnh hưởng bởi hình thu nhỏ video.',
        stepsEn: [
          'Paste YouTube URL: Paste any YouTube watch, share (youtu.be), shorts, or playlist URL into settings or presets.',
          'Audio-First Design: Zero video thumbnail clutter, no giant video screens—just a beautiful spinning vinyl record.',
          'Error 153 Safeguard: Official embed integration avoids extension origin parameter conflicts, guaranteeing reliable loading in Chrome, Firefox, and Zen.',
          'Interactive Vinyl LP: The vinyl record spins smoothly when playback is active and pauses immediately when paused or ended.',
          'Autoplay Policy: Browsers require a user interaction before audio plays unmuted. Simply click Play or the vinyl center to start.',
        ],
        stepsVi: [
          'Dán liên kết YouTube: Dán bất kỳ link YouTube xem trực tiếp, link rút gọn youtu.be, shorts hoặc danh sách phát vào cài đặt hoặc mẫu có sẵn.',
          'Thiết kế tập trung âm thanh: Không hiển thị hình thu nhỏ video (thumbnail), không có khung hình video lớn choáng chỗ—chỉ có đĩa than xoay tinh tế.',
          'Khắc phục triệt để Lỗi 153: Tối ưu chuẩn nhúng loại bỏ xung đột tham số nguồn extension, đảm bảo chạy trơn tru trên Chrome, Cốc Cốc, Firefox và Zen Browser.',
          'Đĩa than tương tác (LP): Đĩa than xoay mượt mà khi âm thanh đang phát và lập tức dừng lại khi tạm dừng hoặc kết thúc bài.',
          'Chính sách Autoplay: Trình duyệt yêu cầu tương tác chuột để bật tiếng. Chỉ cần nhấp nút Play hoặc nhấp vào tâm đĩa than để thưởng thức.',
        ],
        tipsEn: 'Click directly on the vinyl record disc to quickly toggle between Play and Pause.',
        tipsVi: 'Nhấp trực tiếp vào đĩa than để bật hoặc tạm dừng bài hát nhanh chóng.',
      },
    ],
  },
  {
    id: 'flashcards',
    iconName: 'GraduationCap',
    titleEn: 'AI-Assisted Flashcards',
    titleVi: 'Thẻ từ vựng Trợ lý AI',
    descriptionEn: 'Daily vocabulary study, automatic 24h expiration, JSON deck management, and interactive test mode.',
    descriptionVi: 'Học từ vựng hàng ngày, tự động hết hạn 24h, quản lý bộ thẻ JSON và chế độ kiểm tra trắc nghiệm.',
    topics: [
      {
        id: 'flashcard-study-flow',
        titleEn: 'Daily Study & Flip Card Interaction',
        titleVi: 'Quy trình Học Hàng ngày & Lật thẻ',
        summaryEn: 'Reinforce vocabulary with spaced review and deterministic daily card sets.',
        summaryVi: 'Củng cố vốn từ vựng với các bộ thẻ hàng ngày được chọn lọc khoa học.',
        stepsEn: [
          'Choose your study pair (e.g. Japanese → Vietnamese, English → Vietnamese, Korean → Vietnamese, or any custom language).',
          'Flip Card: Click the card or press Spacebar to toggle between Question (word, reading) and Answer (meaning, examples, notes).',
          'Rate your recall: Mark cards as "Difficult" (learning), "Good", or "Known" (mastered).',
          'Daily Deterministic Set: Today\'s cards remain stable across page reloads and browser restarts.',
        ],
        stepsVi: [
          'Chọn cặp ngôn ngữ học (VD: Nhật → Việt, Anh → Việt, Hàn → Việt hoặc tùy ý).',
          'Lật thẻ: Nhấp vào thẻ hoặc nhấn phím Space để chuyển đổi giữa Mặt trước (từ, phát âm) và Mặt sau (nghĩa, ví dụ, ghi chú).',
          'Đánh giá mức độ nhớ: Chọn "Khó / Cần ôn", "Tốt", hoặc "Đã nhớ".',
          'Bộ thẻ trong ngày ổn định: Thẻ của ngày hôm nay được giữ nguyên khi tải lại trang hoặc mở lại trình duyệt.',
        ],
        shortcuts: [
          { key: 'Space', descriptionEn: 'Flip card between Front and Back', descriptionVi: 'Lật thẻ giữa Mặt trước và Mặt sau' },
          { key: 'ArrowRight / ArrowLeft', descriptionEn: 'Next / Previous card', descriptionVi: 'Chuyển sang thẻ kế tiếp / trước đó' },
        ],
      },
      {
        id: 'flashcard-expiration-deck-mgmt',
        titleEn: 'Automatic Expiration & JSON Deck Management',
        titleVi: 'Tự động Hết hạn & Quản lý Bộ thẻ JSON',
        summaryEn: 'Keep study cycles fresh with 24-hour expiration, deck replacement, and JSON export.',
        summaryVi: 'Duy trì kỷ luật học tập với thời hạn 24 giờ, thay thế bộ thẻ mới và xuất file JSON.',
        stepsEn: [
          'Automatic Expiration: Decks expire after 24 hours by default (configurable: 1d, 2d, 3d, 7d, 14d, 30d, or Never).',
          'Remaining Time Indicator: A real-time badge displays hours or days remaining before expiration.',
          'Replace Current Deck: In Settings > Import, paste new AI JSON to preview card counts and replace the active deck atomically.',
          'Export & Download: Export your current vocabulary deck to a downloaded .json backup anytime.',
          'Delete Deck: Remove current active cards safely with confirmation.',
        ],
        stepsVi: [
          'Tự động hết hạn: Mặc định bộ thẻ có thời hạn 24 giờ (tùy chỉnh: 1 ngày, 2 ngày, 3 ngày, 7 ngày, 14 ngày, 30 ngày hoặc Không bao giờ).',
          'Huy hiệu thời gian còn lại: Hiển thị số giờ hoặc số ngày còn lại theo thời gian thực.',
          'Thay thế bộ thẻ: Trong Cài đặt > Nhập JSON, dán JSON mới để xem trước số lượng thẻ và thay thế bộ thẻ hiện tại an toàn.',
          'Xuất & Tải về: Xuất bộ thẻ từ vựng hiện tại thành tệp .json để lưu trữ hoặc chia sẻ.',
          'Xóa bộ thẻ: Dọn dẹp thẻ của bộ hiện tại với hộp thoại xác nhận bảo vệ.',
        ],
      },
      {
        id: 'flashcard-test-mode',
        titleEn: 'Vocabulary Test Mode & Active Recall',
        titleVi: 'Chế độ Kiểm tra Từ vựng & Gợi nhớ Tích cực',
        summaryEn: 'Test your vocabulary retention with multiple-choice questions or typed answers.',
        summaryVi: 'Đánh giá khả năng ghi nhớ từ vựng với câu hỏi trắc nghiệm hoặc tự nhập câu trả lời.',
        stepsEn: [
          'Switch to Test Mode: Click the "Test" button in the header toolbar.',
          'Configure Test: Choose question count (5, 10, All), direction (Word → Meaning or Meaning → Word), and format (Multiple Choice or Fill-in).',
          'Interactive Feedback: Get instant green/red validation upon submitting each answer.',
          'Results & Mastery: View total score, accuracy percentage, and review missed words with correct answers.',
          'Retake Test: Easily retake the test or drill only the difficult missed words.',
        ],
        stepsVi: [
          'Chuyển sang Chế độ Kiểm tra: Nhấn nút "Kiểm tra" trên thanh công cụ tiêu đề.',
          'Cấu hình bài thi: Chọn số lượng câu hỏi (5, 10, Tất cả), chiều câu hỏi (Từ → Nghĩa hoặc Nghĩa → Từ) và định dạng (Trắc nghiệm hoặc Tự nhập).',
          'Phản hồi tức thì: Nhận thông báo màu xanh/đỏ ngay khi nộp câu trả lời.',
          'Kết quả & Mức độ thành thạo: Xem điểm số, tỷ lệ phần trăm chính xác và danh sách từ làm sai kèm đáp án đúng.',
          'Làm lại bài thi: Dễ dàng làm lại toàn bộ bài kiểm tra hoặc chỉ luyện lại các từ làm sai.',
        ],
      },
    ],
  },
  {
    id: 'ai-prompt-workflow',
    iconName: 'Sparkles',
    titleEn: 'AI Prompt & Vocabulary Import',
    titleVi: 'Tạo Lệnh AI & Nhập Từ vựng',
    descriptionEn: 'Generate structured prompts for ChatGPT, Claude, or Gemini and import JSON safely.',
    descriptionVi: 'Tạo lệnh tối ưu cho ChatGPT, Claude hoặc Gemini và nhập dữ liệu JSON an toàn.',
    topics: [
      {
        id: 'prompt-generation-workflow',
        titleEn: 'How to Generate & Import Vocabulary',
        titleVi: 'Cách Tạo Lệnh AI & Nhập Dữ liệu Từ vựng',
        summaryEn: 'Create custom vocabulary lists tailored to your level and topics without external API keys.',
        summaryVi: 'Tạo danh sách từ vựng theo đúng trình độ và chủ đề của bạn mà không cần API key đắt đỏ.',
        stepsEn: [
          'Open Flashcard Settings > 1. Preferences: Choose your language pair, level, topic, and daily card count.',
          'Go to 2. AI Prompt: Click "Copy Prompt" to copy the structured prompt.',
          'Paste into your AI (ChatGPT, Claude, Gemini, etc.): The AI will return clean JSON with words, readings, meanings, and examples.',
          'Go to 3. Import JSON: Paste the AI response and click "Import Cards to Workspace".',
          'Validation & Deduplication: NookSpace automatically cleans markdown code fences, validates fields with Zod, and skips existing duplicate words.',
        ],
        stepsVi: [
          'Vào Cài đặt Thẻ từ vựng > 1. Tùy chọn: Chọn cặp ngôn ngữ, trình độ, chủ đề và số thẻ mỗi ngày.',
          'Sang tab 2. Lệnh tạo AI: Nhấn "Sao chép lệnh" để lấy prompt có sẵn.',
          'Dán vào trợ lý AI (ChatGPT, Claude, Gemini...): AI sẽ trả về JSON chuẩn chứa từ, phát âm, ý nghĩa và ví dụ câu.',
          'Sang tab 3. Nhập dữ liệu JSON: Dán nội dung AI trả về và nhấn "Nhập thẻ vào không gian làm việc".',
          'Xác thực & Loại trùng: NookSpace tự động loại bỏ khối markdown, kiểm tra hợp lệ bằng Zod và bỏ qua các từ đã có sẵn.',
        ],
        tipsEn: 'All imported vocabulary is stored 100% inside your local IndexedDB with zero cloud accounts required.',
        tipsVi: 'Toàn bộ từ vựng nhập vào được lưu trữ an toàn trong IndexedDB của máy tính bạn.',
      },
    ],
  },
  {
    id: 'data-management',
    iconName: 'Database',
    titleEn: 'Data Management & Backup',
    titleVi: 'Quản lý Dữ liệu & Sao lưu',
    descriptionEn: 'Full backup export, universal restore, conflict-free merge imports, and diagnostics.',
    descriptionVi: 'Xuất sao lưu toàn diện, khôi phục dữ liệu, gộp dữ liệu không xung đột và chẩn đoán.',
    topics: [
      {
        id: 'backup-and-restore',
        titleEn: 'Full Backup & Merge Import',
        titleVi: 'Sao lưu Toàn diện & Nhập gộp Dữ liệu',
        summaryEn: 'You own 100% of your data. Export and restore anytime with zero vendor lock-in.',
        summaryVi: 'Bạn làm chủ hoàn toàn dữ liệu của mình. Xuất và khôi phục bất cứ khi nào bạn muốn.',
        stepsEn: [
          'Open Preferences > Data & Backup.',
          'Click "Create Full Backup" to download a cryptographically signed JSON file containing all workspaces, widgets, layouts, notes, flashcards, and bookmarks.',
          'Click "Restore" to replace current data cleanly, or click "Merge Import" to blend another backup without overwriting existing workspaces.',
          'Run "Database Diagnostics" if you ever wish to inspect schema tables, record counts, and migration status.',
        ],
        stepsVi: [
          'Mở Cài đặt > Dữ liệu & Sao lưu.',
          'Nhấn "Tạo bản sao lưu đầy đủ" để tải về tệp JSON chứa toàn bộ workspace, widget, bố cục, ghi chú, thẻ từ vựng và dấu trang.',
          'Nhấn "Khôi phục" để phục hồi dữ liệu hoàn chỉnh, hoặc "Nhập gộp" để bổ sung dữ liệu mới mà không ghi đè dữ liệu cũ.',
          'Chạy "Chẩn đoán Cơ sở dữ liệu" để kiểm tra số lượng bản ghi các bảng và tình trạng phiên bản cơ sở dữ liệu.',
        ],
      },
    ],
  },
  {
    id: 'privacy-guarantees',
    iconName: 'ShieldCheck',
    titleEn: 'Privacy & Local Data Guarantees',
    titleVi: 'Cam kết Quyền riêng tư & Dữ liệu Cục bộ',
    descriptionEn: 'Zero analytics trackers, zero telemetry, zero remote servers, and zero mandatory accounts.',
    descriptionVi: 'Không mã theo dõi, không telemetry, không máy chủ từ xa và không bắt buộc tài khoản.',
    topics: [
      {
        id: 'zero-telemetry-policy',
        titleEn: 'Privacy Architecture & Security Standards',
        titleVi: 'Kiến trúc Bảo mật & Tiêu chuẩn Riêng tư',
        summaryEn: 'NookSpace is engineered as a trustable offline-capable workspace.',
        summaryVi: 'NookSpace được thiết kế như một không gian làm việc đáng tin cậy hoạt động ngoại tuyến.',
        stepsEn: [
          'Zero Remote Analytics: NookSpace contains no Google Analytics, Mixpanel, or telemetry beacons.',
          'Local Storage: All personal notes, vocabulary, bookmarks, and settings reside in your browser IndexedDB.',
          'Minimal Permissions: Only standard extension storage, tabs, and alarm permissions are requested.',
        ],
        stepsVi: [
          'Không theo dõi từ xa: NookSpace không cài cắm Google Analytics, Mixpanel hoặc bất kỳ mã thu thập dữ liệu nào.',
          'Lưu trữ nội bộ: Toàn bộ ghi chú, từ vựng, dấu trang và cấu hình đều nằm trong IndexedDB trên thiết bị của bạn.',
          'Quyền tối thiểu: Chỉ yêu cầu quyền lưu trữ nội bộ, quản lý tab và báo thức cơ bản.',
        ],
      },
    ],
  },
  {
    id: 'browser-compatibility',
    iconName: 'Globe',
    titleEn: 'Browser Compatibility',
    titleVi: 'Tính tương thích Trình duyệt',
    descriptionEn: 'Universal cross-browser support across Chromium MV3, Firefox/Gecko MV2, and Zen Browser.',
    descriptionVi: 'Hỗ trợ đa nền tảng tối ưu trên Chromium MV3, Firefox/Gecko MV2 và Zen Browser.',
    topics: [
      {
        id: 'cross-browser-architecture',
        titleEn: 'Supported Browsers & Runtimes',
        titleVi: 'Các Trình duyệt Được Hỗ trợ',
        summaryEn: 'Engineered from the ground up for strict standards compliance and high performance.',
        summaryVi: 'Được thiết kế chuẩn mực từ đầu để tương thích hoàn hảo và vận hành mượt mà.',
        stepsEn: [
          'Chromium MV3: Chrome, Cốc Cốc, Microsoft Edge, Brave, Opera, Vivaldi.',
          'Gecko / Firefox: Firefox Desktop, Zen Browser, Floorp, Waterfox.',
          'Zero Remote Dependency: NookSpace contains zero remote external CDNs or dynamic script evaluation.',
        ],
        stepsVi: [
          'Chromium MV3: Google Chrome, Cốc Cốc, Microsoft Edge, Brave, Opera, Vivaldi.',
          'Gecko / Firefox: Firefox Desktop, Zen Browser, Floorp, Waterfox.',
          'Không phụ thuộc mã ngoài: NookSpace không nạp thư viện từ CDN bên ngoài hay thực thi mã động tùy tiện.',
        ],
      },
    ],
  },
  {
    id: 'troubleshooting',
    iconName: 'LifeBuoy',
    titleEn: 'Troubleshooting & FAQ',
    titleVi: 'Khắc phục sự cố & Câu hỏi thường gặp',
    descriptionEn: 'Quick answers for autoplay restrictions, search shortcuts, and backup checkpoints.',
    descriptionVi: 'Giải đáp nhanh về chính sách tự động phát nhạc, phím tắt tìm kiếm và điểm khôi phục.',
    topics: [
      {
        id: 'common-faq',
        titleEn: 'Frequently Asked Questions',
        titleVi: 'Các Câu hỏi Thường gặp',
        summaryEn: 'Solutions for common setup questions and browser policy behaviors.',
        summaryVi: 'Cách giải quyết nhanh các tình huống thiết lập và hành vi chính sách của trình duyệt.',
        stepsEn: [
          'Music Autoplay Blocked: Modern browsers block unmuted sound before a user gesture. Click Play or click inside the player once to activate audio.',
          'Search Address Bar: Press Ctrl+L (or Cmd+L) to jump straight to your browser\'s native address bar with native autocomplete.',
          'Restoring Data: Prior to every restore, NookSpace creates an automatic safety recovery checkpoint in IndexedDB.',
        ],
        stepsVi: [
          'Nhạc không tự phát: Trình duyệt hiện đại chặn âm thanh tự phát khi chưa có tương tác chuột. Nhấn nút Play hoặc nhấp vào trình phát một lần để khởi động.',
          'Thanh địa chỉ tìm kiếm: Nhấn Ctrl+L (hoặc Cmd+L) để chuyển ngay tới thanh địa chỉ gốc của trình duyệt kèm gợi ý tự động.',
          'Khôi phục dữ liệu an toàn: Trước mỗi lần phục hồi, NookSpace luôn tự động tạo một điểm sao lưu dự phòng trong IndexedDB.',
        ],
      },
    ],
  },
];
