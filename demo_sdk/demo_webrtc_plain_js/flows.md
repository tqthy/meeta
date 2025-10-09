# 🎯 Sơ Đồ Luồng Hoạt Động - WebRTC với Kiểm Soát Truy Cập

## 📊 Luồng Hoàn Chỉnh

```
┌─────────────────────────────────────────────────────────────────┐
│                    NGƯỜI TẠO PHÒNG (HOST)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    1. Click "Bắt đầu Camera"
                       - Xin quyền camera/mic
                       - Hiển thị local video
                              │
                              ▼
                    2. Click "Tạo Phòng"
                       - Tạo document trong Firestore
                       - Nhận Call ID
                       - Copy Call ID để share
                              │
                              ▼
                    3. Chờ người khác join...
                       - Listen joinRequests collection
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGƯỜI THAM GIA (JOINER)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    1. Nhận Call ID từ host
                              │
                              ▼
                    2. Click "Bắt đầu Camera"
                       - Xin quyền camera/mic
                              │
                              ▼
                    3. Nhập Call ID và tên
                              │
                              ▼
                    4. Click "Yêu Cầu Tham Gia"
                       - Tạo document trong joinRequests
                       - status = "pending"
                       - Hiển thị "Đang chờ..."
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           HOST NHẬN                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    5. Nhận thông báo real-time
                       - onSnapshot(joinRequests)
                       - Hiển thị popup approval
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ✅ CHẤP NHẬN          ❌ TỪ CHỐI
                    │                   │
                    │                   ▼
                    │         Update status = "rejected"
                    │         Joiner nhận notification
                    │         "Yêu cầu bị từ chối"
                    │                   │
                    │                   └──> END
                    │
                    ▼
            Update status = "approved"
            Joiner nhận notification
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      THIẾT LẬP WEBRTC                            │
└─────────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
    HOST                    JOINER
        │                       │
        ▼                       │
6. Host tạo Offer               │
   - createOffer()              │
   - setLocalDescription()      │
   - Lưu offer vào Firestore    │
   - Collect ICE candidates     │
        │                       │
        │◄──────────────────────┘
        │   7. Joiner đọc Offer
        │      - setRemoteDescription(offer)
        │      - createAnswer()
        │      - setLocalDescription()
        │      - Lưu answer vào Firestore
        │      - Collect ICE candidates
        │
        ▼
8. Host nhận Answer
   - setRemoteDescription(answer)
        │
        ▼
9. Exchange ICE Candidates
   - Host ←→ Joiner
   - Tìm đường kết nối tốt nhất
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ✅ KẾT NỐI THÀNH CÔNG                        │
│                   Video call đang hoạt động                      │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Chi Tiết Các Bước

### Bước 1-2: Khởi tạo (Host)
```javascript
// Host tạo phòng
const callId = await rtcService.createCall("Nguyễn Văn A");

// Firestore structure được tạo:
calls/{callId}
  ├── hostId: "Nguyễn Văn A"
  ├── status: "waiting"
  ├── maxParticipants: 2
  └── currentParticipants: 1
```

### Bước 3-4: Yêu cầu tham gia (Joiner)
```javascript
// Joiner gửi request
await rtcService.requestToJoin(callId, "Trần Thị B");

// Document được tạo:
calls/{callId}/joinRequests/{userId}
  ├── userId: "user_1234567890"
  ├── userName: "Trần Thị B"
  ├── status: "pending"
  └── timestamp: Firestore.serverTimestamp()
```

### Bước 5: Host nhận thông báo
```javascript
// Host đang listen real-time
onSnapshot(joinRequestsRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added" && data.status === "pending") {
      // Hiển thị popup
      showApprovalModal(data.userName);
    }
  });
});
```

### Bước 6: Host chấp nhận
```javascript
// Update status
await updateDoc(requestRef, {
  status: "approved",
  approvedAt: serverTimestamp()
});

// Joiner nhận được signal và bắt đầu WebRTC flow
```

### Bước 7-9: WebRTC Connection
```javascript
// HOST
createOffer() → setLocalDescription() → Save to Firestore

// JOINER
Read offer → setRemoteDescription() → createAnswer() 
→ setLocalDescription() → Save to Firestore

// BOTH
Exchange ICE candidates → Connection established
```

## 🔐 Các Điểm Kiểm Soát

### 1. **Validation khi Join**
```javascript
- Kiểm tra phòng có tồn tại không
- Kiểm tra phòng đã đầy chưa
- Kiểm tra phòng đã kết thúc chưa
- Timeout 60s nếu không nhận được response
```

### 2. **Host Controls**
```javascript
✅ Approve request  → Cho phép join
❌ Reject request   → Từ chối join
👢 Kick user        → Đuổi người đang trong phòng
🔒 Lock room        → Không nhận thêm người
```

### 3. **Real-time Updates**
```javascript
- Host nhận notification ngay lập tức khi có request
- Joiner nhận status update (approved/rejected) real-time
- Tự động cleanup khi disconnect
```

## 🎨 UI States

### Host UI States:
```
INITIAL → Camera Ready → Room Created → Waiting for Join 
→ Request Received → [Approve/Reject] → Connected
```

### Joiner UI States:
```
INITIAL → Camera Ready → Enter Room Info → Request Sent 
→ Waiting → [Approved/Rejected] → Connected
```

## 📱 Responsive Behavior

```javascript
Desktop: Side-by-side videos
Mobile:  Stacked videos (portrait)
Tablet:  Adaptive grid layout
```

## 🚀 Các Tính Năng Có Thể Mở Rộng

### 1. **Authentication**
- Thêm Firebase Authentication
- Lưu user profile trong Firestore
- Hiển thị avatar thay vì tên

### 2. **Room Management**
- Password-protected rooms
- Scheduled rooms (đặt lịch trước)
- Recording capability
- Screen sharing

### 3. **Multi-party Calls**
- Group calls (3+ người)
- SFU (Selective Forwarding Unit)
- Mesh topology cho group nhỏ

### 4. **Chat & Features**
- Text chat alongside video
- File sharing
- Virtual backgrounds
- Reactions/Emojis

### 5. **Analytics**
- Connection quality monitoring
- Call duration tracking
- User statistics
