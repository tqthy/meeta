# Video/Audio Management System - Implementation

## Tổng Quan

Trang room hiện nay đã được cập nhật với một hệ thống quản lý video/audio thực từ Jitsi, thay vì sử dụng mock data. Video streams từ WebRTC sẽ được hiển thị trực tiếp.

## Các Thay Đổi Chính

### 1. **Participants Redux Slice** (`/src/store/slices/participantsSlice.ts`)

- Tạo mới một Redux slice để quản lý danh sách participants
- Các action:
    - `setLocalParticipant`: Khởi tạo local participant
    - `addRemoteParticipant`: Thêm remote participant
    - `removeRemoteParticipant`: Xóa remote participant
    - `updateParticipantTracks`: Cập nhật video/audio tracks
    - `updateParticipantMuteState`: Cập nhật trạng thái mute
    - `updateAudioLevel`: Theo dõi mức âm thanh
- Lưu trữ thông tin participant bao gồm:
    - ID, name, mute state
    - Video/audio tracks (JitsiTrack objects)
    - Audio levels (cho visualizer)
    - Thời gian tham gia

### 2. **Participants Manager Hook** (`/src/hooks/useParticipantsManager.tsx`)

Hook này quản lý vòng đời của participants:

- Khởi tạo local participant khi tracks sẵn sàng
- Lắng nghe sự kiện từ Jitsi room:
    - `participantJoined`: Thêm participant mới
    - `participantLeft`: Xóa participant rời đi
    - `trackAdded`: Cập nhật khi participant bật camera/mic
    - `trackRemoved`: Cập nhật khi participant tắt camera/mic
    - `audioMuteStatusChanged`: Cập nhật trạng thái mute

### 3. **Video Tile Component** (`/src/app/room/[id]/components/video-tile.tsx`)

Cập nhật để hiển thị WebRTC video stream:

- Props mới:
    - `videoTrack`: JitsiTrack object từ Jitsi
    - `audioTrack`: Audio track (optional)
- Chức năng:
    - Gắn MediaStream vào `<video>` element
    - Loading state khi stream đang kết nối
    - Fallback image nếu không có video
    - Hiển thị mic status (muted/unmuted)

### 4. **Room Page** (`/src/app/room/[id]/page.tsx`)

- Xóa mock data, sử dụng Redux state từ `useParticipantsManager`
- Gọi `useAppSelector` để lấy local tracks từ Redux
- Sử dụng `allParticipants` từ hook để render video grid
- Pass real video tracks tới VideoTile component
- Vẫn giữ mock messages (vì không có messenger backend)

### 5. **Redux Store** (`/src/store/index.ts`)

- Thêm `participantsReducer` vào store
- Cấu hình ignore serialization checks cho participant tracks

### 6. **ParticipantsPanel Component** (`/src/app/room/[id]/components/participant-panel.tsx`)

- Cập nhật type để chấp nhận ID là string hoặc number

## Data Flow

```
Jitsi Conference
    ↓
useJitsiConnection Hook
    ↓ (callback: onConferenceJoined → setRoom)
    ↓
useParticipantsManager Hook
    ├─ Lắng nghe room events
    └─ Dispatch Redux actions
        ↓
Redux Participants Slice
    ↓
useAppSelector (trong page.tsx)
    ↓
allParticipants
    ↓
VideoTile Components (render video streams)
```

## Cách Hoạt Động

### Local Participant

1. Khi room được join, `useJitsiConnection` tạo local tracks (video + audio)
2. Tracks được lưu vào Redux media state
3. `useParticipantsManager` lấy tracks từ Redux
4. Tạo local participant object với các tracks này
5. Dispatch `setLocalParticipant` action

### Remote Participants

1. Khi ai đó join phòng → `participantJoined` event
2. `useParticipantsManager` tạo remote participant object
3. Dispatch `addRemoteParticipant` action
4. Khi participant bật camera → `trackAdded` event
5. `updateParticipantTracks` cập nhật video track
6. VideoTile nhận video track và gắn vào HTML5 video element

### Video Rendering

- VideoTile component sử dụng `useEffect` để gắn MediaStream
- `videoTrack.getStream()` lấy MediaStream từ JitsiTrack
- Gán vào `video.srcObject`
- HTML5 video element tự động render video stream

## Video Layouts

Hỗ trợ 4 layout modes:

- **Grid**: Hiển thị tất cả participants trong grid
- **Sidebar**: Participant chính lớn, các người khác trong sidebar
- **Spotlight**: 1 participant lớn, người khác trong thanh dưới
- **Auto**: Tự động chọn dựa trên số lượng

## Audio Handling

- Mic state được theo dõi và hiển thị bằng icon (🔴 muted / 🟢 active)
- Audio từ remote participants được phát tự động
- Local audio được muted trong video element (để không có echo)
- Audio levels có thể được sử dụng cho voice activity visualizer

## Testing

1. Open room page
2. Multiple participants sẽ hiển thị khi join room
3. Toggle layout modes để test các layout khác nhau
4. Turn mic/camera on/off
5. Verify video streams appear in real-time
6. Check participant list in sidebar

## Notes

- Messenger features vẫn sử dụng mock data (không có backend cho messaging)
- Audio streams được quản lý tự động bởi Jitsi SDK
- Network bandwidth được tối ưu hóa bởi Jitsi SDK
- Redux store được cấu hình để ignore serialization checks cho JitsiTrack objects (chúng không serializable)
