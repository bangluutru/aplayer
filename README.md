# APlayer — Liquid Glass Media Player & Multi-Platform Downloader for macOS

> **LƯU Ý & MIỄN TRỪ TRÁCH NHIỆM (DISCLAIMER):**
> Dự án này được phát triển và chia sẻ **chỉ cho mục đích thử nghiệm cá nhân, học tập và đồng bộ thiết bị cá nhân**. Tác giả **hoàn toàn không chịu trách nhiệm** nếu bất kỳ bên nào tái sử dụng, chỉnh sửa, phát tán lại hoặc khai thác phần mềm này gây ảnh hưởng, xâm phạm bản quyền hay tổn hại đến quyền lợi của các cá nhân, tổ chức hoặc nền tảng khác. Người sử dụng tự chịu hoàn toàn trách nhiệm pháp lý đối với hành vi sử dụng của mình.
> Vui lòng đọc đầy đủ điều khoản tại [DISCLAIMER.md](./DISCLAIMER.md) và [LICENSE](./LICENSE).

---

Ứng dụng phát nhạc & video đa định dạng kèm trình tải Video/Audio đa nền tảng chạy **native trên macOS (Apple Silicon)**, thiết kế theo phong cách **Liquid Glassmorphism** tối giản, bộ icon vector riêng và khả năng cá nhân hoá sâu. **100% cục bộ, miễn phí, không gọi bất kỳ API trả phí nào.**

## Tính năng nổi bật

### 1. Trình phát Media đa định dạng (Universal Engine)
- **Video**: `MP4`, `MKV`, `MOV`, `WebM`, `AVI`, `FLV`, `WMV`, `TS/M2TS`, `MPG/MPEG`, `OGV`, `3GP`, `VOB`, `DIVX`, `RMVB` (H.264, HEVC/H.265, VP8, VP9, AV1, MPEG-4, WMV, ProRes…).
- **Âm thanh**: `MP3`, `FLAC`, `WAV`, `AAC`, `M4A`, `ALAC`, `OGG`, `OPUS`, `WMA`, `AIFF`, `APE`, `WV`, `AC3`, `DTS`, `MKA`.
- **Cơ chế phát 2 tầng thông minh**:
  - **Direct Play**: Phát nguyên bản qua máy chủ HTTP Range nội bộ (`127.0.0.1`, bảo mật bằng token phiên ngẫu nhiên) — tua tức thì, tối ưu CPU.
  - **FFmpeg Live Stream**: Tự động remux (`-c:v copy`) hoặc chuyển mã thời gian thực cho `MKV`, `AVI`, `FLV`, `WMV`, `AC3/DTS`, `ALAC/AIFF/WMA`, hỗ trợ tua trực tiếp và chuyển kênh âm thanh.
- **Trải nghiệm Điện ảnh & Hi-Fi**:
  - Hỗ trợ phụ đề tích hợp trong `MKV/MP4` & phụ đề ngoài (`.srt`, `.vtt`, `.ass`, `.ssa`) hiển thị dạng thẻ kính nổi không che thanh điều khiển.
  - Sân khấu Hi-Fi Vinyl với **5 chế độ sóng nhạc FFT 60fps** (`Aurora Bars`, `Liquid Wave`, `Orbital Halo`, `Glass Mirror`, `Minimal Pulse`) và lời bài hát đồng bộ `.lrc`.
  - **Equalizer 10 dải tần (Web Audio DSP)**, 8 preset, Preamp, Stereo Balance, khuếch đại âm lượng đến **200%**, tốc độ `0.25x – 4x`, lặp A-B, chụp khung hình `.png`, Picture-in-Picture, hẹn giờ tắt, Mini-Player liên tục khi chuyển tab.

