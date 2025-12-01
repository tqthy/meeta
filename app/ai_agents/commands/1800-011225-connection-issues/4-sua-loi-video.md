# Sửa lỗi Video không hiển thị

## 🔧 Vấn đề hiện tại

1. ❌ Video tracks không được attach đúng cách vào DOM
2. ❌ Video element bị che bởi placeholder/avatar
3. ❌ Remote tracks không render
4. ❌ Video styling không đúng

---

## ✅ Giải pháp

### Bước 1: Fix Local Video Rendering trong `page.tsx`

**Vấn đề:**

```typescript
// ❌ SAI - Chỉ append element mà không handle lifecycle đúng
useEffect(() => {
    if (!localTracks || localTracks.length === 0) return

    const videoTrack = localTracks.find((track) => track.getType() === 'video')

    if (videoTrack && videoContainerRef.current) {
        const videoElement = videoTrack.attach()
        videoContainerRef.current.innerHTML = ''
        videoContainerRef.current.appendChild(videoElement)
    }

    return () => {
        localTracks.forEach((track) => {
            if (track.containers && track.containers.length > 0) {
                track.detach()
            }
        })
    }
}, [localTracks])
```

**Giải pháp:**

```typescript
// ✅ ĐÚNG - Proper video attachment with styling
useEffect(() => {
    if (!localTracks || localTracks.length === 0) return

    const videoTrack = localTracks.find((track) => track.getType() === 'video')

    if (videoTrack && videoContainerRef.current) {
        try {
            // Create video element with proper attributes
            const videoElement = videoTrack.attach() as HTMLVideoElement

            // ✅ Style video element
            videoElement.autoplay = true
            videoElement.playsInline = true
            videoElement.muted = true // Local video should be muted
            videoElement.style.width = '100%'
            videoElement.style.height = '100%'
            videoElement.style.objectFit = 'cover'
            videoElement.style.transform = 'scaleX(-1)' // Mirror local video

            // Clear container and append
            videoContainerRef.current.innerHTML = ''
            videoContainerRef.current.appendChild(videoElement)

            console.log('[Video] Local video attached')
        } catch (error) {
            console.error('[Video] Failed to attach local video:', error)
        }
    }

    return () => {
        // Proper cleanup
        localTracks.forEach((track) => {
            try {
                if (track.containers && track.containers.length > 0) {
                    track.containers.forEach((container: HTMLElement) => {
                        track.detach(container)
                    })
                }
            } catch (error) {
                console.error('[Video] Failed to detach track:', error)
            }
        })
    }
}, [localTracks])
```

### Bước 2: Fix Video Container Structure

**Thay đổi JSX structure:**

```tsx
{
    allParticipants.map((participant) => {
        const hasVideo = participant.tracks.some(
            (track) => track.getType() === 'video' && !track.isMuted()
        )

        return (
            <div
                key={participant.id}
                className="relative rounded-lg overflow-hidden bg-gray-900 aspect-video"
            >
                {/* Video container - ✅ Đặt z-index cao hơn placeholder */}
                <div
                    id={`participant-${participant.id}`}
                    ref={
                        participant.id === 'local'
                            ? videoContainerRef
                            : undefined
                    }
                    className={`absolute inset-0 ${hasVideo ? 'z-10' : 'z-0'}`}
                />

                {/* Placeholder/Avatar - ✅ Chỉ hiện khi không có video */}
                {!hasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-5">
                        <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                            {participant.name.charAt(0).toUpperCase()}
                        </div>
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none z-20" />

                {/* Name label */}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-sm z-30">
                    {participant.name}
                    {participant.id === 'local' && ' (You)'}
                </div>

                {/* Muted indicator */}
                {participant.isMuted && (
                    <div className="absolute bottom-2 right-2 p-1.5 bg-red-600 rounded-full z-30">
                        <MicOff className="w-4 h-4 text-white" />
                    </div>
                )}
            </div>
        )
    })
}
```

### Bước 3: Fix Remote Video Rendering

**Thêm state để track video status:**

```typescript
const [participantVideoStatus, setParticipantVideoStatus] = useState<
    Record<string, boolean>
>({})
```

**Update remote track handler:**

```typescript
const handleRemoteTrackAdded = (track: any) => {
    const participantId = track.getParticipantId()
    console.log('[Room] Remote track added:', participantId, track.getType())

    setParticipants((prev) =>
        prev.map((p) => {
            if (p.id === participantId) {
                return {
                    ...p,
                    tracks: [...p.tracks, track],
                    isMuted:
                        track.getType() === 'audio'
                            ? track.isMuted()
                            : p.isMuted,
                    isVideoMuted:
                        track.getType() === 'video'
                            ? track.isMuted()
                            : p.isVideoMuted,
                }
            }
            return p
        })
    )

    // ✅ Attach video track properly
    if (track.getType() === 'video') {
        // Wait for DOM to update
        setTimeout(() => {
            const container = document.getElementById(
                `participant-${participantId}`
            )
            if (container) {
                try {
                    const videoElement = track.attach() as HTMLVideoElement

                    // ✅ Style remote video
                    videoElement.autoplay = true
                    videoElement.playsInline = true
                    videoElement.style.width = '100%'
                    videoElement.style.height = '100%'
                    videoElement.style.objectFit = 'cover'

                    container.innerHTML = ''
                    container.appendChild(videoElement)

                    // ✅ Update video status
                    setParticipantVideoStatus((prev) => ({
                        ...prev,
                        [participantId]: true,
                    }))

                    console.log(
                        '[Video] Remote video attached for:',
                        participantId
                    )
                } catch (error) {
                    console.error(
                        '[Video] Failed to attach remote video:',
                        error
                    )
                }
            } else {
                console.warn('[Video] Container not found for:', participantId)
            }
        }, 100)
    }

    // ✅ Handle audio track mute status
    if (track.getType() === 'audio') {
        track.addEventListener(
            JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
            () => {
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.id === participantId
                            ? { ...p, isMuted: track.isMuted() }
                            : p
                    )
                )
            }
        )
    }

    // ✅ Handle video track mute status
    if (track.getType() === 'video') {
        track.addEventListener(
            JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
            () => {
                setParticipants((prev) =>
                    prev.map((p) =>
                        p.id === participantId
                            ? { ...p, isVideoMuted: track.isMuted() }
                            : p
                    )
                )

                setParticipantVideoStatus((prev) => ({
                    ...prev,
                    [participantId]: !track.isMuted(),
                }))
            }
        )
    }
}
```

