<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# hãy tổng hợp các event lại thành bảng để dễ điều khiển với lắng nghe xử lý sự kiện hơn

[https://jitsi.github.io/lib-jitsi-meet/enums/JitsiConferenceEvents.JitsiConferenceEvents.html](https://jitsi.github.io/lib-jitsi-meet/enums/JitsiConferenceEvents.JitsiConferenceEvents.html)

Dưới đây là bảng tóm tắt các nhóm event quan trọng của JitsiConferenceEvents, tập trung vào việc điều khiển media và lắng nghe xử lý sự kiện trong app custom (tên event viết theo convention trong lib-jitsi-meet, mô tả rút gọn để dễ mapping code).[^1][^2]

## Nhóm media track (camera/mic/screen)

| Event (conference) | Ý nghĩa chính | Thường dùng để làm gì |
| :-- | :-- | :-- |
| TRACK_ADDED | Có track media mới (audio/video/screen) được thêm vào conference. [^1][^2] | Tạo/attach <video>/<audio>, add vào layout, phân biệt camera vs screen share. |
| TRACK_REMOVED | Track bị remove khỏi conference. [^1][^2] | Xoá tile video, tắt UI screen share khi người khác dừng share. |
| TRACK_MUTE_CHANGED | Trạng thái mute/unmute của một track thay đổi. [^1][^2] | Update icon mic/camera của participant, sync trạng thái local/remote. |
| AUDIO_LEVEL_CHANGED | Mức âm lượng (audio level) của một track thay đổi. [^1][^3] | Vẽ waveform, highlight người đang nói, hiển thị “đang nói” trên avatar. |
| VIDEO_CODEC_CHANGED | Codec video của local track đổi. [^1] | Debug chất lượng video, thống kê kỹ thuật. |

## Nhóm tham gia phòng (join/leave, role, permission)

| Event | Ý nghĩa chính | Thường dùng để làm gì |
| :-- | :-- | :-- |
| CONFERENCE_JOINED | Local participant đã join thành công. [^1][^2] | Sau khi join: add local tracks, bật UI điều khiển media. |
| CONFERENCE_LEFT | Local participant rời conference. [^1][^2] | Clean up UI, dispose track, điều hướng về màn hình ngoài. |
| USER_JOINED | Có participant mới join. [^1][^3] | Add tile user, init state mic/camera, hiển thị tên. |
| USER_LEFT | Participant rời. [^1][^3] | Remove tile, giải phóng resource. |
| USER_ROLE_CHANGED | Role (moderator, participant, v.v.) thay đổi. [^1][^4] | Bật/tắt chức năng “mute everyone”, “moderate AV” tuỳ role. |
| PERMISSIONS_CHANGED | Permission của local participant thay đổi. [^1][^5] | Cập nhật quyền bật mic/camera, share screen, hiển thị cảnh báo. |
| KICKED | Local bị kick khỏi conference. [^1][^4] | Hiện thông báo “bị kick” và thoát phòng. |

## Nhóm AV moderation / unmute permission

| Event | Ý nghĩa chính | Thường dùng để làm gì |
| :-- | :-- | :-- |
| AV_MODERATION_CHANGED | AV Moderation được bật/tắt (audio/video). [^1][^5] | Update UI: hiển thị “Moderator đang kiểm soát mic/camera”, khoá/bật nút. |
| AUDIO_UNMUTE_PERMISSIONS_CHANGED | Quyền được unmute audio của local thay đổi (vượt/sụt giới hạn số sender). [^1][^6] | Quyết định có cho user bật mic không; hiện thông báo khi bị chặn. |
| VIDEO_UNMUTE_PERMISSIONS_CHANGED | Tương tự cho video. [^1][^6] | Khoá/bật nút camera tương ứng. |
| LOCAL_AUDIO_UNMUTE_PERMITTED | Local được approve để unmute audio. [^1][^5] | Tự động bật lại nút mic, có thể hiện toast “Bạn được phép bật mic”. |
| LOCAL_AUDIO_UNMUTE_BLOCKED | Local bị block unmute audio. [^1][^5] | Hiển thị cảnh báo, disable toggle mic. |
| LOCAL_VIDEO_UNMUTE_PERMITTED | Local được approve video. [^1][^5] | Cho phép bật camera. |
| LOCAL_VIDEO_UNMUTE_BLOCKED | Local bị block video. [^1][^5] | Khoá nút camera, hiện lý do. |
| AV_MODERATION_APPROVED | Báo cáo user được approve unmute (AV moderation). [^1][^5] | Log/analytics, cập nhật badge “approved speaker”. |
| AV_MODERATION_REJECTED | Báo cáo user bị block unmute. [^1][^5] | Cho UX “request again”, hiển thị trạng thái bị từ chối. |

## Nhóm connection / ICE / bridge

| Event | Ý nghĩa chính | Thường dùng để làm gì |
| :-- | :-- | :-- |
| CONNECTION_ESTABLISHED | Kết nối conference đã thiết lập. [^1][^2] | Bắt đầu join, tạo conference object. |
| CONNECTION_INTERRUPTED | Kết nối bị gián đoạn (ICE). [^1][^2] | Hiện “Reconnecting…”, freeze video, tránh thao tác nhạy cảm. |
| CONNECTION_RESTORED | Kết nối khôi phục. [^1][^2] | Gỡ “Reconnecting…”, sync lại trạng thái media. |
| ENDPOINT_MESSAGE_RECEIVED / ENDPOINT_STATS_RECEIVED | Nhận thông điệp/stats qua bridge channel. [^1] | Custom signaling: mute request, emoji, side channel. |
| DATA_CHANNEL_OPENED / DATA_CHANNEL_CLOSED | Data channel tới bridge được mở/đóng. [^1][^2] | Bật/tắt các tính năng dựa trên data channel (reactions, chat custom). |
| JVB_REGION_CHANGED | Region của JVB thay đổi. [^1] | Thống kê, tối ưu route, hiển thị info mạng. |
| CONFERENCE_UNIQUE_ID_SET | Conference ID global được set. [^1] | Mapping với backend logging / analytics. |

## Nhóm chat, reaction, poll, file

| Event | Ý nghĩa chính | Thường dùng để làm gì |
| :-- | :-- | :-- |
| MESSAGE_RECEIVED | Chat message public. [^1][^3] | Hiển thị chat trong UI. |
| PRIVATE_MESSAGE_RECEIVED | Chat riêng. [^1][^3] | Hiển thị message private, popup notification. |
| REACTION_RECEIVED | Reaction (emoji, raise hand v.v.). [^1][^3] | Vẽ icon trên avatar/tile. |
| FILE_ADDED / FILE_REMOVED / FILE_LIST | Quản lý file trong conference. [^1] | Render danh sách tài liệu share trong phòng. |
| POLL_CREATED / POLL_ANSWERED | Sự kiện poll. [^1] | Hiển thị vote UI, update kết quả. |

## Nhóm lobby, room, subject, properties

| Event | Ý nghĩa chính | Thường dùng để làm gì |
| :-- | :-- | :-- |
| LOBBY_USER_JOINED / LOBBY_USER_LEFT / LOBBY_USER_UPDATED | User ra/vào/đổi trạng thái trong lobby. [^1][^4] | UI moderator để approve/deny vào phòng. |
| ROOM_LOCKED_CHANGED | Phòng bị khóa/mở. [^1][^4] | Hiển thị icon “locked”, chặn join mới nếu cần. |
| MEMBERS_ONLY_CHANGED | Bật/tắt chế độ members only. [^1][^4] | Điều chỉnh luồng join, hiển thị yêu cầu login/approval. |
| CONFERENCE_PROPERTIES_CHANGED | Properties (metadata) của conference đổi. [^1][^7] | Đồng bộ cấu hình runtime: theme, chế độ, flags custom. |
| SUBJECT_CHANGED | Subject/title của conference thay đổi. [^1] | Cập nhật tiêu đề phòng trong UI. |
| BREAKOUT_ROOMS_UPDATED | Thông tin breakout rooms thay đổi. [^1] | Update list room nhỏ, số người trong mỗi room. |
| BREAKOUT_ROOMS_MOVE_TO_ROOM | Được yêu cầu join một breakout room. [^1] | Auto chuyển hoặc popup cho user chọn. |

## Nhóm audio input / detection / recording

| Event | Ý nghĩa chính | Thường dùng để làm gì |
| :-- | :-- | :-- |
| NO_AUDIO_INPUT | Input current device không có tín hiệu. [^1][^8] | Hiển thị cảnh báo “Không thấy âm thanh từ mic”, gợi ý đổi device. |
| NOISY_MIC | Mic hiện tại bị ồn. [^1][^9] | Bật tooltip “Mic ồn”, khuyến nghị mute hoặc bật noise suppression. |
| AUDIO_INPUT_STATE_CHANGE | Trạng thái audio input đổi (có/không có input). [^1] | Đồng bộ với icon mic và thông báo lỗi. |
| TALK_WHILE_MUTED | Local đang nói nhưng đang mute. [^1] | Show toast “Bạn đang nói khi mic tắt?”, gợi ý bật mic. |
| RECORDING_STATE_CHANGED | Trạng thái recording (on/off/failed). [^1][^10] | Hiển thị badge “Recording”, cảnh báo privacy. |
| TRANSCRIPTION_STATUS_CHANGED | Trạng thái transcription. [^1] | Bật/tắt subtitle, hiện trạng thái STT. |

## Nhóm lỗi, status, metadata

| Event | Ý nghĩa chính | Thường dùng để làm gì |
| :-- | :-- | :-- |
| CONFERENCE_FAILED | Join conference thất bại. [^1][^11] | Hiển thị error, retry/jump sang trang khác. |
| CONFERENCE_ERROR | Lỗi trong quá trình conference. [^1][^11] | Log/telemetry, show message cho user. |
| STATISTICS_DISPOSED | Stats module sắp bị dispose (cơ hội cuối để gửi log). [^1][^7] | Flush analytics. |
| BOT_TYPE_CHANGED | Loại bot participant thay đổi. [^1] | Tuỳ chỉnh UI cho bot (recording bot, transcription bot…). |
| FEATURES_CHANGED | Features của participant thay đổi. [^1][^8] | Bật/tắt nút share screen, reaction… theo capability. |
| METADATA_UPDATED | Metadata conference cập nhật. [^1] | Sync state app-level (labels, tags, mode). |
| FIRST_PARTICIPANT_JOINED_TIMESTAMP | Timestamp UTC khi participant đầu tiên join. [^1] | Đo thời gian họp, analytics. |

Nếu muốn, có thể thêm một layer helper trong code: map mỗi event vào một “handler group” (media, permission, chat, v.v.) để việc đăng ký listener gọn hơn, ví dụ createConferenceEventHandlers(conference, { onMediaTrack, onPermissions, onChat, ... }) rồi bên trong subscribe đúng nhóm event tương ứng.[^2][^3]
<span style="display:none">[^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22]</span>

<div align="center">⁂</div>

[^1]: https://jitsi.github.io/lib-jitsi-meet/enums/JitsiConferenceEvents.JitsiConferenceEvents.html

[^2]: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-ljm-api/

[^3]: https://jitsi.support/developer/lib-jitsi-meet-events-api-guide/

[^4]: https://jitsi.guide/blog/how-to-make-moderator-jitsi-meet/

[^5]: https://github.com/jitsi/jitsi-meet/issues/9575

[^6]: https://fossies.org/linux/misc/jitsi-meet-stable-jitsi-meet_10655.tar.gz/jitsi-meet-stable-jitsi-meet_10655/react/features/base/conference/actions.any.ts

[^7]: https://github.com/jitsi/lib-jitsi-meet/blob/master/JitsiConferenceEvents.spec.ts

[^8]: https://gitlab.opencode.de/bmi/opendesk/component-code/realtimecommunication/nordeck/jitsi_meet/-/blob/6a62c5120f41f17e0f3841080738bbbd5f303609/react/features/noise-detection/middleware.ts

[^9]: https://jitsi.org/blog/enhanced-noise-suppression-in-jitsi-meet/

[^10]: https://docs.workadventu.re/admin/jitsi-moderation/

[^11]: https://stackoverflow.com/questions/61825710/failed-to-load-jitsi-meet-api-error-in-lib-jitsi-meet-during-initjitsiconferen

[^12]: https://jitsi.github.io/lib-jitsi-meet/

[^13]: https://github.com/jitsi/lib-jitsi-meet

[^14]: https://meet.jit.si

[^15]: https://stackoverflow.com/questions/61405333/how-to-restrict-user-to-turn-on-audio-and-video-in-jitsi-conference-call

[^16]: https://jitsi.org

[^17]: https://jitsi.org/api/

[^18]: https://github.com/jitsi/lib-jitsi-meet/issues/1170

[^19]: https://cdn.jsdelivr.net/npm/lib-jitsi-meet-cust/

[^20]: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/

[^21]: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe-commands/

[^22]: https://github.com/jitsi/lib-jitsi-meet?files=1