### 2. Trình tải Video & Audio đa nền tảng (Local)
- Hỗ trợ **YouTube**, **Facebook**, **X (Twitter)**, **TikTok**, **Instagram**, **Threads** (`threads.net` / `threads.com` qua bộ trích xuất cục bộ) và nhiều trang chia sẻ media khác qua `yt-dlp` + `deno` + `FFmpeg`.
- Chọn tải **Video** (`Best / 4K / 2K / 1080p / 720p / 480p` → `.mp4 / .mkv / .webm`) hoặc **Audio** (`MP3 320k`, `M4A`, `FLAC Lossless`, `WAV`, `OPUS`) có gắn ảnh bìa & metadata.
- Cho phép chỉ định riêng **thư mục lưu Video** (`~/Movies/APlayer`) và **thư mục lưu Audio** (`~/Music/APlayer`), tự chia thư mục con theo nền tảng, hỗ trợ cookie trình duyệt cho nội dung cần đăng nhập và tự nhập vào Thư viện.

### 3. Cá nhân hoá & Bộ nhận diện riêng
- Thanh tiêu đề native macOS tích hợp gọn gàng (tương thích hoàn hảo nút đóng/thu nhỏ/phóng to).
- Bộ **icon vector riêng (lưới 24×24, nét 2px bo tròn)** không sử dụng emoticon, kèm 8 biểu tượng thương hiệu riêng và phông chữ offline chuẩn tiếng Việt (**Baloo 2** & **Be Vietnam Pro**).
- **6 chủ đề Glassmorphism** (*Chiba Navy Đêm*, *Chiba Kính Sáng*, *Titan Obsidian*, *Hổ Phách Điện Ảnh*, *Lục Bảo Studio*, *Kính Xuyên Thấu macOS*), tuỳ chỉnh tên ứng dụng, tagline, ảnh đại diện, ảnh nền, độ mờ kính, màu nhấn HEX và xuất/nhập hồ sơ `.json`.

---

## Cài đặt nhanh trên máy Mac mới

### 1. Cài công cụ nền mã nguồn mở (miễn phí qua Homebrew)
```bash
brew install node pnpm ffmpeg yt-dlp deno
```

### 2. Clone repo & cài thẳng vào `/Applications/APlayer.app`
```bash
git clone https://github.com/bangluutru/aplayer.git
cd aplayer
pnpm install
pnpm install:mac
```

Sau khi chạy xong `pnpm install:mac`, ứng dụng sẽ được đóng gói, ký số ad-hoc chuẩn Apple Silicon và cài đặt sẵn tại **`/Applications/APlayer.app`** — bạn chỉ cần mở từ **Applications**, **Spotlight** (`Cmd + Space` → `APlayer`) hoặc **Launchpad** mà không cần dòng lệnh.

### Các lệnh phát triển khác
```bash
pnpm dev        # Chạy chế độ phát triển (Hot Reload)
pnpm typecheck  # Kiểm tra TypeScript
pnpm test       # Chạy bộ kiểm thử tự động (Vitest + FFmpeg integration)
pnpm build:mac  # Chỉ đóng gói vào dist_build/mac-arm64/APlayer.app
```

---

## Điều khoản sử dụng & Miễn trừ trách nhiệm

1. **Mục đích sử dụng**: Kho mã nguồn này được tạo ra và lưu trữ công khai **chỉ phục vụ mục đích thử nghiệm cá nhân, học tập và đồng bộ cài đặt giữa các thiết bị cá nhân**.
2. **Miễn trừ trách nhiệm**: Phần mềm được cung cấp nguyên trạng (**"AS IS"**). Tác giả **không chịu bất kỳ trách nhiệm nào** đối với việc tái sử dụng, phát tán lại, chỉnh sửa hoặc bất kỳ thiệt hại, tranh chấp bản quyền hay tổn hại quyền lợi nào gây ra cho các bên thứ ba.
3. **Trách nhiệm người dùng**: Bất kỳ ai tải về hoặc sử dụng lại mã nguồn này đều phải tự chịu trách nhiệm hoàn toàn về việc tuân thủ pháp luật hiện hành, quyền sở hữu trí tuệ và điều khoản sử dụng của các nền tảng liên quan.

Chi tiết đầy đủ xem tại **[DISCLAIMER.md](./DISCLAIMER.md)** và **[LICENSE](./LICENSE)**.
