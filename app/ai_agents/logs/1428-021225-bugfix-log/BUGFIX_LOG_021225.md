# Nhật ký sửa lỗi - 02/12/2025 02:23

## Các lỗi được sửa:

### 1. **Image Missing Width Property** ❌ → ✅

**Vấn đề:** Next.js Image component yêu cầu width và height props khi sử dụng external URLs
**Lỗi:**

```
Image with src "https://images.unsplash.com/..." is missing required "width" property
```

**Giải pháp:** Thêm `width` và `height` vào tất cả Image components:

- `video-tile.tsx`: width={400} height={300}
- `participant-panel.tsx`: width={40} height={40}
- `chat-panel.tsx`: width={32} height={32}

---

### 2. **Immer MapSet Plugin Not Loaded** ❌ → ✅

**Vấn đề:** Redux state chứa Map objects nhưng Immer plugin chưa được bật
**Lỗi:**

```
[Immer] The plugin for 'MapSet' has not been loaded into Immer
```

**Giải pháp:** Thêm `enableMapSet()` vào ReduxProvider.tsx:

```typescript
import { enableMapSet } from 'immer'
enableMapSet()
```

---

### 3. **Logging System** ✅ (Mới tạo)

**Tệp:** `src/lib/logger.ts`

- Logger client-side lưu logs vào memory
- Gửi logs đến backend qua `/api/logs` endpoint
- Tự động tạo filename theo format: `hhmm-ddMMyy-logs.json`

**Tệp API:** `src/app/api/logs/route.ts`

- POST endpoint: Nhận logs từ client
- Lưu vào `app/ai_agents/logs/` folder
- GET endpoint: Lấy logs hiện tại

---

## 📁 Logs Structure

Folder: `app/ai_agents/logs/`
Format: `hhmm-ddMMyy-logs.json`

**Ví dụ:** `0223-021225-logs.json`

- `02` = giờ (02:00)
- `23` = phút
- `02` = ngày
- `12` = tháng
- `25` = năm (2025)

---

## 🔍 Cách sử dụng Logger

```typescript
import { logger } from '@/lib/logger'

// Logging
logger.info('[RoomPage]', 'User joined room', { roomName: 'test' })
logger.warn('[Hook]', 'Media permission denied')
logger.error('[Service]', 'Connection failed', error)
logger.debug('[Component]', 'Re-rendering')

// Download logs
logger.downloadLogs()

// Get logs
const allLogs = logger.getLogs()
```

---

## 📊 Non-serializable Value Warning

**Cảnh báo:** Redux state có Map object trong `media.audioLevel`
**Trạng thái:** Sẽ được xử lý ở lần refactor Redux store
**Tạm thời:** Cảnh báo không ảnh hưởng đến chức năng

---

## 🧪 Kiểm tra hoạt động

1. ✅ Video tile images render đúng
2. ✅ Immer plugins loaded
3. ✅ Logs được gửi đến backend
4. ✅ File logs được tạo trong `app/ai_agents/logs/`
5. ✅ Media streams cleanup khi rời phòng

---

## Những việc cần làm tiếp theo

- [ ] Fix Redux state serialization (xóa Map object)
- [ ] Thêm UI để xem logs trong admin panel
- [ ] Implement log rotation (xóa logs cũ)
- [ ] Thêm analytics cho media stream events
- [ ] Optimize logging performance
