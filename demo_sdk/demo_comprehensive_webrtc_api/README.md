# Demo Comprehensive WebRTC API (minimal setup)

Hướng dẫn nhanh để chạy demo đơn giản (Windows PowerShell):

1. Mở PowerShell và chuyển vào thư mục dự án:

```powershell
cd 'd:\Code\SE\meeta\demo_sdk\demo_comprehensive_webrtc_api'
```

2. Chạy server tĩnh (sử dụng npx http-server):

```powershell
npm start
# hoặc trực tiếp nếu không muốn tạo package.json:
npx http-server ./ -p 8080 -c-1
```

3. Mở trình duyệt và đi tới:

http://localhost:8080

4. Nhấn nút "Bật camera" để cấp quyền và xem luồng video.

Ghi chú:
- `getmedia.js` được viết dưới dạng ES module và sẽ được nạp bằng `<script type="module">`.
- Nếu bạn muốn một server khác (ví dụ Live Server trong VS Code), cũng được.
