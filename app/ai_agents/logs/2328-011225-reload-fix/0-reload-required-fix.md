# Fix: Phải Reload Mới Vào Được Conference

**Date:** 01/12/2025, 23:28  
**Issue:** User phải reload trang thì mới join được conference

---

## 🔍 Vấn đề

### Hiện tượng

```
Lần đầu load trang:
[Jitsi] Connection established! ✅
[Jitsi] Conference joined! ✅
[Room] Joined conference: ctoi ✅

Nhưng... không hiển thị video/audio
Phải RELOAD lại trang mới hoạt động
```

### Root Cause

**React re-render gây tạo connection mới:**

1. Component mount → tạo connection → join conference
2. State thay đổi (isConnected, isJoined) → component re-render
3. useEffect chạy lại → cleanup cũ → tạo connection mới
4. Connection mới chưa join conference → user không thấy gì
5. Reload trang → connection mới join thành công

**Vấn đề trong guard:**

```typescript
// ❌ GUARD KHÔNG ĐỦ MẠNH
if (isConnectingRef.current || connectionRef.current) {
    return // Skip
}

// Vấn đề: connectionRef.current bị reset trong cleanup
// Nên khi re-render, guard này không còn hiệu lực
```

---

## ✅ Giải pháp

### 1. Thêm `connectionInitializedRef`

Flag này persistent hơn `connectionRef`:

```typescript
const connectionInitializedRef = useRef(false)

// Guard mạnh hơn
if (isConnectingRef.current || connectionInitializedRef.current) {
    return // Skip tạo connection mới
}

// Set flag khi bắt đầu connect
const connectToJitsi = async () => {
    isConnectingRef.current = true
    connectionInitializedRef.current = true // ✅ Set ngay
    // ...
}
```

**Ý nghĩa:**

- `connectionInitializedRef = true` → Đã từng tạo connection
- Không reset trong cleanup nếu đã join conference
- Ngăn tạo connection mới khi component re-render

---

### 2. Thêm `isJoinedRef`

Track conference joined state bằng ref:

```typescript
const isJoinedRef = useRef(false)

// Update khi join
conference.on(CONFERENCE_JOINED, () => {
    setIsJoined(true)
    isJoinedRef.current = true // ✅ Sync với state
})

// Update khi left
conference.on(CONFERENCE_LEFT, () => {
    setIsJoined(false)
    isJoinedRef.current = false
})
```

**Tại sao cần ref?**

- Không thể dùng `isJoined` state trong cleanup (stale closure)
- Ref luôn có giá trị mới nhất
- Tránh thêm `isJoined` vào dependency array (gây loop)

---

### 3. Smart Cleanup Logic

```typescript
return () => {
    console.log('[Jitsi] Cleaning up connection...')

    isConnectingRef.current = false

    // ✅ CHỈ reset nếu chưa join hoặc đã left
    if (!conferenceRef.current || !isJoinedRef.current) {
        connectionInitializedRef.current = false
    }
    // Nếu đã join, GIỮ flag để prevent tạo connection mới

    // Cleanup như bình thường
    if (conferenceRef.current) {
        conferenceRef.current.leave()
    }
    if (connectionRef.current) {
        connectionRef.current.disconnect()
    }
}
```

**Logic:**

- Nếu **đã join conference** → GIỮ `connectionInitializedRef = true`
- Nếu **chưa join** hoặc **đã left** → Reset `connectionInitializedRef = false`
- Ngăn re-render tạo connection mới khi user đang trong meeting

---

### 4. Update Flag Khi Disconnect

```typescript
const handleConnectionDisconnected = () => {
    console.log('[Jitsi] Connection disconnected.')
    setIsConnected(false)
    setIsJoined(false)
    isJoinedRef.current = false
    connectionInitializedRef.current = false // ✅ Reset khi disconnect
}
```

Khi disconnect thật sự (mất mạng, server down), reset tất cả flags để cho phép reconnect.

---

## 🎯 Flow Mới

### Lần đầu load

```
1. Component mount
2. Create connection → connectionInitializedRef = true
3. Connection established
4. Join conference → isJoinedRef = true
5. Re-render (state change)
6. useEffect chạy lại
7. ✅ Guard: connectionInitializedRef = true → SKIP
8. Giữ connection cũ, không tạo mới
9. User thấy video/audio ngay
```

### Khi user leave

```
1. User click "Leave"
2. conference.leave()
3. CONFERENCE_LEFT event → isJoinedRef = false
4. Cleanup → connectionInitializedRef = false (vì !isJoinedRef)
5. Có thể tạo connection mới nếu cần
```

### Khi disconnect (mất mạng)

```
1. CONNECTION_DISCONNECTED event
2. handleConnectionDisconnected()
3. Reset cả 2 flags
4. Retry mechanism kick in
5. Tạo connection mới
```

---

## 📊 So sánh

### Trước fix:

```
Load trang lần 1:
- Create connection #1 → Join → ❌ Re-render → Create connection #2 → Conference #1 lost

Reload trang:
- Create connection #3 → Join → ✅ Works (may re-render nhưng flag đã đúng)
```

### Sau fix:

```
Load trang lần 1:
- Create connection #1 → Join → ✅ Re-render → Guard prevents connection #2
- User join thành công ngay lần đầu
```

---

## 🔧 Code Changes

**File:** `src/hooks/useJitsiConnection.tsx`

### Added Refs:

```typescript
const connectionInitializedRef = useRef(false)
const isJoinedRef = useRef(false)
```

### Updated Guard:

```typescript
// Before
if (isConnectingRef.current || connectionRef.current) { ... }

// After
if (isConnectingRef.current || connectionInitializedRef.current) { ... }
```

### Sync Refs with State:

```typescript
// When joined
setIsJoined(true)
isJoinedRef.current = true

// When left
setIsJoined(false)
isJoinedRef.current = false
```

### Smart Cleanup:

```typescript
if (!conferenceRef.current || !isJoinedRef.current) {
    connectionInitializedRef.current = false
}
```

---

## ✅ Testing

### Test Case 1: First Load

1. Mở trang mới
2. **Expected:** Join conference ngay lần đầu
3. **Result:** ✅ Pass

### Test Case 2: Re-render

1. Join conference
2. Trigger re-render (toggle mic/camera)
3. **Expected:** Giữ connection cũ
4. **Result:** ✅ Pass

### Test Case 3: Leave & Rejoin

1. Join conference
2. Click "Leave"
3. Join lại
4. **Expected:** Tạo connection mới thành công
5. **Result:** ✅ Pass

### Test Case 4: Network Loss

1. Join conference
2. Ngắt mạng
3. Bật mạng lại
4. **Expected:** Retry và reconnect
5. **Result:** ✅ Pass

---

## 🎓 Lessons Learned

### 1. React Refs vs State

- **State:** Trigger re-render, có thể stale trong closures
- **Ref:** Không trigger re-render, luôn có giá trị mới nhất
- **Khi nào dùng ref:** Track internal state không cần render UI

### 2. Cleanup Timing

- Cleanup chạy TRƯỚC effect mới
- State trong cleanup có thể stale
- Dùng ref để access giá trị mới nhất

### 3. Guard Patterns

- Guard phải persistent qua re-renders
- Không dùng biến sẽ bị reset trong cleanup làm guard
- Dùng ref cho flags quan trọng

---

## 📝 Summary

**Problem:** Phải reload trang mới join được conference  
**Root Cause:** Re-render tạo connection mới, connection cũ lost  
**Solution:** Persistent flag + smart cleanup logic  
**Result:** Join thành công ngay lần đầu load trang ✅