**Update remove track handler:**

```typescript
const handleRemoteTrackRemoved = (track: any) => {
    const participantId = track.getParticipantId()
    console.log('[Room] Remote track removed:', participantId, track.getType())

    if (track.getType() === 'video') {
        // ✅ Update video status
        setParticipantVideoStatus((prev) => ({
            ...prev,
            [participantId]: false,
        }))

        // Detach from container
        const container = document.getElementById(
            `participant-${participantId}`
        )
        if (container) {
            try {
                track.detach(container)
                container.innerHTML = ''
            } catch (error) {
                console.error('[Video] Failed to detach remote video:', error)
            }
        }
    }

    setParticipants((prev) =>
        prev.map((p) => {
            if (p.id === participantId) {
                return {
                    ...p,
                    tracks: p.tracks.filter((t) => t !== track),
                }
            }
            return p
        })
    )
}
```

### Bước 4: Add CSS fixes

**Thêm vào `globals.css`:**

```css
/* Fix video rendering */
video {
    background-color: #000;
}

/* Ensure video fills container */
[id^='participant-'] video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Local video mirror effect */
#participant-local video {
    transform: scaleX(-1);
}

/* Prevent video flickering */
video {
    -webkit-backface-visibility: hidden;
    -webkit-transform: translateZ(0);
}
```

### Bước 5: Fix video mute/unmute trong `useJitsiConnection.tsx`

```typescript
// Handle camera enable/disable
useEffect(() => {
    if (localTracks.length === 0) return

    const videoTrack = localTracks.find((track) => track.getType() === 'video')

    if (videoTrack) {
        try {
            if (cameraEnabled) {
                videoTrack.unmute()
                console.log('[Jitsi] Camera unmuted')
            } else {
                videoTrack.mute()
                console.log('[Jitsi] Camera muted')
            }
        } catch (error) {
            console.error('[Jitsi] Failed to toggle camera:', error)
        }
    }
}, [cameraEnabled, localTracks])

// Handle mic enable/disable
useEffect(() => {
    if (localTracks.length === 0) return

    const audioTrack = localTracks.find((track) => track.getType() === 'audio')

    if (audioTrack) {
        try {
            if (micEnabled) {
                audioTrack.unmute()
                console.log('[Jitsi] Mic unmuted')
            } else {
                audioTrack.mute()
                console.log('[Jitsi] Mic muted')
            }
        } catch (error) {
            console.error('[Jitsi] Failed to toggle mic:', error)
        }
    }
}, [micEnabled, localTracks])
```

---

## 🎨 Optional: Video Quality Improvements

### Add video constraints

```typescript
// In useJitsiConnection.tsx - createTracks
const createTracks = async () => {
    try {
        console.log('[Jitsi] Creating local tracks...')
        const tracks = await JitsiMeetJS.createLocalTracks({
            devices: ['audio', 'video'],
            constraints: {
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 30 },
                    facingMode: 'user',
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            },
        })

        setLocalTracks(tracks)
        console.log('[Jitsi] Local tracks created:', tracks.length)

        // Set initial mute states
        tracks.forEach((track: any) => {
            if (track.getType() === 'video') {
                if (!cameraEnabled) {
                    track.mute()
                }
            } else if (track.getType() === 'audio') {
                if (!micEnabled) {
                    track.mute()
                }
            }
        })
    } catch (error) {
        console.error('[Jitsi] Failed to create local tracks:', error)
    }
}
```

---

## 🐛 Common Issues

### Issue 1: Video shows for a moment then disappears

**Nguyên nhân:** Z-index conflict với placeholder

**Giải pháp:** Đảm bảo video container có z-index cao hơn placeholder khi có video

### Issue 2: Remote video không hiển thị dù có track

**Nguyên nhân:** Container chưa ready khi attach

**Giải pháp:** Thêm setTimeout như trong code trên

### Issue 3: Video bị crop/stretched

**Nguyên nhân:** object-fit không đúng

**Giải pháp:**

```css
video {
    object-fit: cover; /* hoặc contain tùy nhu cầu */
}
```

---

## 🧪 Testing

1. Start dev server: `npm run dev`
2. Mở 2 browser tabs
3. Join cùng room với tên khác nhau
4. Kiểm tra:
    - ✅ Local video hiển thị (mirrored)
    - ✅ Remote video hiển thị ở tab kia
    - ✅ Toggle camera on/off hoạt động
    - ✅ Mute indicator hiện đúng

---

## 📚 Next Steps

Sau khi fix video:

1. ✅ Kiểm tra `5-sua-loi-device-permissions.md` để improve device access
2. ✅ Đọc `6-best-practices.md` để optimize performance
